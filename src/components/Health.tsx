import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RefreshCw, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHarvestStatus, useTailLog, useCanopyDirCheck } from "@/queries";
import { AssetFetcher } from "@/components/AssetFetcher";

function HealthIndicator({
  label,
  ok,
  loading,
  statusText,
}: {
  label: string;
  ok: boolean;
  loading?: boolean;
  statusText: string;
}) {
  return (
    <Card className="glass-card border-t-2 border-t-teal-500/40">
      <CardContent className="flex items-center gap-3 pt-5 pb-4">
        {loading ? (
          <Skeleton className="size-3 rounded-full" />
        ) : (
          <span
            className={`inline-block size-3 rounded-full ${
              ok ? "bg-teal-500" : "bg-red-400"
            }`}
          />
        )}
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            {label}
          </p>
          <p className={`text-sm ${ok ? "text-teal-400" : "text-red-400"}`}>
            {loading ? "Checking..." : statusText}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthIndicators() {
  const { data: harvestStatus, isLoading: harvestLoading } = useHarvestStatus();
  const { data: canopyOk, isLoading: canopyLoading } = useCanopyDirCheck();

  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  async function checkApi() {
    setApiLoading(true);
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 10_000)
      );
      await Promise.race([invoke<string[]>("list_assets"), timeout]);
      setApiOk(true);
      setApiError("");
    } catch (e) {
      setApiOk(false);
      setApiError(`${e}`);
    } finally {
      setApiLoading(false);
    }
  }

  useEffect(() => {
    checkApi();
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      <HealthIndicator
        label="Daemon Running"
        ok={harvestStatus?.running ?? false}
        loading={harvestLoading}
        statusText={harvestStatus?.running ? "Active" : "Stopped"}
      />
      <HealthIndicator
        label="Canopy Reachable"
        ok={canopyOk ?? false}
        loading={canopyLoading}
        statusText={canopyOk ? "Directory accessible" : "Not accessible"}
      />
      <div className="relative">
        <HealthIndicator
          label="Canopy API"
          ok={apiOk ?? false}
          loading={apiLoading}
          statusText={apiOk ? "OK" : apiError || "Failed"}
        />
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={checkApi}
          disabled={apiLoading}
          className="absolute top-3 right-3"
        >
          <RefreshCw
            className={`size-3.5 text-slate-500 ${apiLoading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
    </div>
  );
}

function getLogLineColor(line: string): string {
  const upper = line.toUpperCase();
  if (upper.includes("ERROR") || upper.includes("CRITICAL"))
    return "text-red-400";
  if (upper.includes("WARNING")) return "text-amber-500";
  if (upper.includes("DEBUG")) return "text-slate-500";
  return "text-slate-300";
}

function LogViewer() {
  const { data: lines, isLoading, error } = useTailLog(100);
  const [filter, setFilter] = useState("");

  const filtered = lines?.filter((l) =>
    filter ? l.toLowerCase().includes(filter.toLowerCase()) : true
  );

  return (
    <Card className="glass-card border-t-2 border-t-teal-500/40">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Log Viewer
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-7 rounded-md border border-white/[0.08] bg-white/[0.03] pl-7 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : error ? (
          <p className="text-sm text-red-400">{error.message}</p>
        ) : (
          <div className="h-64 overflow-y-auto rounded bg-black/40 p-3 font-mono text-xs leading-5 border border-white/[0.05]">
            {!filtered || filtered.length === 0 ? (
              <span className="text-slate-500">
                {filter ? "No matching log lines" : "No log data"}
              </span>
            ) : (
              filtered.map((line, i) => (
                <div key={i} className={getLogLineColor(line)}>
                  {line}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Health() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-lg font-semibold text-slate-100">Health</h2>
      <HealthIndicators />
      <LogViewer />
      <AssetFetcher />
    </div>
  );
}
