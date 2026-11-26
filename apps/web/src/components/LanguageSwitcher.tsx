import { useTranslation } from "react-i18next";
import { LOCALES } from "../i18n/index.js";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { i18n, t } = useTranslation();

  return (
    <select
      className={`form-select form-select-sm w-auto ${className}`.trim()}
      aria-label={t("nav.language")}
      title={t("nav.language")}
      // resolvedLanguage, not language: a regional tag like "de-DE" would not
      // match any <option> value and would leave the select blank.
      value={i18n.resolvedLanguage ?? i18n.language}
      onChange={(e) => void i18n.changeLanguage(e.target.value)}
    >
      {/* LOCALES lives next to the strings, not here: a language in this list
          without a column in that one would be a language without words. */}
      {LOCALES.map((locale) => (
        <option key={locale.code} value={locale.code}>
          {locale.label}
        </option>
      ))}
    </select>
  );
}
