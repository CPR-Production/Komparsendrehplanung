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

/* Ein Set hält zwei unabhängige Listen: die Motive (das Inhaltliche) und die
   Locations (die Drehorte). Unabhängig, weil drei Motive an einer einzigen
   Adresse liegen können und dieselbe Adresse an einem anderen Tag ein anderes
   Motiv trägt — als Paar gespeichert hätte jede Zeile beides erfinden müssen.

   Die Liste steht hier, weil beide Seiten sie brauchen: der Server prüft
   dagegen, das Grid rendert eine Zeile je Art. */
export const SET_PLACE_KINDS = ["motif", "location"] as const;

export type SetPlaceKind = (typeof SET_PLACE_KINDS)[number];
