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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Available Assets</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAssets}
          disabled={loading}
        >
          <List className="size-3.5" data-icon="inline-start" />
          {loading ? "Loading..." : "Fetch Assets"}
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!fetched && !error && (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        )}
        {fetched && assets.length === 0 && (
          <p className="text-sm text-muted-foreground">No assets found</p>
        )}
        {assets.length > 0 && (
          <div
            className={`${maxHeight} overflow-y-auto rounded bg-black/50 p-3 font-mono text-xs leading-5`}
          >
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
