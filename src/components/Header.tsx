import { useState, useEffect } from "react";
import { Satellite, Play, Square } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useResolvedConfig, useHarvestStatus } from "@/queries";
import { useAppStore, serializeFlags } from "@/store";

export function Header() {
  const { data: config } = useResolvedConfig();
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
    <header className="relative flex h-14 items-center justify-between border-b border-white/[0.08] px-4 bg-background">
      <div className="flex items-center gap-2">
        <Satellite className="size-5 text-teal-500" />
        <span className="text-lg font-semibold text-slate-100">Harvest</span>
      </div>
      <div className="flex items-center gap-3">
        {error && (
          <span className="text-xs text-red-400 max-w-[200px] truncate">
            {error}
          </span>
        )}
        {mode && (
          <Badge
            variant="secondary"
            className={
              mode === "production"
                ? "bg-teal-500/20 text-teal-400 border-teal-500/30"
                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
            }
          >
            {mode}
          </Badge>
        )}
        <Button
          variant={running ? "destructive" : "default"}
          size="sm"
          onClick={handleToggle}
          className={
            running
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30"
              : "bg-teal-600 text-white hover:bg-teal-500 border-teal-500/30"
          }
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
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
    </header>
  );
}
