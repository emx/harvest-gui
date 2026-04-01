import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHarvestStatus } from "@/queries";
import { useAppStore, serializeFlags } from "@/store";
import { AssetFetcher } from "@/components/AssetFetcher";
import { DownloadProgress } from "@/components/DownloadProgress";
import { LogLine } from "@/components/LogLine";

export function Active() {
  const { data: status, refetch } = useHarvestStatus();
  const [starting, setStarting] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const harvestFlags = useAppStore((s) => s.harvestFlags);
  const setHarvestFlags = useAppStore((s) => s.setHarvestFlags);
  const logs = useAppStore((s) => s.harvestLogs);
  const clearHarvestLogs = useAppStore((s) => s.clearHarvestLogs);

  const running = status?.running ?? false;

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  async function handleStart() {
    setStarting(true);
    clearHarvestLogs();
    try {
      await invoke("start_harvest", {
        flags: serializeFlags(harvestFlags),
      });
      refetch();
    } catch (e) {
      useAppStore.getState().addHarvestLog({ line: `Error: ${e}`, stream: "stderr", timestamp: "" });
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-100">
          Active Process
        </h2>
        <Badge
          variant="secondary"
          className={
            running
              ? "bg-teal-500/20 text-teal-400 border-teal-500/30"
              : "bg-slate-700/50 text-slate-400 border-slate-600/30"
          }
        >
          {running ? "Running" : "Stopped"}
        </Badge>
      </div>

      <Card className="glass-card border-t-2 border-t-teal-500/40">
        <CardHeader>
          <CardTitle className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={harvestFlags.once}
                onChange={(e) => setHarvestFlags({ once: e.target.checked })}
                disabled={running}
                className="accent-teal-500"
              />
              --once
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={harvestFlags.verbose}
                onChange={(e) =>
                  setHarvestFlags({ verbose: e.target.checked })
                }
                disabled={running}
                className="accent-teal-500"
              />
              --verbose
            </label>
          </div>

          {!running && (
            <div className="flex gap-2">
              <Button
                onClick={handleStart}
                disabled={starting}
                size="sm"
                className="bg-teal-600 text-white hover:bg-teal-500"
              >
                <Play className="size-4" data-icon="inline-start" />
                {starting ? "Starting..." : "Start Harvest"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AssetFetcher
        emptyText="Fetch list of available assets before starting a download"
        maxHeight="max-h-36"
      />

      <DownloadProgress enabled={running} />

      <Card className="glass-card border-t-2 border-t-teal-500/40">
        <CardHeader>
          <CardTitle className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            Live Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={logRef}
            className="h-80 overflow-y-auto rounded bg-black/40 p-3 font-mono text-xs leading-5 border border-white/[0.05]"
          >
            {logs.length === 0 ? (
              <span className="text-slate-500">
                No log output yet. Start harvest to see live logs.
              </span>
            ) : (
              logs.map((entry, i) => (
                <LogLine
                  key={i}
                  line={entry.line}
                  index={i}
                  format="harvest"
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
