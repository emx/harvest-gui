import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useConfig } from "@/queries";
import { useAppStore } from "@/store";

function ConfigDisplay() {
  const { data, isLoading, error } = useConfig();

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (error)
    return <p className="text-sm text-red-400">{error.message}</p>;

  return (
    <Card className="glass-card border-t-2 border-t-teal-500/40">
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Environment Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data?.map((entry) => {
            const displayValue =
              entry.name === "CANOPY_CLIENT_ID" && entry.status === "set"
                ? `****${entry.value.slice(-4)}`
                : entry.value;

            return (
              <div
                key={entry.name}
                className="flex items-center justify-between"
              >
                <span className="text-sm font-mono text-slate-400">
                  {entry.name}
                </span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={
                      entry.status === "set"
                        ? "bg-teal-500/20 text-teal-400 border-teal-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                    }
                  >
                    {entry.status}
                  </Badge>
                  {entry.status === "set" && (
                    <span className="font-mono text-sm text-slate-300">
                      {displayValue}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function FlagEditor() {
  const harvestFlags = useAppStore((s) => s.harvestFlags);
  const setHarvestFlags = useAppStore((s) => s.setHarvestFlags);

  return (
    <Card className="glass-card border-t-2 border-t-teal-500/40">
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Harvest Flag Defaults
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={harvestFlags.once}
              onChange={(e) => setHarvestFlags({ once: e.target.checked })}
              className="accent-teal-500"
            />
            --once
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={harvestFlags.verbose}
              onChange={(e) => setHarvestFlags({ verbose: e.target.checked })}
              className="accent-teal-500"
            />
            --verbose
          </label>
        </div>

        <Separator className="bg-white/[0.05]" />

        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
              --include (extensions)
            </span>
            <input
              type="text"
              value={harvestFlags.include}
              onChange={(e) => setHarvestFlags({ include: e.target.value })}
              placeholder="e.g. .tif,.json"
              className="h-8 w-full rounded border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
              --exclude (extensions)
            </span>
            <input
              type="text"
              value={harvestFlags.exclude}
              onChange={(e) => setHarvestFlags({ exclude: e.target.value })}
              placeholder="e.g. .xml,.html"
              className="h-8 w-full rounded border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            />
          </label>
        </div>

        <p className="text-xs text-slate-500">
          These defaults are used by the Start Poll button and Active view
          controls.
        </p>
      </CardContent>
    </Card>
  );
}

function AppInfo() {
  return (
    <Card className="glass-card border-t-2 border-t-teal-500/40">
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          App Info
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">App Version</span>
            <span className="font-mono text-slate-300">0.1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Framework</span>
            <span className="font-mono text-slate-300">Tauri 2</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Harvest CLI</span>
            <span className="font-mono text-xs text-slate-300">
              uv run python -m harvest
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Settings() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-lg font-semibold text-slate-100">Settings</h2>
      <ConfigDisplay />
      <FlagEditor />
      <AppInfo />
    </div>
  );
}
