import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Play, Square } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHarvestStatus } from "@/queries";
import { useAppStore } from "@/store";

const MAX_LOG_LINES = 1000;

interface LogEntry {
  line: string;
  stream: string;
  timestamp: string;
}

export function Active() {
  const { data: status, refetch } = useHarvestStatus();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const harvestFlags = useAppStore((s) => s.harvestFlags);
  const setHarvestFlags = useAppStore((s) => s.setHarvestFlags);

  const running = status?.running ?? false;

  useEffect(() => {
    const unlisten = listen<LogEntry>("harvest-log", (event) => {
      setLogs((prev) => {
        const next = [...prev, event.payload];
        return next.length > MAX_LOG_LINES ? next.slice(-MAX_LOG_LINES) : next;
      });
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Poll status to detect when process exits on its own
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetch]);

  async function handleStart() {
    setStarting(true);
    setLogs([]);
    try {
      await invoke("start_harvest", {
        flags: {
          once: harvestFlags.once || null,
          use_aria2: harvestFlags.useAria2 || null,
          parallel: harvestFlags.parallel > 1 ? harvestFlags.parallel : null,
          verbose: harvestFlags.verbose || null,
        },
      });
      refetch();
    } catch (e) {
      setLogs((prev) => [
        ...prev,
        { line: `Error: ${e}`, stream: "stderr", timestamp: "" },
      ]);
    } finally {
      setStarting(false);
    }
  }

  async function handleStop() {
    setStopping(true);
    try {
      await invoke("stop_harvest");
      refetch();
    } catch (e) {
      setLogs((prev) => [
        ...prev,
        { line: `Error: ${e}`, stream: "stderr", timestamp: "" },
      ]);
    } finally {
      setStopping(false);
    }
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Active Process</h2>
        <Badge
          variant={running ? "default" : "secondary"}
          className={
            running
              ? "bg-green-600/20 text-green-400 border-green-600/30"
              : ""
          }
        >
          {running ? "Running" : "Stopped"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={harvestFlags.once}
                onChange={(e) => setHarvestFlags({ once: e.target.checked })}
                disabled={running}
                className="accent-primary"
              />
              --once
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={harvestFlags.useAria2}
                onChange={(e) =>
                  setHarvestFlags({ useAria2: e.target.checked })
                }
                disabled={running}
                className="accent-primary"
              />
              --use-aria2
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={harvestFlags.verbose}
                onChange={(e) =>
                  setHarvestFlags({ verbose: e.target.checked })
                }
                disabled={running}
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
                  setHarvestFlags({
                    parallel: parseInt(e.target.value) || 1,
                  })
                }
                disabled={running}
                className="h-7 w-16 rounded border border-input bg-background px-2 text-sm"
              />
            </label>
          </div>

          <div className="flex gap-2">
            {!running ? (
              <Button onClick={handleStart} disabled={starting} size="sm">
                <Play className="size-4" data-icon="inline-start" />
                {starting ? "Starting..." : "Start Harvest"}
              </Button>
            ) : (
              <Button
                onClick={handleStop}
                disabled={stopping}
                variant="destructive"
                size="sm"
              >
                <Square className="size-4" data-icon="inline-start" />
                {stopping ? "Stopping..." : "Stop Harvest"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Live Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={logRef}
            className="h-80 overflow-y-auto rounded bg-black/50 p-3 font-mono text-xs leading-5"
          >
            {logs.length === 0 ? (
              <span className="text-muted-foreground">
                No log output yet. Start harvest to see live logs.
              </span>
            ) : (
              logs.map((entry, i) => (
                <div
                  key={i}
                  className={
                    entry.stream === "stderr"
                      ? "text-red-400"
                      : "text-foreground"
                  }
                >
                  {entry.line}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
