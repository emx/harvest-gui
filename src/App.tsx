import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { History } from "@/components/History";
import { useAppStore } from "@/store";
import "./App.css";

function PlaceholderView({ name }: { name: string }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-muted-foreground">{name} — Coming soon</p>
    </div>
  );
}

function App() {
  const activeView = useAppStore((s) => s.activeView);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {activeView === "dashboard" && <Dashboard />}
          {activeView === "history" && <History />}
          {activeView !== "dashboard" && activeView !== "history" && (
            <PlaceholderView name={activeView.charAt(0).toUpperCase() + activeView.slice(1)} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
