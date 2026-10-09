# MICHI Asset Manifest

## Shipping photographs

These photographs are genuine place images sourced from Wikimedia Commons. MICHI does not claim endorsement or partnership with the creators or Wikimedia. Attribution is displayed alongside the image; crops are produced by responsive image rendering, while the downloaded source files remain intact.

| Local file | Depicted subject | Creator | Source | License | Treatment |
| --- | --- | --- | --- | --- | --- |
| `public/images/kyoto-gion.jpg` | Gion, Kyoto (Hanamikoji area as described by the source record) | Emran Kassim | [Wikimedia Commons file page](https://commons.wikimedia.org/wiki/File:Gion_Kyoto_Japan_(7891242404).jpg) | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | 1600px-wide Commons thumbnail; page crop only |
| `public/images/kanazawa-kenrokuen.jpg` | Kenrokuen Garden, Kanazawa | sergejf | [Wikimedia Commons file page](https://commons.wikimedia.org/wiki/File:Kanazawa,_Kenroku-en_gardens.jpg) | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | 1920px-wide Commons thumbnail; page crop only |
| `public/images/takayama-old-town.jpg` | Old town streets, Takayama | Raita Futo | [Wikimedia Commons file page](https://commons.wikimedia.org/wiki/File:Hida_Takayama_old_town_streets_(48519369712).jpg) | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | 1600px-wide Commons thumbnail; page crop only |

CC BY material may be shared and adapted with appropriate attribution, a license link, and an indication of changes. The visible credit should identify the creator, link the Commons source, link the license, state “cropped” only when a fixed crop is applied, and avoid implying creator endorsement. The responsive `object-fit` crop in the UI is documented as a presentation crop.

## Concept-only artwork

` .impeccable/mocks/decision/01-split-editorial.png`, `02-image-led-spread.png`, and `03-discovery-first.png` are generated concept comps, not photographs of real locations. The selected concept was rebuilt as `04-image-led-spread-verified.png` using the three attributed photographs above. Concept artwork stays under `.impeccable` and must never be used as destination, venue, operator, or experience photography in the application.

## Attribution implementation requirement

Every view that renders one of these photographs must provide an accessible credit link close to the image. If a card is reused on another route, its attribution must remain available there. Do not rely only on this manifest as the user-facing credit.
