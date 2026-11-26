import { useTranslation } from "react-i18next";
import { STRIP_SIZES, useStripSize, type StripSize } from "../stripSize.js";

/* Wie viel Plan auf einen Schirm passt. Eine Auswahlliste und keine
   Knopfleiste: vier Stufen wären vier Knöpfe in einer Kopfzeile, die schon
   Sprache, Schloss, Tagteiler, Hilfe und Einstellungen trägt.

   Die Stufennamen laufen nicht durch t() — XS bis XL sind die Streifenbreiten
   der Vorlage und in jeder Sprache dieselben Buchstaben. */
export function StripSizeSelect({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { stripSize, setStripSize } = useStripSize();

  return (
    <select
      className={`form-select form-select-sm w-auto ${className}`.trim()}
      aria-label={t("nav.stripSize")}
      title={t("nav.stripSize")}
      value={stripSize}
      onChange={(e) => setStripSize(e.target.value as StripSize)}
    >
      {STRIP_SIZES.map((size) => (
        <option key={size} value={size}>
          {size.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
