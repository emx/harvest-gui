import { create } from "zustand";

export type View = "dashboard" | "active" | "history" | "health" | "settings";

interface AppState {
  activeView: View;
  setActiveView: (view: View) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: "dashboard",
  setActiveView: (view) => set({ activeView: view }),
}));
