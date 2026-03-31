import { useState, useMemo, useEffect } from "react";
import { ArrowUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProcessed, useCollectFiles, type CollectEntry } from "@/queries";
import { formatDate, formatBytes } from "@/lib/format";
import { useAppStore } from "@/store";

type SortKey = "id" | "date";
type SortDir = "asc" | "desc";

function DetailPanel({
  collectId,
  collects,
  onClose,
}: {
  collectId: string;
  collects: CollectEntry[] | undefined;
  onClose: () => void;
}) {
  const entry = collects?.find((c) => c.collect_id === collectId);

  return (
    <div className="w-80 shrink-0 border-l border-white/[0.05] overflow-y-auto"
      style={{ background: "oklch(0.235 0.014 264 / 60%)", backdropFilter: "blur(8px)" }}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/[0.05]">
        <h3 className="text-sm font-medium font-mono text-teal-400 truncate max-w-[220px]">
          {collectId}
        </h3>
        <Button variant="ghost" size="icon-xs" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>
      <div className="p-4">
        {!entry || entry.files.length === 0 ? (
          <p className="text-sm text-slate-500">No files downloaded</p>
        ) : (
          <div className="space-y-1.5">
            {entry.files.map((f) => (
              <div
                key={f.name}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-mono truncate max-w-[160px] text-slate-300 text-xs">
                  {f.name}
                </span>
                <span className="font-mono text-slate-500 text-xs">
                  {formatBytes(f.size)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function History() {
  const processed = useProcessed();
  const collects = useCollectFiles();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const selectedCollectId = useAppStore((s) => s.selectedCollectId);
  const setSelectedCollectId = useAppStore((s) => s.setSelectedCollectId);

  // Clear selection when leaving the view
  useEffect(() => {
    return () => setSelectedCollectId(null);
  }, [setSelectedCollectId]);

  const entries = useMemo(() => {
    if (!processed.data) return [];
    let items = Object.entries(processed.data).map(([id, ts]) => ({
      id,
      ts,
    }));
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((e) => e.id.toLowerCase().includes(q));
    }
    items.sort((a, b) => {
      const cmp =
        sortKey === "id"
          ? a.id.localeCompare(b.id)
          : new Date(a.ts).getTime() - new Date(b.ts).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return items;
  }, [processed.data, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  }

  if (processed.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (processed.error) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-400">{processed.error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 p-6 pb-4">
        <h2 className="text-lg font-semibold text-slate-100">History</h2>
        <input
          type="text"
          placeholder="Filter by collect ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
        />
      </div>

      <div className="flex flex-1 overflow-hidden px-6 pb-6 gap-0">
        <div className={`flex-1 overflow-y-auto rounded-md border border-white/[0.08] glass-card ${selectedCollectId ? "rounded-r-none border-r-0" : ""}`}>
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.05] hover:bg-transparent">
                <TableHead>
                  <button
                    className="flex items-center gap-1 text-xs font-semibold tracking-wider uppercase text-slate-400"
                    onClick={() => toggleSort("id")}
                  >
                    Collect ID
                    <ArrowUpDown className="size-3" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 text-xs font-semibold tracking-wider uppercase text-slate-400"
                    onClick={() => toggleSort("date")}
                  >
                    Processed Date
                    <ArrowUpDown className="size-3" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center text-slate-500"
                  >
                    {search
                      ? "No matching collects"
                      : "No processed collects yet"}
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((e, i) => (
                  <TableRow
                    key={e.id}
                    className={`cursor-pointer border-white/[0.03] transition-colors ${
                      selectedCollectId === e.id
                        ? "bg-teal-500/10"
                        : i % 2 === 1
                          ? "bg-white/[0.02] hover:bg-white/[0.04]"
                          : "hover:bg-white/[0.03]"
                    }`}
                    onClick={() =>
                      setSelectedCollectId(
                        selectedCollectId === e.id ? null : e.id
                      )
                    }
                  >
                    <TableCell className="font-mono text-sm text-slate-300">
                      {e.id}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-slate-400">
                      {formatDate(e.ts)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {selectedCollectId && (
          <DetailPanel
            collectId={selectedCollectId}
            collects={collects.data}
            onClose={() => setSelectedCollectId(null)}
          />
        )}
      </div>
    </div>
  );
}
