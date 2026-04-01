import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDownloadProgress, type DownloadEntry } from "@/queries";
import { formatBytes } from "@/lib/format";

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

function formatEta(remaining: number, speed: number): string {
  if (speed <= 0) return "—";
  const secs = Math.round(remaining / speed);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

function ActiveDownload({ entry }: { entry: DownloadEntry }) {
  const pct =
    entry.total_bytes > 0
      ? (entry.completed_bytes / entry.total_bytes) * 100
      : 0;
  const remaining = entry.total_bytes - entry.completed_bytes;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-slate-200 truncate max-w-[70%]">
          {entry.filename}
        </span>
        <span className="text-xs text-slate-400">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-teal-500 transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>
          {formatBytes(entry.completed_bytes)} / {formatBytes(entry.total_bytes)}
        </span>
        <span className="flex items-center gap-2">
          <span>{formatSpeed(entry.speed_bytes)}</span>
          <span>ETA {formatEta(remaining, entry.speed_bytes)}</span>
          <span>{entry.connections} conn</span>
        </span>
      </div>
    </div>
  );
}

function QueuedDownload({ entry }: { entry: DownloadEntry }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="font-mono text-xs text-slate-400 truncate max-w-[70%]">
        {entry.filename}
      </span>
      <Badge
        variant="secondary"
        className="bg-slate-700/50 text-slate-500 border-slate-600/30 text-[10px] px-1.5 py-0"
      >
        Queued
      </Badge>
    </div>
  );
}

export function DownloadProgress({ enabled }: { enabled: boolean }) {
  const { data: downloads } = useDownloadProgress(enabled);

  if (!downloads || downloads.length === 0) return null;

  const active = downloads.filter((d) => d.status === "active");
  const queued = downloads.filter((d) => d.status === "waiting" || d.status === "paused");

  return (
    <Card className="glass-card border-t-2 border-t-teal-500/40">
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Downloads
          <Badge
            variant="secondary"
            className="ml-2 bg-teal-500/20 text-teal-400 border-teal-500/30 text-[10px] px-1.5 py-0"
          >
            {active.length} active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {active.map((entry) => (
          <ActiveDownload key={entry.gid} entry={entry} />
        ))}
        {queued.map((entry) => (
          <QueuedDownload key={entry.gid} entry={entry} />
        ))}
      </CardContent>
    </Card>
  );
}
