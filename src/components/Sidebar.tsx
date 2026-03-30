import {
  LayoutDashboard,
  Activity,
  History,
  HeartPulse,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore, type View } from "@/store";

const navItems: { view: View; label: string; icon: React.ElementType }[] = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "active", label: "Active", icon: Activity },
  { view: "history", label: "History", icon: History },
  { view: "health", label: "Health", icon: HeartPulse },
  { view: "settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);

  return (
    <aside className="flex w-48 flex-col gap-1 border-r border-border p-2">
      {navItems.map(({ view, label, icon: Icon }) => (
        <button
          key={view}
          onClick={() => setActiveView(view)}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            activeView === view
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </aside>
  );
}
