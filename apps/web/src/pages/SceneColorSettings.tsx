import { SCENE_COLOR_STATES, type SceneColorState } from "@komparsen/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type SceneColor } from "../api.js";
import { useDebouncedSave } from "../useDebouncedSave.js";

interface Draft {
  backgroundColor: string;
  textColor: string;
}

// Int, Ext and the combination each get their own card — the same three rows the
// brief draws, and the same card-plus-list-group shape the category groups use.
const GROUPS: { key: string; intExt: string[]; states: SceneColorState[] }[] = [];
for (const state of SCENE_COLOR_STATES) {
  const key = state.intExt.join("+");
  const group = GROUPS.find((g) => g.key === key);
  if (group) group.states.push(state);
  else GROUPS.push({ key, intExt: state.intExt, states: [state] });
}

export function SceneColorSettings({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // The colour input fires on every drag step. Drafts keep the preview live
  // while the save behind it is debounced, so a slow drag is one write.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const colorsQuery = useQuery({
    queryKey: ["sceneColors", projectId],
    queryFn: () => api.listSceneColors(projectId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["sceneColors", projectId] });
  };

  const saveMutation = useMutation({
    mutationFn: ({ stateKey, colors }: { stateKey: string; colors: Draft }) =>
      api.setSceneColor(projectId, stateKey, colors),
    onSuccess: invalidate,
  });

  // Resetting drops the draft as well — otherwise the input would keep showing
  // the colour that was just thrown away.
  const resetMutation = useMutation({
    mutationFn: (stateKey: string) => api.resetSceneColor(projectId, stateKey),
    onSuccess: (_data, stateKey) => {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[stateKey];
        return next;
      });
      invalidate();
    },
  });

  const resetAllMutation = useMutation({
    mutationFn: () => api.resetAllSceneColors(projectId),
    onSuccess: () => {
      setDrafts({});
      invalidate();
    },
  });

  const debouncedSave = useDebouncedSave((stateKey: string, colors: Draft) => {
    saveMutation.mutate({ stateKey, colors });
  });

  const byKey = new Map((colorsQuery.data ?? []).map((color) => [color.stateKey, color]));

  const shown = (stateKey: string): SceneColor | undefined => {
    const stored = byKey.get(stateKey);
    const draft = drafts[stateKey];
    return stored && draft ? { ...stored, ...draft } : stored;
  };

  const onColorChange = (color: SceneColor, field: keyof Draft, value: string) => {
    const next: Draft = {
      backgroundColor: color.backgroundColor,
      textColor: color.textColor,
      [field]: value,
    };
    setDrafts((prev) => ({ ...prev, [color.stateKey]: next }));
    debouncedSave(color.stateKey, color.stateKey, next);
  };

  const stateLabel = (state: SceneColorState) =>
    `${state.intExt.map((side) => t(`sceneState.intExt.${side}`)).join("+")} · ${t(
      `sceneState.timeOfDay.${state.timeOfDay}`,
    )}`;

  const customCount = (colorsQuery.data ?? []).filter((color) => color.isCustom).length;

  if (colorsQuery.isError) {
    return <p className="text-danger">{t("settings.color.error")}</p>;
  }

  return (
    <>
      <p className="text-body-secondary small">{t("settings.color.intro")}</p>

      {GROUPS.map((group) => (
        <div key={group.key} className="card mb-3">
          <div className="card-header fw-semibold">
            {group.intExt.map((side) => t(`sceneState.intExt.${side}`)).join("+")}
          </div>
          <ul className="list-group list-group-flush">
            {group.states.map((state) => {
              const color = shown(state.key);
              if (!color) return null;
              return (
                <li key={state.key} className="list-group-item d-flex align-items-center gap-3">
                  {/* The row's own colours, on its own label — the only honest
                      preview of what the Scene will look like. */}
                  <span
                    className="scene-color-preview"
                    style={{ background: color.backgroundColor, color: color.textColor }}
                  >
                    {stateLabel(state)}
                  </span>

                  <label className="scene-color-field">
                    <span className="text-body-secondary small">
                      {t("settings.color.background")}
                    </span>
                    <input
                      type="color"
                      className="form-control form-control-color form-control-sm"
                      value={color.backgroundColor}
                      onChange={(e) => onColorChange(color, "backgroundColor", e.target.value)}
                    />
                  </label>

                  <label className="scene-color-field">
                    <span className="text-body-secondary small">{t("settings.color.text")}</span>
                    <input
                      type="color"
                      className="form-control form-control-color form-control-sm"
                      value={color.textColor}
                      onChange={(e) => onColorChange(color, "textColor", e.target.value)}
                    />
                  </label>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary ms-auto text-nowrap"
                    disabled={!color.isCustom}
                    title={t("settings.color.reset")}
                    onClick={() => resetMutation.mutate(state.key)}
                  >
                    {t("settings.color.resetShort")}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        disabled={customCount === 0}
        onClick={() => {
          if (window.confirm(t("settings.color.resetAllConfirm", { amount: customCount }))) {
            resetAllMutation.mutate();
          }
        }}
      >
        {t("settings.color.resetAll")}
      </button>
    </>
  );
}
