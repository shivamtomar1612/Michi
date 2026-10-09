export type DestinationPhoto = {
  src: string;
  width: number;
  height: number;
  alt: string;
  creator: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
};

const photos: Record<string, DestinationPhoto> = {
  kyoto: {
    src: "/images/kyoto-gion.jpg",
    width: 1600,
    height: 1067,
    alt: "A street in Gion, Kyoto, with traditional shopfronts and timber facades",
    creator: "Emran Kassim",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Gion_Kyoto_Japan_(7891242404).jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
  kanazawa: {
    src: "/images/kanazawa-kenrokuen.jpg",
    width: 1920,
    height: 1280,
    alt: "The stone lantern and pond in Kenrokuen Garden, Kanazawa",
    creator: "sergejf",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Kanazawa,_Kenroku-en_gardens.jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
  takayama: {
    src: "/images/takayama-old-town.jpg",
    width: 1600,
    height: 1067,
    alt: "Traditional wooden shopfronts along a street in Takayama's old town",
    creator: "Raita Futo",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Hida_Takayama_old_town_streets_(48519369712).jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
  },
};

export function getDestinationPhoto(slug: string): DestinationPhoto | null {
  return photos[slug] ?? null;
}
