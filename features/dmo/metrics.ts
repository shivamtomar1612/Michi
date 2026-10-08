export type MetricValue = {
  value: number | null;
  state: "available" | "suppressed" | "insufficient_data" | "unavailable";
};

export type CommunityMetric = {
  state: "available" | "insufficient_data" | "unavailable";
  positive: number | null;
  positiveState: "available" | "insufficient_data";
  neutral: number | null;
  neutralState: "available" | "insufficient_data";
  negative: number | null;
  negativeState: "available" | "insufficient_data";
  averagePressure: number | null;
  pressureState: "available" | "insufficient_data";
};

export type DmoMetrics = {
  destinationId: string;
  month: string;
  minimumCohort: number;
  metrics: {
    destinationViewSessions: MetricValue;
    experienceViewSessions: MetricValue;
    recommendationSessions: MetricValue;
    alternativeConsiderationSessions: MetricValue;
    itineraryGenerationSessions: MetricValue;
    culturalLearningSessions: MetricValue;
    reflectionSubmissionSessions: MetricValue;
    reflectionTravelers: MetricValue;
    confirmedBookingCount: MetricValue;
    recordedBookingValueJpy: MetricValue;
    activeVerifiedExperiences: MetricValue;
    activeHostCohort: MetricValue;
    remainingSlotCapacity: MetricValue;
    slotUtilizationPercent: MetricValue;
    communityFeedback: CommunityMetric;
    hostObservations: CommunityMetric;
    passportAchievementTravelers: MetricValue;
  };
  limitations: string[];
};

export function isSuppressed(metric: MetricValue | CommunityMetric): boolean {
  return metric.state === "suppressed" || metric.state === "insufficient_data";
}

export function metricDelta(current: MetricValue, previous: MetricValue): number | null {
  if (current.state !== "available" || previous.state !== "available"
    || current.value === null || previous.value === null) return null;
  return current.value - previous.value;
}

export function monthStart(value: string | undefined, now = new Date()): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    const candidate = new Date(Date.UTC(year!, month! - 1, 1));
    const latest = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const earliest = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 24, 1));
    if (candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month! - 1
      && candidate >= earliest && candidate <= latest) return `${value}-01`;
  }
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function previousMonthStart(month: string, now = new Date()): string | null {
  if (!/^\d{4}-\d{2}-01$/.test(month)) return null;
  const date = new Date(`${month}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return null;
  date.setUTCMonth(date.getUTCMonth() - 1);
  const earliest = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 24, 1));
  if (date < earliest) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
