import {
  CHROME_COLOR_TARGETS,
  type ColorTarget,
  SCENE_COLOR_STATES,
  type SceneColorState,
} from "@komparsen/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { api, type ColorSetting } from "../api.js";
import { useDebouncedSave } from "../useDebouncedSave.js";

interface Draft {
  backgroundColor: string;
  textColor: string;
}

// Int, Ext and the combination each get their own card — the same three rows the
// brief draws, and the same card-plus-list-group shape the category groups use.
const SCENE_GROUPS: { key: string; intExt: string[]; states: SceneColorState[] }[] = [];
for (const state of SCENE_COLOR_STATES) {
  const key = state.intExt.join("+");
  const group = SCENE_GROUPS.find((g) => g.key === key);
  if (group) group.states.push(state);
  else SCENE_GROUPS.push({ key, intExt: state.intExt, states: [state] });
}

export function SettingsColorsPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  // The colour input fires on every drag step. Drafts keep the preview live
  // while the save behind it is debounced, so a slow drag is one write.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const colorsQuery = useQuery({
    queryKey: ["colorSettings", projectId],
    queryFn: () => api.listColorSettings(projectId!),
    enabled: !!projectId,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["colorSettings", projectId] });
  };

  const saveMutation = useMutation({
    mutationFn: ({ key, colors }: { key: string; colors: Draft }) =>
      api.setColorSetting(projectId!, key, colors),
    onSuccess: invalidate,
  });

  // Resetting drops the draft as well — otherwise the input would keep showing
  // the colour that was just thrown away.
  const resetMutation = useMutation({
    mutationFn: (key: string) => api.resetColorSetting(projectId!, key),
    onSuccess: (_data, key) => {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      invalidate();
    },
  });

  const resetAllMutation = useMutation({
    mutationFn: () => api.resetAllColorSettings(projectId!),
    onSuccess: () => {
      setDrafts({});
      invalidate();
    },
  });

  const debouncedSave = useDebouncedSave((key: string, colors: Draft) => {
    saveMutation.mutate({ key, colors });
  });

  const byKey = new Map((colorsQuery.data ?? []).map((color) => [color.key, color]));

  const shown = (key: string): ColorSetting | undefined => {
    const stored = byKey.get(key);
    const draft = drafts[key];
    return stored && draft ? { ...stored, ...draft } : stored;
  };

  const onColorChange = (color: ColorSetting, field: keyof Draft, value: string) => {
    const next: Draft = {
      backgroundColor: color.backgroundColor,
      textColor: color.textColor,
      [field]: value,
    };
    setDrafts((prev) => ({ ...prev, [color.key]: next }));
    debouncedSave(color.key, color.key, next);
  };

  const sceneLabel = (state: SceneColorState) =>
    `${state.intExt.map((side) => t(`colorTarget.intExt.${side}`)).join("+")} · ${t(
      `colorTarget.timeOfDay.${state.timeOfDay}`,
    )}`;

  const customCount = (colorsQuery.data ?? []).filter((color) => color.isCustom).length;

  function ColorRow({ target, label }: { target: ColorTarget; label: string }) {
    const color = shown(target.key);
    if (!color) return null;
    return (
      <li className="list-group-item d-flex align-items-center gap-3">
        {/* The row's own colours, on its own label — the only honest preview of
            what the grid will look like. */}
        <span
          className="scene-color-preview"
          style={{ background: color.backgroundColor, color: color.textColor }}
        >
          {label}
        </span>

        <label className="scene-color-field">
          <span className="text-body-secondary small">{t("settings.color.background")}</span>
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
          onClick={() => resetMutation.mutate(target.key)}
        >
          {t("settings.color.resetShort")}
        </button>
      </li>
    );
  }

  if (!projectId) return null;
  if (colorsQuery.isError) {
    return <p className="text-danger">{t("settings.color.error")}</p>;
  }

  return (
    <>
      <p className="text-body-secondary small">{t("settings.color.intro")}</p>

      {/* The frame comes first: it is what a reader's eye lands on before any
          single Scene, and it sets the tone the states have to sit in. */}
      <div className="card mb-3">
        <div className="card-header fw-semibold">{t("settings.color.chrome")}</div>
        <ul className="list-group list-group-flush">
          {CHROME_COLOR_TARGETS.map((target) => (
            <ColorRow key={target.key} target={target} label={t(`colorTarget.chrome.${target.key}`)} />
          ))}
        </ul>
      </div>

      {SCENE_GROUPS.map((group) => (
        <div key={group.key} className="card mb-3">
          <div className="card-header fw-semibold">
            {group.intExt.map((side) => t(`colorTarget.intExt.${side}`)).join("+")}
          </div>
          <ul className="list-group list-group-flush">
            {group.states.map((state) => (
              <ColorRow key={state.key} target={state} label={sceneLabel(state)} />
            ))}
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
