export interface ReviewedSourcePage {
  sourceName: string;
  url: string;
  region: "Kyoto" | "Kanazawa" | "Takayama" | "Japan";
  recordKind: "destination" | "place" | "experience" | "guidance";
  authorityLevel: 3 | 4 | 5;
  originalLanguage: "en" | "ja";
}

export interface TourismDataProvider {
  id: "japan" | "kyoto" | "kanazawa" | "takayama";
  pages: readonly ReviewedSourcePage[];
}
