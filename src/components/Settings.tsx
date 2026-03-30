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
    return <p className="text-sm text-destructive">{error.message}</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
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
                <span className="text-sm text-muted-foreground">
                  {entry.name}
                </span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      entry.status === "set" ? "default" : "destructive"
                    }
                    className={
                      entry.status === "set"
                        ? "bg-green-600/20 text-green-400 border-green-600/30"
                        : ""
                    }
                  >
                    {entry.status}
                  </Badge>
                  {entry.status === "set" && (
                    <span className="font-mono text-sm">{displayValue}</span>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Harvest Flag Defaults
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={harvestFlags.once}
              onChange={(e) => setHarvestFlags({ once: e.target.checked })}
              className="accent-primary"
            />
            --once
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={harvestFlags.useAria2}
              onChange={(e) => setHarvestFlags({ useAria2: e.target.checked })}
              className="accent-primary"
            />
            --use-aria2
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={harvestFlags.verbose}
              onChange={(e) => setHarvestFlags({ verbose: e.target.checked })}
              className="accent-primary"
            />
            --verbose
          </label>
          <label className="flex items-center gap-2 text-sm">
            --parallel
            <input
              type="number"
              min={1}
              max={32}
              value={harvestFlags.parallel}
              onChange={(e) =>
                setHarvestFlags({ parallel: parseInt(e.target.value) || 1 })
              }
              className="h-7 w-16 rounded border border-input bg-background px-2 text-sm"
            />
          </label>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">
              --include (extensions)
            </span>
            <input
              type="text"
              value={harvestFlags.include}
              onChange={(e) => setHarvestFlags({ include: e.target.value })}
              placeholder="e.g. .tif,.json"
              className="h-8 w-full rounded border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">
              --exclude (extensions)
            </span>
            <input
              type="text"
              value={harvestFlags.exclude}
              onChange={(e) => setHarvestFlags({ exclude: e.target.value })}
              placeholder="e.g. .xml,.html"
              className="h-8 w-full rounded border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>

        <p className="text-xs text-muted-foreground">
          These defaults are used by the Start Poll button and Active view
          controls.
        </p>
      </CardContent>
    </Card>
  );
}

function AppInfo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">App Info</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">App Version</span>
            <span className="font-mono">0.1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Framework</span>
            <span className="font-mono">Tauri 2</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Harvest CLI</span>
            <span className="font-mono text-xs">
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
      <h2 className="text-lg font-semibold">Settings</h2>
      <ConfigDisplay />
      <FlagEditor />
      <AppInfo />
    </div>
  );
}
