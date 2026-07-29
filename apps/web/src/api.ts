const API_BASE = "/api";

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status} ${await res.text()}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface Project {
  id: string;
  name: string;
  code: string | null;
}

export interface ShootSet {
  id: string;
  projectId: string;
  sdNumber: string | null;
  shootDate: string | null;
  sortOrder: number;
}

export interface Category {
  id: string;
  categoryGroupId: string;
  name: string;
  sortOrder: number;
  isDefault: boolean;
  groupSortOrder: number;
  groupName: string;
}

export interface CategoryGroup {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
}

export interface RoleCategoryCount {
  id: string;
  roleId: string;
  categoryId: string;
  count: number;
  isNew: boolean;
}

export interface RoleRow {
  id: string;
  sceneId: string;
  name: string;
  fuzzleId: string | null;
  sortOrder: number;
  counts: RoleCategoryCount[];
}

export interface SceneRow {
  id: string;
  setId: string;
  sceneNumber: string | null;
  intExt: string | null;
  dayNight: string | null;
  scriptTime: string | null;
  endTime: string | null;
  location: string | null;
  synopsis: string | null;
  sortOrder: number;
  roles: RoleRow[];
}

export interface SetLocation {
  id: string;
  setId: string;
  sortOrder: number;
  name: string | null;
  address: string | null;
}

export interface ChangeRow {
  id: string;
  setId: string;
  anchorAfterSceneId: string | null;
  description: string | null;
  sortOrder: number;
}

export interface FullSet extends ShootSet {
  locations: SetLocation[];
  scenes: SceneRow[];
  changes: ChangeRow[];
}

export interface FullProject extends Project {
  sets: FullSet[];
}

export const api = {
  listProjects: () => request<Project[]>("GET", "/projects"),
  getProject: (id: string) => request<Project>("GET", `/projects/${id}`),
  getFullProject: (id: string) => request<FullProject>("GET", `/projects/${id}/full`),
  createProject: (name: string) => request<Project>("POST", "/projects", { name }),

  listSets: (projectId: string) => request<ShootSet[]>("GET", `/projects/${projectId}/sets`),
  createSet: (projectId: string, data: Partial<ShootSet>) =>
    request<ShootSet>("POST", `/projects/${projectId}/sets`, data),
  updateSet: (setId: string, data: Partial<ShootSet>) =>
    request<ShootSet>("PATCH", `/sets/${setId}`, data),
  getFullSet: (setId: string) => request<FullSet>("GET", `/sets/${setId}/full`),
  reorderSets: (projectId: string, ids: string[]) =>
    request<void>("POST", `/projects/${projectId}/sets/reorder`, { ids }),

  createSetLocation: (setId: string) =>
    request<SetLocation>("POST", `/sets/${setId}/locations`, {}),
  updateSetLocation: (locationId: string, data: Partial<SetLocation>) =>
    request<SetLocation>("PATCH", `/set-locations/${locationId}`, data),
  deleteSetLocation: (locationId: string) => request<void>("DELETE", `/set-locations/${locationId}`),

  listCategories: (projectId: string) => request<Category[]>("GET", `/projects/${projectId}/categories`),
  listCategoryGroups: (projectId: string) =>
    request<CategoryGroup[]>("GET", `/projects/${projectId}/category-groups`),
  createCategoryGroup: (projectId: string, name: string) =>
    request<CategoryGroup>("POST", `/projects/${projectId}/category-groups`, { name }),
  updateCategoryGroup: (groupId: string, name: string) =>
    request<CategoryGroup>("PATCH", `/category-groups/${groupId}`, { name }),
  deleteCategoryGroup: (groupId: string) => request<void>("DELETE", `/category-groups/${groupId}`),

  createCategory: (groupId: string, name: string) =>
    request<Category>("POST", `/category-groups/${groupId}/categories`, { name }),
  updateCategory: (categoryId: string, name: string) =>
    request<Category>("PATCH", `/categories/${categoryId}`, { name }),
  deleteCategory: (categoryId: string) => request<void>("DELETE", `/categories/${categoryId}`),

  createScene: (setId: string, data: Partial<SceneRow>) =>
    request<SceneRow>("POST", `/sets/${setId}/scenes`, data),
  updateScene: (sceneId: string, data: Partial<SceneRow>) =>
    request<SceneRow>("PATCH", `/scenes/${sceneId}`, data),
  reorderScenes: (setId: string, ids: string[]) =>
    request<void>("POST", `/sets/${setId}/scenes/reorder`, { ids }),

  listProjectSceneLocations: (projectId: string) =>
    request<string[]>("GET", `/projects/${projectId}/scene-locations`),

  createRole: (sceneId: string, name: string) =>
    request<RoleRow>("POST", `/scenes/${sceneId}/roles`, { name }),
  updateRole: (roleId: string, data: { name?: string; fuzzleId?: string }) =>
    request<RoleRow>("PATCH", `/roles/${roleId}`, data),
  setRoleCounts: (roleId: string, counts: { categoryId: string; count: number; isNew: boolean }[]) =>
    request<{ counts: RoleCategoryCount[] }>("PUT", `/roles/${roleId}/counts`, { counts }),

  createChange: (sceneId: string, description?: string) =>
    request<ChangeRow>("POST", `/scenes/${sceneId}/changes`, { description }),
  updateChange: (changeId: string, data: Partial<Pick<ChangeRow, "description">>) =>
    request<ChangeRow>("PATCH", `/changes/${changeId}`, data),
  deleteChange: (changeId: string) => request<void>("DELETE", `/changes/${changeId}`),
};
