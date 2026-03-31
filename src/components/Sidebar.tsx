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
    <aside
      className="flex w-48 flex-col gap-0.5 border-r border-white/[0.05] p-2"
      style={{ background: "oklch(0.129 0.014 264)" }}
    >
      {navItems.map(({ view, label, icon: Icon }) => (
        <button
          key={view}
          onClick={() => setActiveView(view)}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors relative",
            activeView === view
              ? "text-teal-400"
              : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-300"
          )}
          style={
            activeView === view
              ? { background: "oklch(0.704 0.14 181 / 10%)" }
              : undefined
          }
        >
          {activeView === view && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-teal-500" />
          )}
          <Icon
            className={cn(
              "size-4",
              activeView === view && "text-teal-400 drop-shadow-[0_0_6px_oklch(0.704_0.14_181_/_50%)]"
            )}
          />
          {label}
        </button>
      ))}
    </aside>
  );
}
