import type {
  RecommendationCandidate,
  RecommendationComponentScores,
  RecommendationPreferences,
  RecommendationSlot,
  ScoredRecommendation,
} from "./types";

const weights: Record<keyof RecommendationComponentScores, number> = {
  personalMatch: 0.25,
  culturalDepth: 0.2,
  localBenefit: 0.15,
  accessibilityMatch: 0.1,
  availability: 0.1,
  destinationHealth: 0.2,
};

const normalize = (values: string[]) => [...new Set(values.map((value) => value.trim().toLocaleLowerCase()).filter(Boolean))];

function coverage(requested: string[], provided: string[]): number {
  const needs = normalize(requested);
  if (!needs.length) return 100;
  const available = new Set(normalize(provided));
  return Math.round((needs.filter((need) => available.has(need)).length / needs.length) * 100);
}

function dateOf(timestamp: string): string | null {
  const timestampMs = Date.parse(timestamp);
  return Number.isFinite(timestampMs) ? new Date(timestampMs + 9 * 60 * 60 * 1000).toISOString().slice(0, 10) : null;
}

function slotsInDateRange(slots: RecommendationSlot[], preferences: RecommendationPreferences): RecommendationSlot[] {
  return slots.filter((slot) => {
    const date = dateOf(slot.startsAt);
    return date !== null && date >= preferences.startDate && date <= preferences.endDate;
  });
}

function availabilityScore(slots: RecommendationSlot[]): number {
  const totalCapacity = slots.reduce((total, slot) => total + slot.capacity, 0);
  if (totalCapacity <= 0) return 0;
  const remaining = slots.reduce((total, slot) => {
    if (slot.status !== "open") return total;
    return total + Math.max(0, slot.capacity - slot.bookedCount);
  }, 0);
  return Math.round((remaining / totalCapacity) * 100);
}

function paceMatch(pace: RecommendationPreferences["pace"], duration: number): number {
  const ranges = {
    relaxed: [60, 180],
    balanced: [45, 240],
    active: [120, 360],
  } as const;
  const [minimum, maximum] = ranges[pace];
  const outsideMinutes = duration < minimum ? minimum - duration : duration > maximum ? duration - maximum : 0;
  return Math.max(0, 100 - Math.round((outsideMinutes / 3) * 10) / 10);
}

function accessibilityMatch(preferences: Record<string, boolean>, candidate: Record<string, unknown>): number {
  const requirements = Object.entries(preferences).filter(([, required]) => required).map(([key]) => key);
  if (!requirements.length) return 100;
  const confirmed = requirements.filter((key) => candidate[key] === true).length;
  return Math.round((confirmed / requirements.length) * 100);
}

function calculatePersonalMatch(preferences: RecommendationPreferences, candidate: RecommendationCandidate, crowdPressure: number | null): number {
  const dimensions = [
    coverage(preferences.interests, candidate.interests),
    coverage(preferences.dietaryPreferences, candidate.dietaryOptions),
    coverage(preferences.languages, candidate.languages),
    paceMatch(preferences.pace, candidate.durationMinutes),
  ];
  if (crowdPressure !== null) dimensions.push(Math.max(0, 100 - Math.max(0, crowdPressure - preferences.crowdTolerance)));
  return Math.round(dimensions.reduce((total, value) => total + value, 0) / dimensions.length);
}

function reasonsFor(preferences: RecommendationPreferences, candidate: RecommendationCandidate, scores: RecommendationComponentScores): string[] {
  const reasons: string[] = [];
  const matchedInterests = normalize(preferences.interests).filter((interest) => normalize(candidate.interests).includes(interest));
  for (const interest of matchedInterests.slice(0, 3)) reasons.push(`${interest[0].toLocaleUpperCase()}${interest.slice(1)} interest`);
  if (scores.availability > 0) reasons.push("Host capacity available for your dates");
  if (scores.destinationHealth !== null && scores.destinationHealth > 0 && candidate.destinationHealth.componentScores?.crowdPressure !== undefined
    && candidate.destinationHealth.componentScores.crowdPressure <= preferences.crowdTolerance) reasons.push("Visitor pressure is within your selected tolerance");
  if (scores.localBenefit > 0) reasons.push("Host-led experience supports its host; this is not an earnings estimate");
  const matchedLanguages = normalize(preferences.languages).filter((language) => normalize(candidate.languages).includes(language));
  if (matchedLanguages.length) reasons.push(`${matchedLanguages[0][0].toLocaleUpperCase()}${matchedLanguages[0].slice(1)} listed by the host`);
  if (candidate.culturalContext.trim()) reasons.push("The host has provided cultural context");
  return reasons;
}

