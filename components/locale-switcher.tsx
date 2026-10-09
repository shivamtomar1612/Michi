"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/routing";

const supportedLocales: Locale[] = ["en", "ja"];

function hasUnsavedFormValues() {
  return Array.from(document.forms).some((form) => Array.from(form.elements).some((element) => {
    if (element instanceof HTMLInputElement) {
      if (element.type === "checkbox" || element.type === "radio") return element.checked !== element.defaultChecked;
      return element.value !== element.defaultValue;
    }
    if (element instanceof HTMLTextAreaElement) return element.value !== element.defaultValue;
    if (element instanceof HTMLSelectElement) return Array.from(element.options).some((option) => option.selected !== option.defaultSelected);
    return false;
  }));
}

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const t = useTranslations("Navigation");
  const accessibility = useTranslations("Accessibility");

  function changeLocale(nextLocale: Locale) {
    if (nextLocale === locale) return;
    if (hasUnsavedFormValues() && !window.confirm(accessibility("unsavedChangesConfirm"))) return;

    const current = new URL(window.location.href);
    const segments = current.pathname.split("/").filter(Boolean);
    if (supportedLocales.includes(segments[0] as Locale)) segments[0] = nextLocale;
    else segments.unshift(nextLocale);
    router.replace(`/${segments.join("/")}${current.search}${current.hash}`, { scroll: false });
  }

  return <label className="inline-flex min-h-10 items-center gap-2 border border-ink/15 px-2 text-xs font-medium text-ink/80 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-vermilion">
    <span className="sr-only">{t("language")}</span>
    <select aria-label={t("language")} value={locale} onChange={(event) => changeLocale(event.target.value as Locale)} className="min-h-9 bg-transparent outline-none">
      <option value="en">English</option>
      <option value="ja">日本語</option>
    </select>
  </label>;
}
