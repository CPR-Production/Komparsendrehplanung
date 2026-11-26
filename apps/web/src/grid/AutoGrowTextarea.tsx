import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";
import { useStripSize } from "../stripSize.js";

/* Ein Feld, dessen Zeile mitwächst. Gebraucht wird es, wo der Inhalt jederzeit
   ganz lesbar bleiben muss: ein <input> bricht grundsätzlich nicht um, und ein
   gesperrtes Feld lässt sich nicht scrollen — der Rest eines langen Namens wäre
   also schlicht nicht erreichbar.

   Das Feld muss sich selbst messen, weil in der Kette nichts anderes eine Höhe
   kennt: die Zeilenhöhe kommt von der Zelle, die Zelle vom Feld. Erst `auto`,
   dann `scrollHeight` — ohne das Zurücksetzen bliebe die Höhe beim bisherigen
   Maximum stehen, wenn Text gelöscht wird. Die Ränder kommen dazu, weil
   `box-sizing: border-box` die gesetzte Höhe als Außenmaß liest, scrollHeight
   aber ein Innenmaß ist. */
export function AutoGrowTextarea({
  value,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // Die Strip Size ändert Schriftgröße und Polsterung der Zelle, also auch die
  // Zahl der Zeilen, die derselbe Text braucht. Ohne sie in den Abhängigkeiten
  // behielte das Feld beim Umschalten die Höhe der alten Größe.
  const { stripSize } = useStripSize();

  useLayoutEffect(() => {
    const field = ref.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight + field.offsetHeight - field.clientHeight}px`;
  }, [value, stripSize]);

  return <textarea ref={ref} rows={1} value={value} {...rest} />;
}
