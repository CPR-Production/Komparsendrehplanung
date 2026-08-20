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
      "settings.group.name": "Gruppenname",
      "settings.group.delete": "Gruppe löschen",
      "settings.group.newPlaceholder": "Neue Kategorie-Gruppe (z. B. Drivers)",
      "settings.group.add": "+ Gruppe",
      "settings.group.confirmDelete":
        "Gruppe „{{name}}“ mit allen ihren Kategorien löschen? Die dafür im Drehplan eingetragenen Zahlen gehen mit verloren.",
      "settings.category.name": "Kategoriename",
      "settings.category.delete": "Kategorie löschen",
      "settings.category.newPlaceholder": "Neue Kategorie",
      "settings.category.add": "+ Kategorie",
      "settings.category.confirmDelete":
        "Kategorie „{{name}}“ löschen? Die dafür im Drehplan eingetragenen Zahlen gehen mit verloren.",
      "settings.category.empty": "Noch keine Kategorien in dieser Gruppe.",
      "nav.backToProjects": "Zurück zu den Projekten",
      "nav.help": "Hilfe & Feedback",
      "update.available": "Version {{version}} ist verfügbar (installiert: {{current}}).",
      "update.action": "Update ansehen",
      "update.dismiss": "Später",
      "update.start": "Jetzt installieren",
      "update.retry": "Erneut versuchen",
      "update.phase.downloading": "Lädt herunter…",
      "update.phase.verifying": "Prüft die Datei…",
      "update.phase.installing": "Installiert…",
      "update.phase.restarting": "Startet neu…",
      "update.failed": "Update fehlgeschlagen: {{error}}",
      "update.failedUnknown": "unbekannter Fehler",
      "update.hintContainer": "Im Docker-Betrieb: docker compose up -d --build",
      "help.title": "Hilfe & Feedback",
      "help.intro":
        "Feedback läuft über die Issues des Projekts auf GitHub. Das Formular bereitet die Meldung vor und öffnet sie auf GitHub — abgeschickt wird sie erst dort von dir, unter deinem eigenen Konto.",
      "help.noRepo":
        "Für diese Installation ist kein GitHub-Repository hinterlegt. Ohne die Einstellung GITHUB_REPO gibt es kein Ziel für Meldungen.",
      "help.kindLabel": "Art der Meldung",
      "help.kind.bug": "Fehler",
      "help.kind.idea": "Idee oder Wunsch",
      "help.kind.question": "Frage",
      "help.titleLabel": "Titel",
      "help.titlePlaceholder": "Kurz in einem Satz",
      "help.descriptionLabel": "Beschreibung",
      "help.descriptionPlaceholder":
        "Was hast du gemacht, was ist passiert, was hättest du erwartet?",
      "help.attachedLabel": "Wird mit angehängt",
      "help.attachedHint":
        "Ein GitHub-Issue ist öffentlich sichtbar. Auf GitHub kannst du alles noch ändern, bevor du absendest.",
      "help.submit": "Auf GitHub melden",
      "help.submitHint": "Öffnet GitHub mit vorausgefülltem Formular.",
      "help.browseIssues": "Bereits gemeldete Punkte ansehen",
      "help.version": "Installierte Version: {{version}}",
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
      "settings.group.name": "Group name",
      "settings.group.delete": "Delete group",
      "settings.group.newPlaceholder": "New category group (e.g. Drivers)",
      "settings.group.add": "+ Group",
      "settings.group.confirmDelete":
        "Delete group “{{name}}” and all its categories? The numbers entered for them in the schedule will go with it.",
      "settings.category.name": "Category name",
      "settings.category.delete": "Delete category",
      "settings.category.newPlaceholder": "New category",
      "settings.category.add": "+ Category",
      "settings.category.confirmDelete":
        "Delete category “{{name}}”? The numbers entered for it in the schedule will go with it.",
      "settings.category.empty": "No categories in this group yet.",
      "nav.backToProjects": "Back to projects",
      "nav.help": "Help & feedback",
      "update.available": "Version {{version}} is available (installed: {{current}}).",
      "update.action": "View update",
      "update.dismiss": "Later",
      "update.start": "Install now",
      "update.retry": "Try again",
      "update.phase.downloading": "Downloading…",
      "update.phase.verifying": "Verifying the file…",
      "update.phase.installing": "Installing…",
      "update.phase.restarting": "Restarting…",
      "update.failed": "Update failed: {{error}}",
      "update.failedUnknown": "unknown error",
      "update.hintContainer": "In Docker: docker compose up -d --build",
      "help.title": "Help & feedback",
      "help.intro":
        "Feedback goes through the project's GitHub issues. This form prepares the report and opens it on GitHub — you submit it there yourself, under your own account.",
      "help.noRepo":
        "No GitHub repository is configured for this installation. Without the GITHUB_REPO setting there is nowhere to send reports.",
      "help.kindLabel": "Type of report",
      "help.kind.bug": "Bug",
      "help.kind.idea": "Idea or request",
      "help.kind.question": "Question",
      "help.titleLabel": "Title",
      "help.titlePlaceholder": "One short sentence",
      "help.descriptionLabel": "Description",
      "help.descriptionPlaceholder": "What did you do, what happened, what did you expect?",
      "help.attachedLabel": "Attached to the report",
      "help.attachedHint":
        "A GitHub issue is publicly visible. You can still edit everything on GitHub before submitting.",
      "help.submit": "Report on GitHub",
      "help.submitHint": "Opens GitHub with the form prefilled.",
      "help.browseIssues": "Browse reports already filed",
      "help.version": "Installed version: {{version}}",
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
