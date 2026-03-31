import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useResolvedConfig } from "@/queries";
import { useAppStore } from "@/store";

const CRITICAL_FIELDS = ["CANOPY_CLIENT_ID", "CANOPY_CLIENT_SECRET", "CANOPY_ORG_ID", "CANOPY_LOCAL_DIR"];

export function ConfigGuard({ children }: { children: React.ReactNode }) {
  const { data: resolved, isLoading } = useResolvedConfig();
  const setActiveView = useAppStore((s) => s.setActiveView);

  if (isLoading) return <>{children}</>;

  const missing = resolved?.filter(
    (e) => CRITICAL_FIELDS.includes(e.name) && e.status === "missing"
  );

  if (missing && missing.length > 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="text-center space-y-4 max-w-md">
          <Settings className="size-10 text-slate-500 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-200">
            Configuration Incomplete
          </h3>
          <p className="text-sm text-slate-400">
            Set up your Canopy credentials and data directory in Settings to get
            started.
          </p>
          <p className="text-xs text-slate-500 font-mono">
            Missing: {missing.map((e) => e.name.replace("CANOPY_", "")).join(", ")}
          </p>
          <Button
            onClick={() => setActiveView("settings")}
            size="sm"
            className="bg-teal-600 text-white hover:bg-teal-500"
          >
            Open Settings
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
