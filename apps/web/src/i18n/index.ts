import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Placeholder resources until the DB-backed /api/translations endpoint
// (Phase 5) replaces this with editable, redeploy-free translations.
// Covers the app chrome (nav, project list, settings headings) only — the
// schedule grid itself still carries hardcoded German labels.
const resources = {
  de: {
    translation: {
      "nav.language": "Sprache",
      "nav.addSet": "+ Set",
      "nav.settings": "Einstellungen",
      "nav.backToSchedule": "Zurück zum Drehplan",
      "project.list.title": "Projekte",
      "project.list.empty": "Noch keine Projekte angelegt.",
      "project.list.loading": "Lädt…",
      "project.list.error": "Projekte konnten nicht geladen werden.",
      "project.list.created": "Angelegt am {{date}}",
      "project.create.namePlaceholder": "Projektname",
      "project.create.submit": "Projekt anlegen",
      "settings.title": "Einstellungen",
      "settings.categories": "Kategorien",
    },
  },
  en: {
    translation: {
      "nav.language": "Language",
      "nav.addSet": "+ Set",
      "nav.settings": "Settings",
      "nav.backToSchedule": "Back to schedule",
      "project.list.title": "Projects",
      "project.list.empty": "No projects yet.",
      "project.list.loading": "Loading…",
      "project.list.error": "Could not load projects.",
      "project.list.created": "Created {{date}}",
      "project.create.namePlaceholder": "Project name",
      "project.create.submit": "Create project",
      "settings.title": "Settings",
      "settings.categories": "Categories",
    },
  },
};

const STORAGE_KEY = "komparsen.language";

// Validated against `resources` rather than trusted: a stale or hand-edited
// value would otherwise leave the switcher showing a blank selection.
function storedLanguage(): string | undefined {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value && value in resources ? value : undefined;
  } catch {
    // Storage can throw outright when blocked (private mode, strict settings).
    return undefined;
  }
}

void i18n.use(initReactI18next).init({
  resources,
  lng: storedLanguage() ?? "de",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// Without this the choice only survives in-app navigation and a plain reload
// would drop the user back to German.
i18n.on("languageChanged", (language) => {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not worth breaking the switcher over — the language still applies here.
  }
});

export default i18n;
