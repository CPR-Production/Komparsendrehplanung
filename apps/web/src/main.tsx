import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./controls.css";
import "./project-list.css";
import "./schedule-colors.css";
import "./i18n/index.js";
import { UpdateBanner } from "./components/UpdateBanner.js";
import { HelpPage } from "./pages/HelpPage.js";
import { ProjectListPage } from "./pages/ProjectListPage.js";
import { ProjectSchedulePage } from "./pages/ProjectSchedulePage.js";
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
          <Route path="/projects/:projectId/settings" element={<SettingsPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
