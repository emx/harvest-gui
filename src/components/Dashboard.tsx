import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProcessed, useLastPoll, useCollectFiles, useConfig } from "@/queries";
import { formatRelativeTime, formatBytes } from "@/lib/format";

function ErrorCard({ error }: { error: Error }) {
  return (
    <p className="text-sm text-destructive">{error.message}</p>
  );
}

function PollStatus() {
  const { data, isLoading, error } = useLastPoll();

  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (error) return <Card><CardContent className="pt-6"><ErrorCard error={error} /></CardContent></Card>;

  const ts = data?.last_poll_ts;
  const isRecent = ts ? Date.now() - new Date(ts).getTime() < 3600_000 : false;

  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <motion.div
          className={`size-3 rounded-full ${isRecent ? "bg-green-500" : "bg-muted-foreground"}`}
          animate={isRecent ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : {}}
          transition={isRecent ? { duration: 2, repeat: Infinity } : {}}
        />
        <span className="text-sm text-muted-foreground">
          Last polled: {ts ? formatRelativeTime(ts) : "never"}
        </span>
      </CardContent>
    </Card>
  );
}

function MetricCards() {
  const processed = useProcessed();
  const collects = useCollectFiles();

  const processedCount = processed.data ? Object.keys(processed.data).length : null;
  const diskCount = collects.data?.length ?? null;
  const diskUsage = collects.data
    ? collects.data.reduce((sum, c) => sum + c.files.reduce((s, f) => s + f.size, 0), 0)
    : null;

  const metrics = [
    { label: "Processed", value: processedCount, loading: processed.isLoading, error: processed.error },
    { label: "On Disk", value: diskCount, loading: collects.isLoading, error: collects.error },
    { label: "Disk Usage", value: diskUsage !== null ? formatBytes(diskUsage) : null, loading: collects.isLoading, error: collects.error },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {metrics.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: i * 0.05 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {m.loading ? (
                <Skeleton className="h-8 w-20" />
              ) : m.error ? (
                <ErrorCard error={m.error} />
              ) : (
                <p className="text-2xl font-bold">{m.value ?? 0}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function RecentActivity() {
  const { data, isLoading, error } = useProcessed();

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (error) return <Card><CardContent className="pt-6"><ErrorCard error={error} /></CardContent></Card>;

  const entries = data
    ? Object.entries(data)
        .sort(([, a], [, b]) => new Date(b).getTime() - new Date(a).getTime())
        .slice(0, 5)
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No processed collects</p>
        ) : (
          <div className="space-y-2">
            {entries.map(([id, ts]) => (
              <div key={id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                <span className="text-sm font-mono truncate max-w-[200px]">{id}</span>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(ts)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConfigSummary() {
  const { data, isLoading, error } = useConfig();

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (error) return <Card><CardContent className="pt-6"><ErrorCard error={error} /></CardContent></Card>;

  const show = data?.filter(
    (c) => c.name !== "CANOPY_CLIENT_ID" && c.name !== "CANOPY_CLIENT_SECRET"
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {show?.map((c) => (
            <div key={c.name} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {c.name.replace("CANOPY_", "")}
              </span>
              <span className={c.status === "set" ? "font-mono" : "text-destructive"}>
                {c.status === "set" ? c.value : "not set"}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  return (
    <div className="space-y-6 p-6">
      <PollStatus />
      <MetricCards />
      <div className="grid grid-cols-2 gap-4">
        <RecentActivity />
        <ConfigSummary />
      </div>
    </div>
  );
}
