import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { StatusBar } from "@/components/StatusBar";
import { ConfigGuard } from "@/components/ConfigGuard";
import { Dashboard } from "@/components/Dashboard";
import { History } from "@/components/History";
import { Active } from "@/components/Active";
import { Health } from "@/components/Health";
import { Settings } from "@/components/Settings";
import { useAppStore, type View } from "@/store";
import { useResolvedConfig } from "@/queries";
import "./App.css";

function guarded(Component: React.ComponentType) {
  return function GuardedView() {
    return (
      <ConfigGuard>
        <Component />
      </ConfigGuard>
    );
  };
}

const views: Record<View, React.ComponentType> = {
  dashboard: guarded(Dashboard),
  active: guarded(Active),
  history: guarded(History),
  health: guarded(Health),
  settings: Settings,
};

function App() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const ViewComponent = views[activeView];

  const { data: resolved } = useResolvedConfig();

  // First-launch: if no config values are set, redirect to Settings
  useEffect(() => {
    if (!resolved) return;
    const allMissing = resolved.every((e) => e.status === "missing");
    if (allMissing) {
      setActiveView("settings");
    }
  }, [resolved, setActiveView]);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-grid-dots">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ViewComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
