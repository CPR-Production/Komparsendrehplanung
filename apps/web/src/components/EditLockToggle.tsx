import { useTranslation } from "react-i18next";
import { useEditLock } from "../editLock.js";

/* Drawn, not set as a glyph: 🔒 and 🔓 arrive as colour emoji in most browsers
   and would shout next to the ⚙ and ? beside them. The two states differ by one
   stroke — the shackle's right leg — which is what a padlock does when it opens. */
function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d={locked ? "M4.75 7.25V4.5a3.25 3.25 0 0 1 6.5 0v2.75" : "M4.75 7.25V4.5a3.25 3.25 0 0 1 6.5 0"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect x="2.5" y="7.25" width="11" height="7.25" rx="1.5" fill="currentColor" />
    </svg>
  );
}

export function EditLockToggle({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { locked, toggleLocked } = useEditLock();
  // Names the action, not the state: the button is the way out of the state its
  // icon already shows. That also rules out aria-pressed — a toggle that
  // renames itself and reports a pressed state at once says two things at once.
  const label = locked ? t("nav.editing.unlock") : t("nav.editing.lock");

  return (
    <button
      type="button"
      /* Filled while writable, quiet while locked: the loud half of the pair is
         the one where a keystroke reaches the database. */
      className={`btn btn-sm d-inline-flex align-items-center ${
        locked ? "btn-outline-secondary" : "btn-warning"
      } ${className}`.trim()}
      title={label}
      aria-label={label}
      onClick={toggleLocked}
    >
      <LockIcon locked={locked} />
    </button>
  );
}
