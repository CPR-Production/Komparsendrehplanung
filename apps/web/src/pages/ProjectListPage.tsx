import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export function ProjectListPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: api.listProjects });
  const createMutation = useMutation({
    mutationFn: api.createProject,
    onSuccess: () => {
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", maxWidth: 640 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>{t("project.list.title")}</h1>
        <select value={i18n.language} onChange={(e) => void i18n.changeLanguage(e.target.value)}>
          <option value="de">DE</option>
          <option value="en">EN</option>
        </select>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) createMutation.mutate(name.trim());
        }}
        style={{ display: "flex", gap: "0.5rem", margin: "1rem 0" }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("project.create.namePlaceholder")}
        />
        <button type="submit" disabled={createMutation.isPending}>
          {t("project.create.submit")}
        </button>
      </form>

      {projectsQuery.isLoading && <p>Loading…</p>}
      {projectsQuery.isError && <p>Error loading projects.</p>}
      {projectsQuery.data && projectsQuery.data.length === 0 && <p>{t("project.list.empty")}</p>}
      <ul>
        {projectsQuery.data?.map((project) => (
          <li key={project.id}>
            <Link to={`/projects/${project.id}`}>{project.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
