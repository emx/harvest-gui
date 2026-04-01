import { useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHarvestStatus, useTailAppLog, useCanopyDirCheck, useAria2Check } from "@/queries";
import { useAppStore } from "@/store";
import { AssetFetcher } from "@/components/AssetFetcher";
import { LogLine } from "@/components/LogLine";

function HealthIndicator({
  label,
  ok,
  loading,
  statusText,
}: {
  label: string;
  ok: boolean | null;
  loading?: boolean;
  statusText: string;
}) {
  const dotColor =
    ok === true ? "bg-teal-500" : ok === false ? "bg-red-400" : "bg-slate-500";
  const textColor =
    ok === true ? "text-teal-400" : ok === false ? "text-red-400" : "text-slate-400";

  return (
    <Card className="glass-card border-t-2 border-t-teal-500/40">
      <CardContent className="flex items-center gap-3 pt-5 pb-4">
        {loading ? (
          <Skeleton className="size-3 rounded-full" />
        ) : (
          <span className={`inline-block size-3 rounded-full ${dotColor}`} />
        )}
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            {label}
          </p>
          <p className={`text-sm ${textColor}`}>
            {loading ? "Checking..." : statusText}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

const ERROR_PATTERNS = [
  /ERROR\s+harvest\.poller/i,
  /ERROR\s+harvest\.canopyauth/i,
  /HTTP\s+4\d\d/i,
  /rate_limit/i,
];

const SUCCESS_PATTERNS = [
  /Token acquired/i,
  /Found.*item/i,
  /Poll cycle/i,
];

function inferApiStatus(
  running: boolean,
  logs: { line: string }[]
): { ok: boolean | null; text: string } {
  if (!running) return { ok: null, text: "Not running" };

  const recent = logs.slice(-50);

  // Scan from most recent backwards
  for (let i = recent.length - 1; i >= 0; i--) {
    const line = recent[i].line;
    for (const pat of ERROR_PATTERNS) {
      if (pat.test(line)) {
        // Extract a short error snippet
        const snippet = line.length > 60 ? line.slice(0, 60) + "…" : line;
        return { ok: false, text: snippet };
      }
    }
    for (const pat of SUCCESS_PATTERNS) {
      if (pat.test(line)) return { ok: true, text: "OK" };
    }
  }

  return { ok: null, text: "Waiting for poll..." };
}

function HealthIndicators() {
  const { data: harvestStatus, isLoading: harvestLoading } = useHarvestStatus();
  const { data: canopyOk, isLoading: canopyLoading } = useCanopyDirCheck();
  const { data: aria2Ok, isLoading: aria2Loading } = useAria2Check();
  const harvestLogs = useAppStore((s) => s.harvestLogs);

  const running = harvestStatus?.running ?? false;
  const apiStatus = inferApiStatus(running, harvestLogs);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
      <HealthIndicator
        label="Canopy API"
        ok={apiStatus.ok}
        statusText={apiStatus.text}
      />
      <HealthIndicator
        label="Aria2 RPC"
        ok={aria2Ok ?? false}
        loading={aria2Loading}
        statusText={aria2Ok ? "Connected" : "Not reachable"}
      />
    </div>
  );
}

function AppDiagnostics() {
  const { data: lines, isLoading, error } = useTailAppLog(100);
  const [filter, setFilter] = useState("");

  const filtered = lines?.filter((l) =>
    filter ? l.toLowerCase().includes(filter.toLowerCase()) : true
  );

  return (
    <Card className="glass-card border-t-2 border-t-teal-500/40">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          App Diagnostics
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
                <LogLine key={i} line={line} index={i} format="app" />
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
      <AppDiagnostics />
      <AssetFetcher />
    </div>
  );
}
