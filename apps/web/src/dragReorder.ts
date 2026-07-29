// Moves `draggedId` to sit immediately before `targetId` in the list.
// Used to translate a native HTML5 drag-and-drop drop event into a new id order.
export function moveBefore(ids: string[], draggedId: string, targetId: string): string[] {
  if (draggedId === targetId) return ids;
  const without = ids.filter((id) => id !== draggedId);
  const targetIndex = without.indexOf(targetId);
  if (targetIndex === -1) return ids;
  return [...without.slice(0, targetIndex), draggedId, ...without.slice(targetIndex)];
}
