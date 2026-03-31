import { useEffect, useState } from "react";
import { useHarvestStatus, useLastPoll, useConfig } from "@/queries";
import { formatRelativeTime } from "@/lib/format";

export function StatusBar() {
  const { data: status } = useHarvestStatus();
  const { data: lastPoll } = useLastPoll();
  const { data: config } = useConfig();
  const [elapsed, setElapsed] = useState("");

  const running = status?.running ?? false;
  const pollTs = lastPoll?.last_poll_ts;
  const hasConfig = config?.some(
    (c) => c.name === "CANOPY_LOCAL_DIR" && c.status === "set"
  );

  // Track elapsed time when running
  useEffect(() => {
    if (!running) {
      setElapsed("");
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${m}m ${s.toString().padStart(2, "0")}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  return (
    <footer className="flex h-7 items-center justify-between border-t border-white/[0.05] px-4 text-xs font-mono"
      style={{ background: "var(--sidebar)" }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-block size-1.5 rounded-full ${
            hasConfig ? "bg-teal-500" : "bg-slate-500"
          }`}
        />
        <span className="text-slate-500">
          {hasConfig ? "Configured" : "Not Configured"}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-slate-500">
        {running && (
          <span className="inline-block size-1.5 rounded-full bg-teal-500 animate-pulse" />
        )}
        Harvest: {running ? `Running (${elapsed || "0m 00s"})` : "Stopped"}
      </div>

      <div className="text-slate-500">
        Last poll: {pollTs ? formatRelativeTime(pollTs) : "never"}
      </div>
    </footer>
  );
}
