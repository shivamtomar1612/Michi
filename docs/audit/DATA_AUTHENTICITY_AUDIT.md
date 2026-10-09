# MICHI Data Authenticity and Provenance Audi

Audit date: 2026-10-09
Supabase project: `sjfcwmaceduwdhpdccyh`

## Conclusion

The live destination and place catalog records inspected are classified as official-tourism sourced and carry source URLs, authority, verification status, and review timestamps. Three external experience listings are linked to real operators and are not MICHI-bookable. This supports the authenticity of those inspected catalog facts; it does **not** justify saying every sentence, image, operational signal, or item displayed across the entire website is official-source data.

The only intentional simulated/illustrative product content found in the reviewed experience is one Cultural Passport demo achievement. The UI labels it as illustrative, not earned, not counted, and not stored. No simulated destination health or crowd signals are present in Supabase. There are no live destination health signals at all.

## Live inventory

| Table | Rows | Interpretation |
|---|---:|---|
| `profiles` | 1 | One traveler; corresponds to an Auth user |
| `destinations` | 3 | Kyoto, Kanazawa, Takayama; official tourism provenance |
| `places` | 15 | Official tourism sourced; images withheld where licensing/use status is not approved |
| `external_experiences` | 3 | Genuine external Kanazawa activities; official operator provenance; no MICHI booking |
| `experiences` | 0 | No MICHI-operated/verified host experiences |
| `experience_slots` | 0 | No genuine MICHI availability |
| `bookings` | 0 | No bookings |
| `destination_health_signals` | 0 | No current evidence inputs for a verified destination health score |
| `cultural_sources` | 6 | Approved source registry records |
| `cultural_content` | 5 | Active official-verified cultural summaries |
| `community_feedback` | 0 | No community sentiment evidence |
| `analytics_events` | 28 | Events exist; not interpreted as tourism outcome evidence |
| `recommendation_logs` | 0 | No persisted recommendation selections |

Authentication integrity: one Auth user and one matching profile; no orphan auth users or profiles were found. No fabricated users, hosts, slots, sentiment, crowd observations, or health scores were created.

## Catalog source review

Destinations:

- Kyoto — [Kyoto Travel](https://kyoto.travel/en/areas)
- Kanazawa — [VISIT KANAZAWA Thoughtful Travel Guide](https://visitkanazawa.jp/en/traveler/)
- Takayama — [Hida Takayama Official Tourism Guide](https://www.hidatakayama.or.jp/spot/detail_1101.html)

The 15 place records use official destination/venue pages, including [Kyoto Central](https://kyoto.travel/en/areas/central/), [VISIT KANAZAWA's Kanazawa Castle Park and Gyokusen-inmaru page](https://visitkanazawa.jp/en/feature/detail_537.html), and [Hida Takayama Old Town](https://www.hidatakayama.or.jp/spot/detail_1101.html). Current URLs and provenance fields were checked in the hosted database. Some Kyoto pages did not open in the live browser fetch during this audit, so those records were checked for stored provenance and source consistency, not all re-fetched in this pass.

External listings:

- Gold Leaf Pasting Experience — [Kanazawa Katani operator](https://www.k-katani.com/experience); source lists a starting price and approximate duration. Current availability is not integrated.
- Kutani Ware Etsuke Drawing — [Kutani Kosen operator](https://kutanikosen.com/en/experience.html); current operator price is ¥2,200–¥7,700. [VISIT KANAZAWA's listing](https://visitkanazawa.jp/en/activities/detail_771.html) shows a different range (¥1,650–¥5,500). The database follows the operator's direct page for its own price. This discrepancy is a known source conflict and travelers should confirm details with the operator.
- Kutani Ware Potter's Wheel — [Kutani Kosen operator](https://kutanikosen.com/en/experience2.html); listed price is ¥5,500/person, with additional artwork/shipping costs described by the operator.

All three external listings remain external/information-only. The site does not claim those operators are MICHI partners or present MICHI availability.

## Access and verification limits

`npm run data:validate-sources` passed: 14 approved domains, 49 reviewed URLs, exact-host HTTPS checks. This validates configured URL/domain constraints; it does not prove that every source's terms or robots file were reviewed. Registry state shows JNTO's root robots entry as checked; most other active domains say `not_checked_by_runtime`. No uncontrolled crawling was performed. The registry itself says to confirm access terms before automated refresh. Do not claim universal robots/terms approval.

The seed source registry includes approved national and local authorities. Some Ishikawa and Gifu source entries are intentionally inactive placeholders. The provider allowlist is not blanket permission to crawl a domain.

## Verified versus unavailable

- **Verified official content:** destination/place facts backed by stored official source provenance; cultural summaries reference Agency for Cultural Affairs, JNTO, VISIT KANAZAWA, Kyoto Travel, or Japan Tourism Agency.
- **External operator information:** three activities with direct operator sources; no MICHI booking or capacity.
- **Unavailable:** current crowd pressure, remaining capacity, community readiness, transport accessibility input, seasonal suitability evidence, and therefore complete current destination health scores.
- **Unavailable:** MICHI hosts, MICHI slots, bookings, and observed community benefit.
- **Demo:** exactly one passport illustration, labeled as demo and excluded from account metrics.

## Provenance correction applied

The Kanazawa Castle Park and Gyokusen-inmaru place previously pointed to the general listing index. A guarded additive migration changed its `official_url`, `source_url`, and `canonical_source_url` to the specific [VISIT KANAZAWA page](https://visitkanazawa.jp/en/feature/detail_537.html), with retrieval/review timestamps. The connected database query confirmed the current values. The remote migration history records `20261008201013 phase14_4_exact_catalogue_provenance`; the local migration file uses the same version.
