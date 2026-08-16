import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { LanguageSwitcher } from "../components/LanguageSwitcher.js";

export function SettingsPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [newGroupName, setNewGroupName] = useState("");
  const [newCategoryNameByGroup, setNewCategoryNameByGroup] = useState<Record<string, string>>({});

  const groupsQuery = useQuery({
    queryKey: ["categoryGroups", projectId],
    queryFn: () => api.listCategoryGroups(projectId!),
    enabled: !!projectId,
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories", projectId],
    queryFn: () => api.listCategories(projectId!),
    enabled: !!projectId,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["categoryGroups", projectId] });
    void queryClient.invalidateQueries({ queryKey: ["categories", projectId] });
  };

  const createGroupMutation = useMutation({
    mutationFn: (name: string) => api.createCategoryGroup(projectId!, name),
    onSuccess: () => {
      setNewGroupName("");
      invalidate();
    },
  });
  const renameGroupMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.updateCategoryGroup(id, name),
    onSuccess: invalidate,
  });
  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => api.deleteCategoryGroup(id),
    onSuccess: invalidate,
  });
  const createCategoryMutation = useMutation({
    mutationFn: ({ groupId, name }: { groupId: string; name: string }) => api.createCategory(groupId, name),
    onSuccess: (_data, { groupId }) => {
      setNewCategoryNameByGroup((prev) => ({ ...prev, [groupId]: "" }));
      invalidate();
    },
  });
  const renameCategoryMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.updateCategory(id, name),
    onSuccess: invalidate,
  });
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: invalidate,
  });

  if (!projectId) return null;

  return (
    <main className="container py-3" style={{ maxWidth: 700 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Link to={`/projects/${projectId}`}>&larr; {t("nav.backToSchedule")}</Link>
        <LanguageSwitcher />
      </div>
      <h1 className="h3">{t("settings.title")}</h1>

      <h2 className="h5">{t("settings.categories")}</h2>
      {groupsQuery.data?.map((group) => (
        <fieldset key={group.id} style={{ marginBottom: "1rem" }}>
          <legend>
            <input
              defaultValue={group.name}
              onBlur={(e) => {
                if (e.target.value !== group.name) {
                  renameGroupMutation.mutate({ id: group.id, name: e.target.value });
                }
              }}
            />
            <button type="button" onClick={() => deleteGroupMutation.mutate(group.id)}>
              Gruppe löschen
            </button>
          </legend>

          <ul>
            {categoriesQuery.data
              ?.filter((c) => c.categoryGroupId === group.id)
              .map((category) => (
                <li key={category.id} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <input
                    defaultValue={category.name}
                    onBlur={(e) => {
                      if (e.target.value !== category.name) {
                        renameCategoryMutation.mutate({ id: category.id, name: e.target.value });
                      }
                    }}
                  />
                  <button type="button" onClick={() => deleteCategoryMutation.mutate(category.id)}>
                    &times;
                  </button>
                </li>
              ))}
          </ul>

          <input
            placeholder="Neue Kategorie"
            value={newCategoryNameByGroup[group.id] ?? ""}
            onChange={(e) =>
              setNewCategoryNameByGroup((prev) => ({ ...prev, [group.id]: e.target.value }))
            }
          />
          <button
            type="button"
            onClick={() => {
              const name = newCategoryNameByGroup[group.id]?.trim();
              if (name) createCategoryMutation.mutate({ groupId: group.id, name });
            }}
          >
            + Kategorie
          </button>
        </fieldset>
      ))}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          placeholder="Neue Kategorie-Gruppe (z. B. Drivers)"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            if (newGroupName.trim()) createGroupMutation.mutate(newGroupName.trim());
          }}
        >
          + Gruppe
        </button>
      </div>
    </main>
  );
}
