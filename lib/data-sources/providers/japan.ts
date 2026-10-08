import type { TourismDataProvider } from "./types";

export const japanProvider: TourismDataProvider = {
  id: "japan",
  pages: [
    { sourceName: "Japan National Tourism Organization", url: "https://www.japan.travel/en/responsible-travel-guide/japanese-customs-and-etiquette/", region: "Japan", recordKind: "guidance", authorityLevel: 4, originalLanguage: "en" },
    { sourceName: "Japan Tourism Agency", url: "https://www.mlit.go.jp/kankocho/responsible-traveler/en.html", region: "Japan", recordKind: "guidance", authorityLevel: 5, originalLanguage: "en" },
    { sourceName: "Agency for Cultural Affairs", url: "https://www.bunka.go.jp/english/policy/cultural_properties/introduction/", region: "Japan", recordKind: "guidance", authorityLevel: 5, originalLanguage: "en" },
  ],
};
