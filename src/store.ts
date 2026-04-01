import { create } from "zustand";

export type View = "dashboard" | "active" | "history" | "health" | "settings";

export interface HarvestFlags {
  once: boolean;
  verbose: boolean;
  include: string;
  exclude: string;
}

export interface LogEntry {
  line: string;
  stream: string;
  timestamp: string;
}

const MAX_LOG_LINES = 1000;

interface AppState {
  activeView: View;
  setActiveView: (view: View) => void;
  harvestFlags: HarvestFlags;
  setHarvestFlags: (flags: Partial<HarvestFlags>) => void;
  selectedCollectId: string | null;
  setSelectedCollectId: (id: string | null) => void;
  harvestLogs: LogEntry[];
  addHarvestLog: (entry: LogEntry) => void;
  clearHarvestLogs: () => void;
}

/** Serialize HarvestFlags for the Rust invoke call */
export function serializeFlags(flags: HarvestFlags) {
  return {
    once: flags.once || null,
    include: flags.include || null,
    exclude: flags.exclude || null,
    verbose: flags.verbose || null,
  };
}

export const useAppStore = create<AppState>((set) => ({
  activeView: "dashboard",
  setActiveView: (view) => set({ activeView: view }),
  harvestFlags: {
    once: false,
    verbose: false,
    include: "",
    exclude: "",
  },
  setHarvestFlags: (flags) =>
    set((state) => ({
      harvestFlags: { ...state.harvestFlags, ...flags },
    })),
  selectedCollectId: null,
  setSelectedCollectId: (id) => set({ selectedCollectId: id }),
  harvestLogs: [],
  addHarvestLog: (entry) =>
    set((state) => {
      const next = [...state.harvestLogs, entry];
      return { harvestLogs: next.length > MAX_LOG_LINES ? next.slice(-MAX_LOG_LINES) : next };
    }),
  clearHarvestLogs: () => set({ harvestLogs: [] }),
}));
