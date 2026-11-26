import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./controls.css";
import "./project-list.css";
import "./schedule-colors.css";
import "./settings.css";
import "./i18n/index.js";
import { UpdateBanner } from "./components/UpdateBanner.js";
import { EditLockProvider } from "./editLock.js";
import { StripSizeProvider } from "./stripSize.js";
import { HelpPage } from "./pages/HelpPage.js";
import { ProjectListPage } from "./pages/ProjectListPage.js";
import { ProjectSchedulePage } from "./pages/ProjectSchedulePage.js";
import { ProjectSchedulesPage } from "./pages/ProjectSchedulesPage.js";
import { SettingsCategoriesPage } from "./pages/SettingsCategoriesPage.js";
import { SettingsColorsPage } from "./pages/SettingsColorsPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* Above the routes: the lock is app state, and a trip to the settings
          and back should not quietly re-open the grid. */}
      <EditLockProvider>
        {/* Ebenso oben wie die Sperre: die Strip Size ist eine Einstellung der
            App, nicht eines Drehplans, und soll einen Abstecher in die
            Einstellungen überleben. */}
        <StripSizeProvider>
          <BrowserRouter>
            <UpdateBanner />
            <Routes>
              <Route path="/" element={<ProjectListPage />} />
              <Route path="/help" element={<HelpPage />} />
              {/* Das Projekt öffnet jetzt seine Mappen, nicht mehr direkt ein
                  Raster — ein Projekt kann mehrere Drehpläne halten. Der Plan
                  selbst liegt eine Stufe tiefer. */}
              <Route path="/projects/:projectId" element={<ProjectSchedulesPage />} />
              <Route
                path="/projects/:projectId/schedules/:scheduleId"
                element={<ProjectSchedulePage />}
              />
              {/* One sub-page per topic. The bare /settings link is kept working
                  and lands on the categories, which is where it used to open. */}
              <Route path="/projects/:projectId/settings" element={<SettingsPage />}>
                <Route index element={<Navigate to="categories" replace />} />
                <Route path="categories" element={<SettingsCategoriesPage />} />
                <Route path="colors" element={<SettingsColorsPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </StripSizeProvider>
      </EditLockProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
