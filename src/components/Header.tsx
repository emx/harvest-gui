import { useState, useEffect } from "react";
import { Satellite, Play, Square } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfig, useHarvestStatus } from "@/queries";
import { useAppStore, serializeFlags } from "@/store";

export function Header() {
  const { data: config } = useConfig();
  const { data: status, refetch } = useHarvestStatus();
  const harvestFlags = useAppStore((s) => s.harvestFlags);
  const modeEntry = config?.find((c) => c.name === "CANOPY_MODE");
  const mode = modeEntry?.status === "set" ? modeEntry.value : null;
  const running = status?.running ?? false;

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  async function handleToggle() {
    try {
      if (running) {
        await invoke("stop_harvest");
      } else {
        await invoke("start_harvest", {
          flags: serializeFlags(harvestFlags),
        });
      }
      refetch();
    } catch (e) {
      setError(`${e}`);
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-2">
        <Satellite className="size-5 text-primary" />
        <span className="text-lg font-semibold">Harvest</span>
      </div>
      <div className="flex items-center gap-3">
        {error && (
          <span className="text-xs text-destructive max-w-[200px] truncate">
            {error}
          </span>
        )}
        {mode && (
          <Badge
            variant={mode === "production" ? "default" : "secondary"}
            className={
              mode === "production"
                ? "bg-green-600/20 text-green-400 border-green-600/30"
                : "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
            }
          >
            {mode}
          </Badge>
        )}
        <Button
          variant={running ? "destructive" : "outline"}
          size="sm"
          onClick={handleToggle}
        >
          {running ? (
            <>
              <Square className="size-3.5" data-icon="inline-start" />
              Stop Poll
            </>
          ) : (
            <>
              <Play className="size-3.5" data-icon="inline-start" />
              Start Poll
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
