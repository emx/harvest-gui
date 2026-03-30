import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Play, Square } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHarvestStatus } from "@/queries";

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

  // Flag controls
  const [once, setOnce] = useState(false);
  const [useAria2, setUseAria2] = useState(false);
  const [verbose, setVerbose] = useState(false);
  const [parallel, setParallel] = useState<number>(1);

  const running = status?.running ?? false;

  useEffect(() => {
    const unlisten = listen<LogEntry>("harvest-log", (event) => {
      setLogs((prev) => [...prev, event.payload]);
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
          once: once || null,
          use_aria2: useAria2 || null,
          parallel: parallel > 1 ? parallel : null,
          verbose: verbose || null,
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
                checked={once}
                onChange={(e) => setOnce(e.target.checked)}
                disabled={running}
                className="accent-primary"
              />
              --once
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useAria2}
                onChange={(e) => setUseAria2(e.target.checked)}
                disabled={running}
                className="accent-primary"
              />
              --use-aria2
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={verbose}
                onChange={(e) => setVerbose(e.target.checked)}
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
                value={parallel}
                onChange={(e) => setParallel(parseInt(e.target.value) || 1)}
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
