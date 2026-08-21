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
import { HelpPage } from "./pages/HelpPage.js";
import { ProjectListPage } from "./pages/ProjectListPage.js";
import { ProjectSchedulePage } from "./pages/ProjectSchedulePage.js";
import { SettingsCategoriesPage } from "./pages/SettingsCategoriesPage.js";
import { SettingsColorsPage } from "./pages/SettingsColorsPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <UpdateBanner />
        <Routes>
          <Route path="/" element={<ProjectListPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/projects/:projectId" element={<ProjectSchedulePage />} />
          {/* One sub-page per topic. The bare /settings link is kept working
              and lands on the categories, which is where it used to open. */}
          <Route path="/projects/:projectId/settings" element={<SettingsPage />}>
            <Route index element={<Navigate to="categories" replace />} />
            <Route path="categories" element={<SettingsCategoriesPage />} />
            <Route path="colors" element={<SettingsColorsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
