export interface RoleCategoryCount {
  categoryId: string;
  count: number;
  isNew: boolean;
}

export interface RoleWithCounts {
  id: string;
  counts: RoleCategoryCount[];
}

export interface SceneWithRoles {
  id: string;
  roles: RoleWithCounts[];
}

export interface SetWithScenes {
  id: string;
  scenes: SceneWithRoles[];
}