function tradeoffsFor(preferences: RecommendationPreferences, candidate: RecommendationCandidate, scores: RecommendationComponentScores, dateSlots: RecommendationSlot[]): string[] {
  const tradeoffs: string[] = [];
  if (preferences.budgetJpy !== null && candidate.priceJpy >= preferences.budgetJpy * 0.8) tradeoffs.push("Price is close to your budget limit.");
  if (scores.availability === 0) tradeoffs.push("No available slots are listed for your dates.");
  else if (dateSlots.some((slot) => slot.status !== "open" || slot.bookedCount >= slot.capacity)) tradeoffs.push("Some requested date slots are full or unavailable.");
  if (preferences.languages.length && coverage(preferences.languages, candidate.languages) < 100) tradeoffs.push("Some requested languages are not listed by the host.");
  if (preferences.accessibility && Object.values(preferences.accessibility).some(Boolean) && scores.accessibilityMatch < 100) tradeoffs.push("Some requested accessibility details are not confirmed by the host.");
  if (candidate.destinationHealth.componentScores?.crowdPressure !== undefined
    && candidate.destinationHealth.componentScores.crowdPressure > preferences.crowdTolerance) tradeoffs.push("Visitor pressure is above your selected crowd tolerance.");
  if (!candidate.culturalContext.trim()) tradeoffs.push("Host-provided cultural context is not available for this experience.");
  if (candidate.destinationHealth.score === null) tradeoffs.push("A current, complete Destination Health score is unavailable; no low-pressure claim is made.");
  if (paceMatch(preferences.pace, candidate.durationMinutes) < 100) tradeoffs.push("The experience duration is outside your preferred pace range.");
  return tradeoffs;
}

function isEligible(candidate: RecommendationCandidate, preferences: RecommendationPreferences): boolean {
  if (candidate.status !== "published" || !candidate.isVerified || candidate.isPaused) return false;
  if (!Number.isFinite(candidate.priceJpy) || candidate.priceJpy < 0 || !Number.isFinite(candidate.durationMinutes) || candidate.durationMinutes <= 0) return false;
  if (preferences.budgetJpy !== null && candidate.priceJpy > preferences.budgetJpy) return false;
  if (preferences.regions.length && !normalize(preferences.regions).includes(candidate.region.trim().toLocaleLowerCase())) return false;
  return Object.entries(preferences.accessibility).every(([key, required]) => !required || candidate.accessibility[key] === true);
}

export function rankRecommendations(preferences: RecommendationPreferences, candidates: RecommendationCandidate[]): ScoredRecommendation[] {
  return candidates.flatMap((candidate) => {
    if (!isEligible(candidate, preferences)) return [];
    const dateSlots = slotsInDateRange(candidate.slots, preferences);
    if (!dateSlots.some((slot) => slot.status === "open" && slot.bookedCount < slot.capacity)) return [];
    const availability = availabilityScore(dateSlots);
    const health = candidate.destinationHealth;
    const hasHealth = health.score !== null && health.componentScores !== null && health.simulationStatus !== "simulated";
    const componentScores: RecommendationComponentScores = {
      personalMatch: calculatePersonalMatch(preferences, candidate, hasHealth ? health.componentScores!.crowdPressure : null),
      culturalDepth: candidate.culturalContext.trim()
        ? 50 + Math.round(coverage(preferences.culturalInterests, candidate.interests) / 2)
        : 0,
      localBenefit: 100,
      accessibilityMatch: accessibilityMatch(preferences.accessibility, candidate.accessibility),
      availability,
      destinationHealth: hasHealth ? health.score! : null,
    };
    const knownKeys = (Object.keys(weights) as Array<keyof RecommendationComponentScores>)
      .filter((key) => key !== "destinationHealth" || hasHealth);
    const weightPresent = knownKeys.reduce((sum, key) => sum + weights[key], 0);
    const rawScore = knownKeys.reduce((sum, key) => sum + (componentScores[key] ?? 0) * weights[key], 0) / weightPresent;
    const score = Math.round(rawScore * 10) / 10;
    return [{
      ...candidate,
      score,
      evidenceCompleteness: Math.round(weightPresent * 100),
      recommendationConfidence: hasHealth ? "complete" as const : "partial" as const,
      componentScores,
      reasons: reasonsFor(preferences, candidate, componentScores),
      tradeoffs: tradeoffsFor(preferences, candidate, componentScores, dateSlots),
      healthProvenance: health.dataProvenance.map(({ component, sourceName, sourceUrl, verifiedAt, observedAt }) => ({ component, sourceName, sourceUrl, verifiedAt, observedAt })),
    }];
  }).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}
