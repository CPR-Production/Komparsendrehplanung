// Custom drag payload types keep a Scene drag from being accepted as a Set drop
// (and vice versa). The HTML5 DnD spec lowercases type strings, so these must
// already be lowercase to survive the round trip through dataTransfer.
export const SCENE_DRAG_TYPE = "application/x-komparsen-scene";
export const SET_DRAG_TYPE = "application/x-komparsen-set";

// Moves `draggedId` to sit immediately before `targetId` in the list.
// Used to translate a native HTML5 drag-and-drop drop event into a new id order.
export function moveBefore(ids: string[], draggedId: string, targetId: string): string[] {
  if (draggedId === targetId) return ids;
  const without = ids.filter((id) => id !== draggedId);
  const targetIndex = without.indexOf(targetId);
  if (targetIndex === -1) return ids;
  return [...without.slice(0, targetIndex), draggedId, ...without.slice(targetIndex)];
}
