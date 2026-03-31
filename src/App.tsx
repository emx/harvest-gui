import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { StatusBar } from "@/components/StatusBar";
import { Dashboard } from "@/components/Dashboard";
import { History } from "@/components/History";
import { Active } from "@/components/Active";
import { Health } from "@/components/Health";
import { Settings } from "@/components/Settings";
import { useAppStore, type View } from "@/store";
import "./App.css";

const views: Record<View, React.ComponentType> = {
  dashboard: Dashboard,
  active: Active,
  history: History,
  health: Health,
  settings: Settings,
};

function App() {
  const activeView = useAppStore((s) => s.activeView);
  const ViewComponent = views[activeView];

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
