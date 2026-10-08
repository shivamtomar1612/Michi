import type { TourismDataProvider } from "./types";

export const kanazawaProvider: TourismDataProvider = {
  id: "kanazawa",
  pages: [
    { sourceName: "VISIT KANAZAWA", url: "https://visitkanazawa.jp/en/traveler/", region: "Kanazawa", recordKind: "destination", authorityLevel: 4, originalLanguage: "en" },
    { sourceName: "VISIT KANAZAWA", url: "https://visitkanazawa.jp/en/attractions/detail_10106.html", region: "Kanazawa", recordKind: "place", authorityLevel: 4, originalLanguage: "en" },
    { sourceName: "VISIT KANAZAWA", url: "https://visitkanazawa.jp/en/attractions/detail_10212.html", region: "Kanazawa", recordKind: "place", authorityLevel: 4, originalLanguage: "en" },
    { sourceName: "Kutani Ware Kutani Kosen Kiln", url: "https://kutanikosen.com/en/experience.html", region: "Kanazawa", recordKind: "experience", authorityLevel: 3, originalLanguage: "en" },
    { sourceName: "Kutani Ware Kutani Kosen Kiln", url: "https://kutanikosen.com/en/experience2.html", region: "Kanazawa", recordKind: "experience", authorityLevel: 3, originalLanguage: "en" },
    { sourceName: "Kanazawa Katani", url: "https://www.k-katani.com/experience", region: "Kanazawa", recordKind: "experience", authorityLevel: 3, originalLanguage: "ja" },
  ],
};
