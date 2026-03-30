import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CheckCircle, XCircle, RefreshCw, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTailLog } from "@/queries";

export function Health() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-lg font-semibold">Health</h2>
      <ConnectionTest />
      <LogViewer />
      <AssetList />
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
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={test}
          disabled={status === "loading"}
        >
          <RefreshCw
            className={`size-3.5 ${status === "loading" ? "animate-spin" : ""}`}
            data-icon="inline-start"
          />
          {status === "loading" ? "Testing..." : "Test Connection"}
        </Button>
        {status === "ok" && (
          <span className="flex items-center gap-1.5 text-sm text-green-400">
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Log Viewer</CardTitle>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-7 rounded-md border border-input bg-background pl-7 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : (
          <div className="h-64 overflow-y-auto rounded bg-black/50 p-3 font-mono text-xs leading-5">
            {!filtered || filtered.length === 0 ? (
              <span className="text-muted-foreground">
                {filter ? "No matching log lines" : "No log data"}
              </span>
            ) : (
              filtered.map((line, i) => (
                <div key={i} className="text-foreground">
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

function AssetList() {
  const [fetched, setFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function fetchAssets() {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<string[]>("list_assets");
      setAssets(result);
      setFetched(true);
    } catch (e) {
      setError(`${e}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">
          Available Assets
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAssets}
          disabled={loading}
        >
          {loading ? "Loading..." : "Fetch Assets"}
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!fetched && !error && (
          <p className="text-sm text-muted-foreground">
            Click "Fetch Assets" to discover available STAC assets
          </p>
        )}
        {fetched && assets.length === 0 && (
          <p className="text-sm text-muted-foreground">No assets found</p>
        )}
        {assets.length > 0 && (
          <div className="max-h-48 overflow-y-auto rounded bg-black/50 p-3 font-mono text-xs leading-5">
            {assets.map((line, i) => (
              <div key={i} className="text-foreground">
                {line}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
