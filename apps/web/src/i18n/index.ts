import i18n from "i18next";
import { initReactI18next } from "react-i18next";

/* Die angebotenen Sprachen — die einzige Liste, die eine neue erweitert. Sie
   steht hier und nicht im LanguageSwitcher, weil die Übersetzungen hier liegen:
   ein Locale, das in der Auswahl auftaucht, aber in `strings` fehlt, wäre eine
   Sprache ohne Wörter. */
export const LOCALES = [
  { code: "de", label: "DE" },
  { code: "en", label: "EN" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

/* Alle Sprachen stehen pro Schlüssel nebeneinander, nicht als ein Block je
   Sprache. Das ist der Punkt: so lässt sich zeilenweise abgleichen, was die
   Fassungen sagen, und `Record<Locale, string>` macht jede Lücke zu einem
   Compilerfehler — ein neues Locale in LOCALES verlangt damit genau eine
   Zeichenkette pro Zeile, und TypeScript nennt jede, die noch fehlt.

   Platzhalter, bis der DB-gestützte Endpunkt `/api/translations` (Phase 5) das
   hier durch redeploy-freie, editierbare Übersetzungen ersetzt. */
const strings: Record<string, Record<Locale, string>> = {
  "nav.language": { de: "Sprache", en: "Language" },
  "nav.version": { de: "App-Version {{version}}", en: "App version {{version}}" },
  /* „Set" heißt in der Oberfläche jetzt Tagteiler — ein Set ist ein Drehtag,
     und der Knopf legt die Trennung zwischen zwei Drehtagen an, genau wie der
     Daybreak-Streifen in der Vorlage. */
  "nav.addSet": { de: "+ Tagteiler", en: "+ Daybreak" },
  "nav.stripSize": { de: "Strip Size", en: "Strip Size" },
  "nav.settings": { de: "Einstellungen", en: "Settings" },
  "nav.editing.unlock": { de: "Bearbeiten freigeben", en: "Enable editing" },
  "nav.editing.lock": { de: "Bearbeiten sperren", en: "Lock editing" },
  "nav.backToSchedule": { de: "Zurück zum Drehplan", en: "Back to schedule" },
  "nav.backToProjects": { de: "Zurück zu den Projekten", en: "Back to projects" },
  "nav.help": { de: "Hilfe & Feedback", en: "Help & feedback" },

  "project.list.title": { de: "Projekte", en: "Projects" },
  "project.list.empty": { de: "Noch keine Projekte angelegt.", en: "No projects yet." },
  "project.list.loading": { de: "Lädt…", en: "Loading…" },
  "project.list.error": {
    de: "Projekte konnten nicht geladen werden.",
    en: "Could not load projects.",
  },
  "project.list.created": { de: "Angelegt am {{date}}", en: "Created {{date}}" },
  "project.create.namePlaceholder": { de: "Projektname", en: "Project name" },
  "project.create.submit": { de: "Projekt anlegen", en: "Create project" },

  "settings.title": { de: "Einstellungen", en: "Settings" },
  "settings.categories": { de: "Kategorien", en: "Categories" },
  "settings.group.name": { de: "Gruppenname", en: "Group name" },
  "settings.group.delete": { de: "Gruppe löschen", en: "Delete group" },
  "settings.group.newPlaceholder": {
    de: "Neue Kategorie-Gruppe (z. B. Drivers)",
    en: "New category group (e.g. Drivers)",
  },
  "settings.group.add": { de: "+ Gruppe", en: "+ Group" },
  "settings.group.confirmDelete": {
    de: "Gruppe „{{name}}“ mit allen ihren Kategorien löschen? Die dafür im Drehplan eingetragenen Zahlen gehen mit verloren.",
    en: "Delete group “{{name}}” and all its categories? The numbers entered for them in the schedule will go with it.",
  },
  "settings.category.name": { de: "Kategoriename", en: "Category name" },
  "settings.category.delete": { de: "Kategorie löschen", en: "Delete category" },
  "settings.category.newPlaceholder": { de: "Neue Kategorie", en: "New category" },
  "settings.category.add": { de: "+ Kategorie", en: "+ Category" },
  "settings.category.confirmDelete": {
    de: "Kategorie „{{name}}“ löschen? Die dafür im Drehplan eingetragenen Zahlen gehen mit verloren.",
    en: "Delete category “{{name}}”? The numbers entered for it in the schedule will go with it.",
  },
  "settings.category.empty": {
    de: "Noch keine Kategorien in dieser Gruppe.",
    en: "No categories in this group yet.",
  },
  "settings.colors": { de: "Farben", en: "Colors" },
  "settings.color.intro": {
    de: "Zuerst die Grundfarben des Rasters, dann die Szenen: eine Szene wird nach ihrem Zustand eingefärbt — intern oder extern, zusammen mit der Tageszeit. Hintergrund und Text lassen sich überall getrennt einstellen. Was hier nicht geändert wird, folgt weiter der Vorgabe.",
    en: "The grid's base colors first, then the scenes: a scene is coloured by its state — interior or exterior, together with the time of day. Background and text are set separately throughout. Anything left alone here keeps following the default.",
  },
  "settings.color.chrome": { de: "Grundfarben", en: "Base colors" },
  "colorTarget.chrome.header": { de: "Tabellenkopf", en: "Table header" },
  "colorTarget.chrome.set": { de: "Tagteiler", en: "Daybreak" },
  "colorTarget.chrome.role": { de: "Rolle", en: "Role" },
  "colorTarget.chrome.count": { de: "Anzahl", en: "Count" },
  "colorTarget.chrome.change": { de: "Rollenwechsel", en: "Costume change" },
  "settings.color.background": { de: "Hintergrund", en: "Background" },
  "settings.color.text": { de: "Text", en: "Text" },
  "settings.color.reset": { de: "Auf die Vorgabe zurücksetzen", en: "Reset to the default" },
  "settings.color.resetShort": { de: "Vorgabe", en: "Default" },
  "settings.color.resetAll": {
    de: "Alle Farben auf die Vorgaben zurücksetzen",
    en: "Reset all colors to the defaults",
  },
  "settings.color.resetAllConfirm": {
    de: "Alle geänderten Farben (aktuell {{amount}}) auf die Vorgaben zurücksetzen?",
    en: "Reset all changed colors ({{amount}} at the moment) to the defaults?",
  },
  "settings.color.error": {
    de: "Farben konnten nicht geladen werden.",
    en: "Could not load the colors.",
  },

  /* Grid und Einstellungen beschriften dieselben Szenenzustände, deshalb teilen
     sie sich diese Schlüssel — zwei Sätze wären zwei Schreibweisen. */
  "sceneState.intExt.intern": { de: "Intern", en: "Interior" },
  "sceneState.intExt.extern": { de: "Extern", en: "Exterior" },
  "sceneState.timeOfDay.tag": { de: "Tag", en: "Day" },
  "sceneState.timeOfDay.nacht": { de: "Nacht", en: "Night" },
  "sceneState.timeOfDay.morgen": { de: "Morgen", en: "Morn" },
  "sceneState.timeOfDay.dim": { de: "Dim", en: "Dim" },
  "sceneState.timeOfDay.abend": { de: "Abend", en: "Eve" },

  "update.available": {
    de: "Version {{version}} ist verfügbar (installiert: {{current}}).",
    en: "Version {{version}} is available (installed: {{current}}).",
  },
  "update.action": { de: "Update ansehen", en: "View update" },
  "update.dismiss": { de: "Später", en: "Later" },
  "update.start": { de: "Jetzt installieren", en: "Install now" },
  "update.retry": { de: "Erneut versuchen", en: "Try again" },
  "update.phase.downloading": { de: "Lädt herunter…", en: "Downloading…" },
  "update.phase.verifying": { de: "Prüft die Datei…", en: "Verifying the file…" },
  "update.phase.installing": { de: "Installiert…", en: "Installing…" },
  "update.phase.restarting": { de: "Startet neu…", en: "Restarting…" },
  "update.failed": { de: "Update fehlgeschlagen: {{error}}", en: "Update failed: {{error}}" },
  "update.failedUnknown": { de: "unbekannter Fehler", en: "unknown error" },
  "update.hintContainer": {
    de: "Im Docker-Betrieb: docker compose up -d --build",
    en: "In Docker: docker compose up -d --build",
  },

  "help.title": { de: "Hilfe & Feedback", en: "Help & feedback" },
  "help.intro": {
    de: "Feedback läuft über die Issues des Projekts auf GitHub. Das Formular bereitet die Meldung vor und öffnet sie auf GitHub — abgeschickt wird sie erst dort von dir, unter deinem eigenen Konto.",
    en: "Feedback goes through the project's GitHub issues. This form prepares the report and opens it on GitHub — you submit it there yourself, under your own account.",
  },
  "help.noRepo": {
    de: "Für diese Installation ist kein GitHub-Repository hinterlegt. Ohne die Einstellung GITHUB_REPO gibt es kein Ziel für Meldungen.",
    en: "No GitHub repository is configured for this installation. Without the GITHUB_REPO setting there is nowhere to send reports.",
  },
  "help.kindLabel": { de: "Art der Meldung", en: "Type of report" },
  "help.kind.bug": { de: "Fehler", en: "Bug" },
  "help.kind.idea": { de: "Idee oder Wunsch", en: "Idea or request" },
  "help.kind.question": { de: "Frage", en: "Question" },
  "help.titleLabel": { de: "Titel", en: "Title" },
  "help.titlePlaceholder": { de: "Kurz in einem Satz", en: "One short sentence" },
  "help.descriptionLabel": { de: "Beschreibung", en: "Description" },
  "help.descriptionPlaceholder": {
    de: "Was hast du gemacht, was ist passiert, was hättest du erwartet?",
    en: "What did you do, what happened, what did you expect?",
  },
  "help.attachedLabel": { de: "Wird mit angehängt", en: "Attached to the report" },
  "help.attachedHint": {
    de: "Ein GitHub-Issue ist öffentlich sichtbar. Auf GitHub kannst du alles noch ändern, bevor du absendest.",
    en: "A GitHub issue is publicly visible. You can still edit everything on GitHub before submitting.",
  },
  "help.submit": { de: "Auf GitHub melden", en: "Report on GitHub" },
  "help.submitHint": {
    de: "Öffnet GitHub mit vorausgefülltem Formular.",
    en: "Opens GitHub with the form prefilled.",
  },
  "help.browseIssues": {
    de: "Bereits gemeldete Punkte ansehen",
    en: "Browse reports already filed",
  },
  "help.version": { de: "Installierte Version: {{version}}", en: "Installed version: {{version}}" },

  /* Das Drehplan-Grid. Die Spaltenköpfe tragen in beiden Sprachen die Begriffe
     der Vorlage — sie sind der Wortschatz, in dem am Set geredet wird, und eine
     deutsche Fassung stünde neben der Vorlage, nicht in ihr. Dass `de` und `en`
     hier gleich lauten, ist Absicht und keine vergessene Zeile; nebeneinander
     ist das jetzt auch zu sehen. Alles, was der Nutzer selbst eintippt
     (Projekt-, Set-, Rollen-, Kategorienamen, Synopsis, Wechseltext), läuft
     nirgends durch t(). */
  "grid.head.scene": { de: "Scene", en: "Scene" },
  "grid.head.intExtDayNight": { de: "In/Ex · D/N", en: "In/Ex · D/N" },
  "grid.head.scriptTime": { de: "Script Time", en: "Script Time" },
  "grid.head.location": { de: "Location", en: "Location" },
  "grid.head.totalPerScene": { de: "Total/Scene", en: "Total/Scene" },
  "grid.head.fuzzleId": { de: "Fuzzle ID", en: "Fuzzle ID" },
  "grid.head.name": { de: "Name", en: "Name" },
  "grid.head.total": { de: "Total", en: "Total" },

  "grid.set.sd": { de: "SD", en: "SD" },
  "grid.set.move": { de: "Tagteiler verschieben", en: "Move daybreak" },
  "grid.set.delete": { de: "Tagteiler löschen", en: "Delete daybreak" },
  "grid.set.deleteBlocked": {
    de: "Erst alle Szenen dieses Tagteilers löschen",
    en: "Delete all scenes of this daybreak first",
  },
  "grid.set.shootDate": { de: "Drehdatum", en: "Shoot date" },
  /* Motiv ist das Inhaltliche („Küche Weber"), Location der Drehort
     („Industriestr. 4"). Der deutsche Zusatz steht in Klammern dahinter; im
     Englischen bleibt der nackte Begriff stehen. Zwei unabhängige Listen mit je
     eigenem „+", weil drei Motive an derselben Adresse liegen können. */
  "grid.set.motif": { de: "Motiv (Inhaltlich)", en: "Motiv" },
  "grid.set.location": { de: "Location (Drehort)", en: "Location" },
  "grid.set.addMotif": { de: "+ Motiv", en: "+ Motiv" },
  "grid.set.deleteMotif": { de: "Motiv löschen", en: "Delete motiv" },
  "grid.set.addLocation": { de: "+ Location", en: "+ Location" },
  "grid.set.deleteLocation": { de: "Location löschen", en: "Delete location" },
  "grid.set.totalsLabel": { de: "Summe neu", en: "Total new" },

  "grid.scene.add": { de: "+ Szene", en: "+ Scene" },
  "grid.scene.move": { de: "Szene verschieben", en: "Move scene" },
  "grid.scene.delete": { de: "Szene löschen", en: "Delete scene" },
  "grid.scene.deleteBlocked": {
    de: "Erst alle Rollen dieser Szene löschen",
    en: "Delete all roles of this scene first",
  },
  "grid.scene.numberPlaceholder": { de: "#", en: "#" },
  "grid.scene.synopsis": { de: "Synopsis", en: "Synopsis" },
  "grid.scene.timeOfDay": { de: "Tageszeit", en: "Time of day" },

  "grid.role.add": { de: "+ Rolle", en: "+ Role" },
  "grid.role.delete": { de: "Rolle löschen", en: "Delete role" },
  "grid.role.namePrompt": { de: "Rollenname?", en: "Role name?" },

  "grid.count.new": { de: "neu", en: "new" },
  "grid.count.reused": { de: "wdh.", en: "reu." },
  "grid.count.toggleToReused": {
    de: "neu – klicken für wiederverwendet",
    en: "new – click for reused",
  },
  "grid.count.toggleToNew": {
    de: "wiederverwendet – klicken für neu",
    en: "reused – click for new",
  },

  /* Ein „Change" ist am Set der Kostümwechsel einer Rolle, nicht irgendein
     Wechsel — beide Sprachen benennen jetzt genau das. */
  "grid.change.label": { de: "Rollenwechsel", en: "Costume change" },
  "grid.change.add": { de: "+ Rollenwechsel", en: "+ Costume change" },
  "grid.change.delete": { de: "Rollenwechsel löschen", en: "Delete costume change" },
};

// i18next will seine Ressourcen nach Sprache sortiert; die Liste oben steht
// nach Schlüssel. Umgedreht wird das hier, an genau einer Stelle.
const resources = Object.fromEntries(
  LOCALES.map(({ code }) => [
    code,
    {
      translation: Object.fromEntries(
        Object.entries(strings).map(([key, byLocale]) => [key, byLocale[code]]),
      ),
    },
  ]),
);

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

/* index.html ships lang="de" — right for the default, wrong from the first
   switch on. Screen readers pick their voice from it, the browser offers to
   translate a page it believes is foreign, and hyphenation follows it too. */
function applyDocumentLanguage(language: string): void {
  document.documentElement.lang = language;
}

// Also once here, not only in the listener below: the resources sit in memory,
// so init can emit languageChanged before that listener is registered — and
// the very first paint would keep the attribute from the HTML file.
applyDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);

// Without the stored value the choice only survives in-app navigation and a
// plain reload would drop the user back to German.
i18n.on("languageChanged", (language) => {
  applyDocumentLanguage(language);
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not worth breaking the switcher over — the language still applies here.
  }
});

export default i18n;
