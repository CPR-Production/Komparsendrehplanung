import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { LanguageSwitcher } from "../components/LanguageSwitcher.js";

/* The shell around the settings sub-pages. One page per topic rather than one
   long page with headings: the sections would run into each other as more
   settings arrive, and a reader would have to scroll past everything they did
   not come for. The tabs stay here so the app nav keeps a single entry. */
export function SettingsPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) return null;

  return (
    <main className="container py-4" style={{ maxWidth: 760 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Link to={`/projects/${projectId}`}>&larr; {t("nav.backToSchedule")}</Link>
        <LanguageSwitcher />
      </div>
      <h1 className="h3 mb-3">{t("settings.title")}</h1>

      <nav className="nav nav-pills gap-2 mb-4">
        <NavLink className="nav-link py-1 px-3 border" to="categories">
          {t("settings.categories")}
        </NavLink>
        <NavLink className="nav-link py-1 px-3 border" to="colors">
          {t("settings.colors")}
        </NavLink>
      </nav>

      <Outlet />
    </main>
  );
}
