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

  // Both deletions cascade into role_category_count, so a stray click wipes the
  // numbers entered for that category across the whole project's schedule. The
  // × is a far smaller target than the old "Gruppe löschen" button, so the
  // consequence gets spelled out before it happens.
  const confirmDeleteGroup = (id: string, name: string) => {
    if (window.confirm(t("settings.group.confirmDelete", { name }))) {
      deleteGroupMutation.mutate(id);
    }
  };

  const confirmDeleteCategory = (id: string, name: string) => {
    if (window.confirm(t("settings.category.confirmDelete", { name }))) {
      deleteCategoryMutation.mutate(id);
    }
  };

  if (!projectId) return null;

  return (
    <main className="container py-4" style={{ maxWidth: 760 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Link to={`/projects/${projectId}`}>&larr; {t("nav.backToSchedule")}</Link>
        <LanguageSwitcher />
      </div>
      <h1 className="h3 mb-4">{t("settings.title")}</h1>

      <h2 className="h5 mb-3">{t("settings.categories")}</h2>
      {groupsQuery.data?.map((group) => {
        const groupCategories = categoriesQuery.data?.filter((c) => c.categoryGroupId === group.id) ?? [];
        return (
          <div key={group.id} className="card mb-3">
            <div className="card-header d-flex align-items-center gap-2">
              <input
                className="form-control form-control-sm fw-semibold"
                aria-label={t("settings.group.name")}
                defaultValue={group.name}
                onBlur={(e) => {
                  if (e.target.value !== group.name) {
                    renameGroupMutation.mutate({ id: group.id, name: e.target.value });
                  }
                }}
              />
              <button
                type="button"
                className="row-delete"
                title={t("settings.group.delete")}
                onClick={() => confirmDeleteGroup(group.id, group.name)}
              >
                &times;
              </button>
            </div>

            <ul className="list-group list-group-flush">
              {groupCategories.map((category) => (
                <li key={category.id} className="list-group-item d-flex align-items-center gap-2">
                  <input
                    className="form-control form-control-sm"
                    aria-label={t("settings.category.name")}
                    defaultValue={category.name}
                    onBlur={(e) => {
                      if (e.target.value !== category.name) {
                        renameCategoryMutation.mutate({ id: category.id, name: e.target.value });
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="row-delete"
                    title={t("settings.category.delete")}
                    onClick={() => confirmDeleteCategory(category.id, category.name)}
                  >
                    &times;
                  </button>
                </li>
              ))}
              {groupCategories.length === 0 && (
                <li className="list-group-item text-body-secondary small">
                  {t("settings.category.empty")}
                </li>
              )}
            </ul>

            {/* A form, not a bare button, so Enter submits — same as the project
                create form on the list page. */}
            <div className="card-footer">
              <form
                className="d-flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = newCategoryNameByGroup[group.id]?.trim();
                  if (name) createCategoryMutation.mutate({ groupId: group.id, name });
                }}
              >
                <input
                  className="form-control form-control-sm"
                  placeholder={t("settings.category.newPlaceholder")}
                  value={newCategoryNameByGroup[group.id] ?? ""}
                  onChange={(e) =>
                    setNewCategoryNameByGroup((prev) => ({ ...prev, [group.id]: e.target.value }))
                  }
                />
                <button
                  type="submit"
                  className="btn btn-sm btn-outline-secondary text-nowrap"
                  disabled={!newCategoryNameByGroup[group.id]?.trim()}
                >
                  {t("settings.category.add")}
                </button>
              </form>
            </div>
          </div>
        );
      })}

      <div className="card">
        <div className="card-body">
          <form
            className="d-flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (newGroupName.trim()) createGroupMutation.mutate(newGroupName.trim());
            }}
          >
            <input
              className="form-control form-control-sm"
              placeholder={t("settings.group.newPlaceholder")}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-sm btn-primary text-nowrap"
              disabled={!newGroupName.trim()}
            >
              {t("settings.group.add")}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
