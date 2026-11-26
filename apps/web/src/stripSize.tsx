import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "komparsen.stripSize";

/* Vier Stufen, von der engsten zur weitesten. Die Namen sind die der
   Streifenbreiten aus der Vorlage, deshalb bleiben sie in beiden Sprachen
   gleich und brauchen keinen t()-Schlüssel.

   XL ist die Größe, auf die das Grid vorher fest verdrahtet war; M ist die
   Vorgabe, weil der Plan am Set gelesen und nicht gelesen-und-vergrößert wird —
   wer tippt, nimmt XL, wer überblickt, geht nach unten. */
export const STRIP_SIZES = ["xs", "s", "m", "xl"] as const;

export type StripSize = (typeof STRIP_SIZES)[number];

const DEFAULT_STRIP_SIZE: StripSize = "m";

interface StripSizeValue {
  stripSize: StripSize;
  setStripSize: (size: StripSize) => void;
}

// Ohne Provider bleibt es bei der Vorgabe — eine fehlende Auswahl darf das Grid
// nicht unlesbar klein machen.
const StripSizeContext = createContext<StripSizeValue>({
  stripSize: DEFAULT_STRIP_SIZE,
  setStripSize: () => {},
});

export function useStripSize(): StripSizeValue {
  return useContext(StripSizeContext);
}

// Wie Sprache und Bearbeitungssperre: die Wahl überlebt das Neuladen, sonst
// kostet sie einen Klick pro Seitenaufruf. Alles Unbekannte fällt auf die
// Vorgabe zurück.
function storedStripSize(): StripSize {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return STRIP_SIZES.includes(value as StripSize) ? (value as StripSize) : DEFAULT_STRIP_SIZE;
  } catch {
    // Storage kann schlicht werfen, wenn er gesperrt ist (privates Fenster).
    return DEFAULT_STRIP_SIZE;
  }
}

export function StripSizeProvider({ children }: { children: ReactNode }) {
  const [stripSize, setStripSizeState] = useState(storedStripSize);
  const setStripSize = useCallback((size: StripSize) => setStripSizeState(size), []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, stripSize);
    } catch {
      // Nicht die Auswahl dafür kaputt machen — für diesen Seitenaufruf gilt sie.
    }
  }, [stripSize]);

  // Ein frisches Objekt pro Render würde das ganze Grid umsonst neu rendern.
  const value = useMemo(() => ({ stripSize, setStripSize }), [stripSize, setStripSize]);

  return <StripSizeContext.Provider value={value}>{children}</StripSizeContext.Provider>;
}
