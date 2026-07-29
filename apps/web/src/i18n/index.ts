import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Placeholder resources until the DB-backed /api/translations endpoint
// (Phase 5) replaces this with editable, redeploy-free translations.
const resources = {
  de: {
    translation: {
      "project.list.title": "Projekte",
      "project.list.empty": "Noch keine Projekte angelegt.",
      "project.create.namePlaceholder": "Projektname",
      "project.create.submit": "Projekt anlegen",
    },
  },
  en: {
    translation: {
      "project.list.title": "Projects",
      "project.list.empty": "No projects yet.",
      "project.create.namePlaceholder": "Project name",
      "project.create.submit": "Create project",
    },
  },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: "de",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
