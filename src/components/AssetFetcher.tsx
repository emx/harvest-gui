import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { List } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AssetFetcherProps {
  emptyText?: string;
  maxHeight?: string;
}

export function AssetFetcher({
  emptyText = "Click \"Fetch Assets\" to discover available STAC assets",
  maxHeight = "max-h-48",
}: AssetFetcherProps) {
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<string[]>([]);
  const [fetched, setFetched] = useState(false);
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
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Available Assets
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAssets}
          disabled={loading}
          className="border-white/[0.08] hover:bg-white/[0.03]"
        >
          <List className="size-3.5" data-icon="inline-start" />
          {loading ? "Loading..." : "Fetch Assets"}
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {!fetched && !error && (
          <p className="text-sm text-slate-500">{emptyText}</p>
        )}
        {fetched && assets.length === 0 && (
          <p className="text-sm text-slate-500">No assets found</p>
        )}
        {assets.length > 0 && (
          <div
            className={`${maxHeight} overflow-y-auto rounded bg-black/40 p-3 font-mono text-xs leading-5 border border-white/[0.05]`}
          >
            {assets.map((line, i) => (
              <div key={i} className="text-slate-300">
                {line}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
