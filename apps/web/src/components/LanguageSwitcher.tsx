import { useTranslation } from "react-i18next";

// Single source of truth for the offered locales — adding one means adding it
// here and to the i18n resources, nowhere else.
export const LANGUAGES = [
  { code: "de", label: "DE" },
  { code: "en", label: "EN" },
];

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
      {LANGUAGES.map((language) => (
        <option key={language.code} value={language.code}>
          {language.label}
        </option>
      ))}
    </select>
  );
}
