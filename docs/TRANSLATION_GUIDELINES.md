# MICHI translation guidelines

- Write Japanese for natural contemporary travel-product use; avoid literal word-for-word translation and machine-translated cultural claims.
- Keep the MICHI tone calm, respectful, concise, and non-promotional. Preserve the product principle: travel responsibly while respecting community consent and destination capacity.
- Use Japanese punctuation and natural line breaks. The Japanese locale applies strict line-breaking behavior and a CJK-friendly system font fallback.
- Keep `MICHI`, official organization names, venue names, source titles, and URLs unchanged unless an official Japanese name is available in verified source metadata.
- Translate interaction labels, validation messages, dates, times, counts, and money. Use `Intl` formatters from `i18n/formatters.ts`, with yen values formatted as JPY and itinerary times shown in Japan time.
- Never silently translate or rewrite official cultural guidance, host rules, photography restrictions, accessibility evidence, allergy information, or other safety-sensitive source material. Show the source language and a reviewed translation as separate, attributable content when one exists.
- Do not translate an unknown state into a positive claim. Keep `unavailable`, `not verified`, `stale`, `simulated`, and `not integrated` distinct in both languages.
- Keep interpolation placeholders consistent across message catalogs. Do not concatenate fragments where grammar changes by locale; use complete messages with ICU placeholders.
- Japanese copy and terminology require review by a fluent Japanese speaker familiar with tourism and cultural context before public release.
