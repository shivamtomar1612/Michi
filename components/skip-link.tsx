"use client";

import { useTranslations } from "next-intl";

export function SkipLink() {
  const t = useTranslations("Accessibility");
  return <a className="skip-link focus:translate-y-0" href="#main-content">{t("skipToContent")}</a>;
}
