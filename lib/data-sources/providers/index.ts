import { isAllowedSourceUrl } from "../registry";
import { japanProvider } from "./japan";
import { kanazawaProvider } from "./kanazawa";
import { kyotoProvider } from "./kyoto";
import { takayamaProvider } from "./takayama";

export const tourismProviders = [japanProvider, kyotoProvider, kanazawaProvider, takayamaProvider] as const;

export function validateProviderPages(): string[] {
  return tourismProviders.flatMap((provider) => provider.pages
    .filter((page) => !isAllowedSourceUrl(page.url))
    .map((page) => `${provider.id}: ${page.url} is not allowlisted`));
}
