import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { CheckCircle2, HardDrive, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProcessed, useLastPoll, useCollectFiles, useResolvedConfig } from "@/queries";
import { formatRelativeTime, formatBytes } from "@/lib/format";
import { useAppStore } from "@/store";

function ErrorCard({ error }: { error: Error }) {
  return <p className="text-sm text-red-400">{error.message}</p>;
}

function RadarSweep({ active }: { active: boolean }) {
  return (
    <div
      className={`relative size-11 rounded-full border-2 ${
        active ? "border-teal-500/60" : "border-slate-600"
      } flex items-center justify-center overflow-hidden`}
    >
      {active && (
        <div
          className="absolute inset-0 radar-sweep"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, oklch(0.704 0.14 181 / 40%) 40deg, transparent 80deg)",
          }}
        />
      )}
      <div
        className={`size-2 rounded-full ${
          active ? "bg-teal-500" : "bg-slate-600"
        }`}
      />
    </div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(motionVal, value, { duration: 0.6 });
    return controls.stop;
  }, [value, motionVal]);

  return <motion.span>{rounded}</motion.span>;
}

function PollStatus() {
  const { data, isLoading, error } = useLastPoll();

  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (error)
    return (
      <Card className="glass-card border-t-2 border-t-teal-500/40">
        <CardContent className="pt-6">
          <ErrorCard error={error} />
        </CardContent>
      </Card>
    );

  const ts = data?.last_poll_ts;
  const isRecent = ts
    ? Date.now() - new Date(ts).getTime() < 3600_000
    : false;

  return (
    <Card className="glass-card border-t-2 border-t-teal-500/40">
      <CardContent className="flex items-center gap-4 pt-6">
        <RadarSweep active={isRecent} />
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            Poll Status
          </p>
          <p className="text-sm text-slate-300">
            Last polled: {ts ? formatRelativeTime(ts) : "never"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCards() {
  const processed = useProcessed();
  const collects = useCollectFiles();

  const processedCount = processed.data
    ? Object.keys(processed.data).length
    : null;
  const diskCount = collects.data?.length ?? null;
  const harvestSize = collects.data
    ? collects.data.reduce(
        (sum, c) => sum + c.files.reduce((s, f) => s + f.size, 0),
        0
      )
    : null;

  const metrics = [
    {
      label: "Processed",
      value: processedCount,
      displayValue: processedCount !== null ? String(processedCount) : null,
      numericValue: processedCount,
      loading: processed.isLoading,
      error: processed.error,
      icon: CheckCircle2,
    },
    {
      label: "On Disk",
      value: diskCount,
      displayValue: diskCount !== null ? String(diskCount) : null,
      numericValue: diskCount,
      loading: collects.isLoading,
      error: collects.error,
      icon: HardDrive,
    },
    {
      label: "Data Size",
      value: harvestSize !== null ? formatBytes(harvestSize) : null,
      displayValue: harvestSize !== null ? formatBytes(harvestSize) : null,
      numericValue: null,
      loading: collects.isLoading,
      error: collects.error,
      icon: Database,
      extra: diskCount !== null ? `across ${diskCount} collects` : null,
      extraColor: "text-slate-400",
    },
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
          <Card className="glass-card border-t-2 border-t-teal-500/40">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <m.icon className="size-4 text-teal-500" />
                <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                  {m.label}
                </span>
              </div>
              {m.loading ? (
                <Skeleton className="h-9 w-20" />
              ) : m.error ? (
                <ErrorCard error={m.error} />
              ) : (
                <>
                  <p className="text-3xl font-bold text-slate-100">
                    {m.numericValue !== null ? (
                      <AnimatedNumber value={m.numericValue} />
                    ) : (
                      (m.displayValue ?? 0)
                    )}
                  </p>
                  {"extra" in m && m.extra && (
                    <p className={`text-xs mt-1 font-mono ${m.extraColor}`}>
                      {m.extra}
                    </p>
                  )}
                </>
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
  const setActiveView = useAppStore((s) => s.setActiveView);
  const setSelectedCollectId = useAppStore((s) => s.setSelectedCollectId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (error)
    return (
      <Card className="glass-card border-t-2 border-t-teal-500/40">
        <CardContent className="pt-6">
          <ErrorCard error={error} />
        </CardContent>
      </Card>
    );

  const entries = data
    ? Object.entries(data)
        .sort(
          ([, a], [, b]) => new Date(b).getTime() - new Date(a).getTime()
        )
        .slice(0, 5)
    : [];

  function handleClick(collectId: string) {
    setSelectedCollectId(collectId);
    setActiveView("history");
  }

  return (
    <Card className="glass-card border-t-2 border-t-teal-500/40">
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">No processed collects yet</p>
        ) : (
          <div className="space-y-2">
            {entries.map(([id, ts]) => (
              <div
                key={id}
                onClick={() => handleClick(id)}
                className="flex items-center justify-between rounded-md bg-white/[0.03] px-3 py-2 cursor-pointer hover:bg-white/[0.06] transition-colors"
              >
                <span className="text-sm font-mono truncate max-w-[200px] text-slate-300">
                  {id}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  {formatRelativeTime(ts)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConfigSummary() {
  const { data, isLoading, error } = useResolvedConfig();
  const setActiveView = useAppStore((s) => s.setActiveView);

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (error)
    return (
      <Card className="glass-card border-t-2 border-t-teal-500/40">
        <CardContent className="pt-6">
          <ErrorCard error={error} />
        </CardContent>
      </Card>
    );

  const show = data?.filter(
    (c) =>
      c.name !== "CANOPY_CLIENT_ID" && c.name !== "CANOPY_CLIENT_SECRET"
  );

  return (
    <Card
      className="glass-card border-t-2 border-t-teal-500/40 cursor-pointer hover:bg-white/[0.02] transition-colors"
      onClick={() => setActiveView("settings")}
    >
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {show?.map((c) => (
            <div
              key={c.name}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-slate-400">
                {c.name.replace("CANOPY_", "")}
              </span>
              <span
                className={
                  c.status === "set"
                    ? "font-mono text-slate-300"
                    : "text-red-400"
                }
              >
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
