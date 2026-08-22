import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "komparsen.editLock";

interface EditLockValue {
  locked: boolean;
  toggleLocked: () => void;
}

/* Interface only, deliberately: the API keeps accepting every write. What this
   guards against is the stray keystroke — the grid saves each field as it is
   typed, so a plan is writable the moment it is on screen — not against people.
   Whoever wants to edit is one click away (Issue #7).

   Without a provider above, the app is unlocked and behaves as it always did.
   Falling back to locked would sound safer and be worse: the toggle would be
   missing along with the provider, leaving a grid nobody can unlock. */
const EditLockContext = createContext<EditLockValue>({ locked: false, toggleLocked: () => {} });

export function useEditLock(): EditLockValue {
  return useContext(EditLockContext);
}

// A browser that has never unlocked starts locked; after that the last choice
// stands. It is remembered next to the language, so a stretch of editing costs
// one click and not one per reload — anything but a stored "unlocked" is locked.
function storedLock(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "unlocked";
  } catch {
    // Storage can throw outright when blocked (private mode, strict settings).
    return true;
  }
}

export function EditLockProvider({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(storedLock);
  const toggleLocked = useCallback(() => setLocked((prev) => !prev), []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locked ? "locked" : "unlocked");
    } catch {
      // Same as the language: not worth breaking the toggle over — the state
      // holds for this page load either way.
    }
  }, [locked]);

  // A fresh object on every render would re-render the whole grid for nothing.
  const value = useMemo(() => ({ locked, toggleLocked }), [locked, toggleLocked]);

  return <EditLockContext.Provider value={value}>{children}</EditLockContext.Provider>;
}
