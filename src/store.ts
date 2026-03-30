import { create } from "zustand";

export type View = "dashboard" | "active" | "history" | "health" | "settings";

export interface HarvestFlags {
  once: boolean;
  useAria2: boolean;
  verbose: boolean;
  parallel: number;
}

interface AppState {
  activeView: View;
  setActiveView: (view: View) => void;
  harvestFlags: HarvestFlags;
  setHarvestFlags: (flags: Partial<HarvestFlags>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: "dashboard",
  setActiveView: (view) => set({ activeView: view }),
  harvestFlags: {
    once: false,
    useAria2: false,
    verbose: false,
    parallel: 1,
  },
  setHarvestFlags: (flags) =>
    set((state) => ({
      harvestFlags: { ...state.harvestFlags, ...flags },
    })),
}));
