import { useState, useMemo } from "react";
import { ArrowUpDown, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type SortKey = "id" | "date";
type SortDir = "asc" | "desc";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

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
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium font-mono">
          {collectId}
        </CardTitle>
        <Button variant="ghost" size="icon-xs" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {!entry || entry.files.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No files downloaded
          </p>
        ) : (
          <div className="space-y-1">
            {entry.files.map((f) => (
              <div
                key={f.name}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-mono truncate max-w-[300px]">
                  {f.name}
                </span>
                <span className="text-muted-foreground">
                  {formatBytes(f.size)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function History() {
  const processed = useProcessed();
  const collects = useCollectFiles();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        <p className="text-sm text-destructive">{processed.error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">History</h2>
        <input
          type="text"
          placeholder="Filter by collect ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  className="flex items-center gap-1 text-xs font-medium"
                  onClick={() => toggleSort("id")}
                >
                  Collect ID
                  <ArrowUpDown className="size-3" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center gap-1 text-xs font-medium"
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
                  className="text-center text-muted-foreground"
                >
                  {search
                    ? "No matching collects"
                    : "No processed collects"}
                </TableCell>
              </TableRow>
            ) : (
              entries.map((e) => (
                <TableRow
                  key={e.id}
                  className={`cursor-pointer ${selectedId === e.id ? "bg-accent" : ""}`}
                  onClick={() =>
                    setSelectedId(selectedId === e.id ? null : e.id)
                  }
                >
                  <TableCell className="font-mono text-sm">
                    {e.id}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(e.ts)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedId && (
        <DetailPanel
          collectId={selectedId}
          collects={collects.data}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
