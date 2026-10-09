import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";

function sortedKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => sortedKeys(child, prefix ? `${prefix}.${key}` : key)).sort();
}

describe("English and Japanese message catalogs", () => {
  it("have matching key sets so a locale cannot silently fall back", () => {
    expect(sortedKeys(ja)).toEqual(sortedKeys(en));
  });

  it("provide accessible language and skip-navigation labels", () => {
    expect(en.Accessibility.skipToContent).toBeTruthy();
    expect(ja.Accessibility.skipToContent).toBeTruthy();
    expect(en.Navigation.language).toBeTruthy();
    expect(ja.Navigation.language).toBeTruthy();
  });
});
