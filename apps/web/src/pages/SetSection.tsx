import { calcSetNewCountsByCategory, calcSetTotalShoots } from "@komparsen/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HTMLAttributes, TdHTMLAttributes } from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  type Category,
  type ChangeRow,
  type ColorSetting,
  type SceneRow,
  type SetLocation,
  type ShootSet,
} from "../api.js";
import { moveBefore, SCENE_DRAG_TYPE } from "../dragReorder.js";
import { ScheduleTable } from "../grid/ScheduleTable.js";
import { useDebouncedSave } from "../useDebouncedSave.js";

interface SetSectionProps {
  projectId: string;
  setId: string;
  categories: Category[];
  colors: ColorSetting[];
  setDragHandleProps: HTMLAttributes<HTMLSpanElement>;
  setDropProps: TdHTMLAttributes<HTMLTableCellElement>;
}

export function SetSection({
  projectId,
  setId,
  categories,
  colors,
  setDragHandleProps,
  setDropProps,
}: SetSectionProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const fullSetQuery = useQuery({
    queryKey: ["fullSet", setId],
    queryFn: () => api.getFullSet(setId),
  });

  const [setDraft, setSetDraft] = useState<ShootSet | null>(null);
  const [locations, setLocations] = useState<SetLocation[]>([]);
  const [scenes, setScenes] = useState<SceneRow[]>([]);
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  // Only hydrate local editable state from the server ONCE, on first load.
  // Re-syncing on every background refetch (e.g. after creating a scene in
  // this same set) would clobber any edit still sitting in a debounce window
  // that hasn't been persisted yet.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !fullSetQuery.data) return;
    hydratedRef.current = true;
    setSetDraft(fullSetQuery.data);
    setLocations(fullSetQuery.data.locations);
    setScenes(fullSetQuery.data.scenes);
    setChanges(fullSetQuery.data.changes);
  }, [fullSetQuery.data]);
  const scenesRef = useRef(scenes);
  scenesRef.current = scenes;

  const reorderScenesMutation = useMutation({
    mutationFn: (ids: string[]) => api.reorderScenes(setId, ids),
  });

  const addSceneAfter = async (afterSceneId: string | null) => {
    const scene = await api.createScene(setId, {});
    setScenes((prev) => {
      const withNew = [...prev, { ...scene, roles: [] }];
      if (afterSceneId === null) {
        const ids = withNew.map((s) => s.id);
        reorderScenesMutation.mutate(ids);
        return withNew;
      }
      const currentIds = prev.map((s) => s.id);
      const insertIndex = currentIds.indexOf(afterSceneId) + 1;
      const finalIds = [...currentIds.slice(0, insertIndex), scene.id, ...currentIds.slice(insertIndex)];
      reorderScenesMutation.mutate(finalIds);
      return finalIds.map((id) => withNew.find((s) => s.id === id)!);
    });
  };

  const [draggedSceneId, setDraggedSceneId] = useState<string | null>(null);
  const moveScene = (draggedId: string, targetId: string) => {
    setScenes((prev) => {
      const ids = prev.map((s) => s.id);
      const nextIds = moveBefore(ids, draggedId, targetId);
      if (nextIds === ids) return prev;
      reorderScenesMutation.mutate(nextIds);
      return nextIds.map((id) => prev.find((s) => s.id === id)!);
    });
  };
  // Only the handle starts a drag; the drop targets are the Scene's cells (see
  // getSceneDropProps), so the user does not have to hit the handle glyph again
  // to drop. The payload rides in dataTransfer so the drag also initiates in
  // browsers that require it, and so a Set drag is never taken for a Scene drag.
  const getSceneDragHandleProps = (sceneId: string): HTMLAttributes<HTMLSpanElement> => ({
    draggable: true,
    onDragStart: (e) => {
      e.dataTransfer.setData(SCENE_DRAG_TYPE, sceneId);
      e.dataTransfer.effectAllowed = "move";
      setDraggedSceneId(sceneId);
    },
    onDragEnd: () => setDraggedSceneId(null),
  });

  const getSceneDropProps = (sceneId: string): TdHTMLAttributes<HTMLTableCellElement> => ({
    onDragOver: (e) => {
      // dataTransfer payloads are unreadable during dragover, but `types` is
      // exposed — enough to accept only Scene drags.
      if (!e.dataTransfer.types.includes(SCENE_DRAG_TYPE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    onDrop: (e) => {
      const draggedId = e.dataTransfer.getData(SCENE_DRAG_TYPE);
      if (!draggedId) return;
      e.preventDefault();
      moveScene(draggedId, sceneId);
      setDraggedSceneId(null);
    },
  });

  const addRole = async (sceneId: string) => {
    const name = window.prompt(t("grid.role.namePrompt"));
    if (!name?.trim()) return;
    const role = await api.createRole(sceneId, name.trim());
    setScenes((prev) =>
      prev.map((scene) => (scene.id === sceneId ? { ...scene, roles: [...scene.roles, role] } : scene)),
    );
  };

  const removeRole = async (roleId: string) => {
    setScenes((prev) =>
      prev.map((scene) => ({ ...scene, roles: scene.roles.filter((r) => r.id !== roleId) })),
    );
    await api.deleteRole(roleId);
  };

  // Deleting a Scene is only offered once its Roles are gone, so a stray click
  // can never take a whole cast list with it.
  const removeScene = async (sceneId: string) => {
    const scene = scenesRef.current.find((s) => s.id === sceneId);
    if (!scene || scene.roles.length > 0) return;
    setScenes((prev) => prev.filter((s) => s.id !== sceneId));
    setChanges((prev) => prev.filter((c) => c.anchorAfterSceneId !== sceneId));
    await api.deleteScene(sceneId);
    void queryClient.invalidateQueries({ queryKey: ["sceneLocations", projectId] });
  };

  const debouncedSaveCounts = useDebouncedSave((roleId: string) => {
    const role = scenesRef.current.flatMap((s) => s.roles).find((r) => r.id === roleId);
    if (!role) return;
    void api.setRoleCounts(
      roleId,
      role.counts.map((c) => ({ categoryId: c.categoryId, count: c.count, isNew: c.isNew })),
    );
  });

  const onCountChange = (roleId: string, categoryId: string, count: number) => {
    setScenes((prev) =>
      prev.map((scene) => ({
        ...scene,
        roles: scene.roles.map((role) => {
          if (role.id !== roleId) return role;
          const hasCategory = role.counts.some((c) => c.categoryId === categoryId);
          return {
            ...role,
            counts: hasCategory
              ? role.counts.map((c) => (c.categoryId === categoryId ? { ...c, count } : c))
              : [...role.counts, { id: "", roleId, categoryId, count, isNew: true }],
          };
        }),
      })),
    );
    debouncedSaveCounts(roleId, roleId);
  };

  const onToggleIsNew = (roleId: string, categoryId: string) => {
    setScenes((prev) =>
      prev.map((scene) => ({
        ...scene,
        roles: scene.roles.map((role) => {
          if (role.id !== roleId) return role;
          const hasCategory = role.counts.some((c) => c.categoryId === categoryId);
          return {
            ...role,
            counts: hasCategory
              ? role.counts.map((c) => (c.categoryId === categoryId ? { ...c, isNew: !c.isNew } : c))
              : [...role.counts, { id: "", roleId, categoryId, count: 0, isNew: false }],
          };
        }),
      })),
    );
    debouncedSaveCounts(roleId, roleId);
  };

  const debouncedSaveRoleName = useDebouncedSave((roleId: string, name: string) => {
    void api.updateRole(roleId, { name });
  });

  const onRoleNameChange = (roleId: string, name: string) => {
    setScenes((prev) =>
      prev.map((scene) => ({
        ...scene,
        roles: scene.roles.map((role) => (role.id === roleId ? { ...role, name } : role)),
      })),
    );
    debouncedSaveRoleName(roleId, roleId, name);
  };

  const debouncedSaveFuzzleId = useDebouncedSave((roleId: string, fuzzleId: string) => {
    void api.updateRole(roleId, { fuzzleId });
  });

  const onFuzzleIdChange = (roleId: string, fuzzleId: string) => {
    setScenes((prev) =>
      prev.map((scene) => ({
        ...scene,
        roles: scene.roles.map((role) => (role.id === roleId ? { ...role, fuzzleId } : role)),
      })),
    );
    debouncedSaveFuzzleId(roleId, roleId, fuzzleId);
  };

  const debouncedSaveScene = useDebouncedSave((sceneId: string, field: keyof SceneRow, value: string) => {
    void api.updateScene(sceneId, { [field]: value }).then(() => {
      if (field === "location") {
        void queryClient.invalidateQueries({ queryKey: ["sceneLocations", projectId] });
      }
    });
  });

  const onSceneFieldChange = (sceneId: string, field: keyof SceneRow, value: string) => {
    setScenes((prev) => prev.map((scene) => (scene.id === sceneId ? { ...scene, [field]: value } : scene)));
    debouncedSaveScene(`${sceneId}:${field}`, sceneId, field, value);
  };

  const debouncedSaveSet = useDebouncedSave((field: keyof ShootSet, value: string) => {
    void api.updateSet(setId, { [field]: value });
  });

  const onSetFieldChange = (field: keyof ShootSet, value: string) => {
    setSetDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    queryClient.setQueryData<ShootSet[]>(["sets", projectId], (prev) =>
      prev?.map((set) => (set.id === setId ? { ...set, [field]: value } : set)),
    );
    debouncedSaveSet(`${field}`, field, value);
  };

  const debouncedSaveLocation = useDebouncedSave(
    (locationId: string, field: "name" | "address", value: string) => {
      void api.updateSetLocation(locationId, { [field]: value });
    },
  );

  const onLocationFieldChange = (locationId: string, field: "name" | "address", value: string) => {
    setLocations((prev) => prev.map((loc) => (loc.id === locationId ? { ...loc, [field]: value } : loc)));
    debouncedSaveLocation(`${locationId}:${field}`, locationId, field, value);
  };

  const addLocationMutation = useMutation({
    mutationFn: () => api.createSetLocation(setId),
    onSuccess: (location) => setLocations((prev) => [...prev, location]),
  });

  const removeLocation = async (locationId: string) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== locationId));
    await api.deleteSetLocation(locationId);
  };

  const addChange = async (sceneId: string) => {
    const change = await api.createChange(sceneId);
    setChanges((prev) => [...prev, change]);
  };

  const debouncedSaveChange = useDebouncedSave((changeId: string, description: string) => {
    void api.updateChange(changeId, { description });
  });

  const onChangeDescriptionChange = (changeId: string, description: string) => {
    setChanges((prev) => prev.map((c) => (c.id === changeId ? { ...c, description } : c)));
    debouncedSaveChange(changeId, changeId, description);
  };

  const removeChange = async (changeId: string) => {
    setChanges((prev) => prev.filter((c) => c.id !== changeId));
    await api.deleteChange(changeId);
  };

  if (!setDraft) return null;

  const setForTotals = {
    id: setId,
    scenes: scenes.map((scene) => ({
      id: scene.id,
      roles: scene.roles.map((r) => ({
        id: r.id,
        counts: r.counts.map((c) => ({ categoryId: c.categoryId, count: c.count, isNew: c.isNew })),
      })),
    })),
  };
  const totalShoots = calcSetTotalShoots(setForTotals);
  const newCountsByCategory = calcSetNewCountsByCategory(setForTotals);

  return (
    <ScheduleTable
      set={setDraft}
      locations={locations}
      scenes={scenes}
      changes={changes}
      categories={categories}
      colors={colors}
      totalShoots={totalShoots}
      newCountsByCategory={newCountsByCategory}
      setDragHandleProps={setDragHandleProps}
      setDropProps={setDropProps}
      getSceneDragHandleProps={getSceneDragHandleProps}
      getSceneDropProps={getSceneDropProps}
      draggedSceneId={draggedSceneId}
      onSetFieldChange={onSetFieldChange}
      onLocationFieldChange={onLocationFieldChange}
      onAddLocation={() => addLocationMutation.mutate()}
      onRemoveLocation={(id) => void removeLocation(id)}
      onAddSceneAfter={(sceneId) => void addSceneAfter(sceneId)}
      onCountChange={onCountChange}
      onToggleIsNew={onToggleIsNew}
      onRoleNameChange={onRoleNameChange}
      onFuzzleIdChange={onFuzzleIdChange}
      onSceneFieldChange={onSceneFieldChange}
      onAddRole={addRole}
      onRemoveRole={(roleId) => void removeRole(roleId)}
      onRemoveScene={(sceneId) => void removeScene(sceneId)}
      onAddChange={(sceneId) => void addChange(sceneId)}
      onChangeDescriptionChange={onChangeDescriptionChange}
      onRemoveChange={(changeId) => void removeChange(changeId)}
    />
  );
}
