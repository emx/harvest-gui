import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CheckCircle, XCircle, RefreshCw, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTailLog } from "@/queries";
import { AssetFetcher } from "@/components/AssetFetcher";

export function Health() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-lg font-semibold text-slate-100">Health</h2>
      <ConnectionTest />
      <LogViewer />
      <AssetFetcher />
    </div>
  );
}

function ConnectionTest() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function test() {
    setStatus("loading");
    try {
      await invoke<string[]>("list_assets");
      setStatus("ok");
      setMessage("Connected to Canopy API");
    } catch (e) {
      setStatus("error");
      setMessage(`${e}`);
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Connection Test
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={test}
          disabled={status === "loading"}
          className="border-white/[0.08] hover:bg-white/[0.03]"
        >
          <RefreshCw
            className={`size-3.5 ${status === "loading" ? "animate-spin" : ""}`}
            data-icon="inline-start"
          />
          {status === "loading" ? "Testing..." : "Test Connection"}
        </Button>
        {status === "ok" && (
          <span className="flex items-center gap-1.5 text-sm text-teal-400">
            <CheckCircle className="size-4" />
            {message}
          </span>
        )}
        {status === "error" && (
          <span className="flex items-center gap-1.5 text-sm text-red-400">
            <XCircle className="size-4" />
            {message}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

function LogViewer() {
  const { data: lines, isLoading, error } = useTailLog(100);
  const [filter, setFilter] = useState("");

  const filtered = lines?.filter((l) =>
    filter ? l.toLowerCase().includes(filter.toLowerCase()) : true
  );

  return (
    <Card className="glass-card">
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
                <div key={i} className="text-slate-300">
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
