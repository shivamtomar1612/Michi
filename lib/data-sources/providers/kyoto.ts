import type { TourismDataProvider } from "./types";

export const kyotoProvider: TourismDataProvider = {
  id: "kyoto",
  pages: [
    { sourceName: "Kyoto Travel", url: "https://kyoto.travel/en/areas", region: "Kyoto", recordKind: "destination", authorityLevel: 4, originalLanguage: "en" },
    { sourceName: "Kyoto Travel", url: "https://kyoto.travel/en/areas/central/", region: "Kyoto", recordKind: "place", authorityLevel: 4, originalLanguage: "en" },
    { sourceName: "Kyoto Travel", url: "https://kyoto.travel/en/areas/saga-arashiyama/", region: "Kyoto", recordKind: "place", authorityLevel: 4, originalLanguage: "en" },
    { sourceName: "Kyoto Travel", url: "https://kyoto.travel/en/areas/nishikyo/", region: "Kyoto", recordKind: "place", authorityLevel: 4, originalLanguage: "en" },
    { sourceName: "Kyoto Travel", url: "https://kyoto.travel/en/responsible-travel/", region: "Kyoto", recordKind: "guidance", authorityLevel: 4, originalLanguage: "en" },
  ],
};
