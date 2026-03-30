import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { History } from "@/components/History";
import { Active } from "@/components/Active";
import { Health } from "@/components/Health";
import { useAppStore, type View } from "@/store";
import "./App.css";

function PlaceholderView({ name }: { name: string }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-muted-foreground">{name} — Coming soon</p>
    </div>
  );
}

const views: Record<View, React.ComponentType> = {
  dashboard: Dashboard,
  active: Active,
  history: History,
  health: Health,
  settings: () => <PlaceholderView name="Settings" />,
};

function App() {
  const activeView = useAppStore((s) => s.activeView);
  const ViewComponent = views[activeView];

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <ViewComponent />
        </main>
      </div>
    </div>
  );
}

export default App;
