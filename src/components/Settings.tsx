import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Eye, EyeOff, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppConfig, useResolvedConfig, useHarvestStatus, type AppConfig } from "@/queries";
import { useAppStore, serializeFlags } from "@/store";
import { useQueryClient } from "@tanstack/react-query";

function ConfigForm() {
  const { data: config, isLoading } = useAppConfig();
  const { data: resolved } = useResolvedConfig();
  const { data: status } = useHarvestStatus();
  const harvestFlags = useAppStore((s) => s.harvestFlags);
  const setHarvestFlags = useAppStore((s) => s.setHarvestFlags);
  const queryClient = useQueryClient();

  const [form, setForm] = useState<AppConfig>({
    canopy_client_id: "",
    canopy_client_secret: "",
    canopy_org_id: "",
    canopy_local_dir: "",
    canopy_mode: "sandbox",
  });
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [needsRestart, setNeedsRestart] = useState(false);

  useEffect(() => {
    if (config) {
      setForm(config);
    }
  }, [config]);

  function getSource(name: string): string | null {
    const entry = resolved?.find((e) => e.name === name);
    if (!entry || entry.status === "missing") return null;
    return entry.source;
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await invoke("save_config", { config: form });
      queryClient.invalidateQueries({ queryKey: ["appConfig"] });
      queryClient.invalidateQueries({ queryKey: ["resolvedConfig"] });
      queryClient.invalidateQueries({ queryKey: ["config"] });
      setMessage({ type: "ok", text: "Configuration saved" });
      if (status?.running) {
        setNeedsRestart(true);
      }
    } catch (e) {
      setMessage({ type: "error", text: `${e}` });
    } finally {
      setSaving(false);
    }
  }

  async function handleRestart() {
    try {
      await invoke("stop_harvest");
      useAppStore.getState().clearHarvestLogs();
      await invoke("start_harvest", { flags: serializeFlags(harvestFlags) });
      setNeedsRestart(false);
      queryClient.invalidateQueries({ queryKey: ["harvestStatus"] });
    } catch {
      // Errors handled by Active view
    }
  }


  if (isLoading) return <Skeleton className="h-80 w-full" />;

  return (
    <div className="space-y-6">
      <Card className="glass-card border-t-2 border-t-teal-500/40">
        <CardHeader>
          <CardTitle className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            Canopy Credentials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            label="CLIENT_ID"
            value={form.canopy_client_id}
            onChange={(v) => setForm((f) => ({ ...f, canopy_client_id: v }))}
            source={getSource("CANOPY_CLIENT_ID")}
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                CLIENT_SECRET
              </span>
              <SourceBadge source={getSource("CANOPY_CLIENT_SECRET")} />
            </div>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                value={form.canopy_client_secret}
                onChange={(e) =>
                  setForm((f) => ({ ...f, canopy_client_secret: e.target.value }))
                }
                className="h-8 w-full rounded border border-white/[0.08] bg-white/[0.03] px-3 pr-9 text-sm font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-t-2 border-t-teal-500/40">
        <CardHeader>
          <CardTitle className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            Canopy Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            label="ORG_ID"
            value={form.canopy_org_id}
            onChange={(v) => setForm((f) => ({ ...f, canopy_org_id: v }))}
            source={getSource("CANOPY_ORG_ID")}
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                LOCAL_DIR
              </span>
              <SourceBadge source={getSource("CANOPY_LOCAL_DIR")} />
            </div>
            <input
              type="text"
              value={form.canopy_local_dir}
              onChange={(e) =>
                setForm((f) => ({ ...f, canopy_local_dir: e.target.value }))
              }
              placeholder="/path/to/canopy/data"
              className="h-8 w-full rounded border border-white/[0.08] bg-white/[0.03] px-3 text-sm font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                MODE
              </span>
              <SourceBadge source={getSource("CANOPY_MODE")} />
            </div>
            <select
              value={form.canopy_mode}
              onChange={(e) => setForm((f) => ({ ...f, canopy_mode: e.target.value }))}
              className="h-8 w-full rounded border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            >
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-t-2 border-t-teal-500/40">
        <CardHeader>
          <CardTitle className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            Harvest Flag Defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={harvestFlags.once}
                onChange={(e) => setHarvestFlags({ once: e.target.checked })}
                className="accent-teal-500"
              />
              --once
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={harvestFlags.verbose}
                onChange={(e) => setHarvestFlags({ verbose: e.target.checked })}
                className="accent-teal-500"
              />
              --verbose
            </label>
          </div>
          <Separator className="bg-white/[0.05]" />
          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                --include
              </span>
              <input
                type="text"
                value={harvestFlags.include}
                onChange={(e) => setHarvestFlags({ include: e.target.value })}
                placeholder="e.g. .tif,.json"
                className="h-8 w-full rounded border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                --exclude
              </span>
              <input
                type="text"
                value={harvestFlags.exclude}
                onChange={(e) => setHarvestFlags({ exclude: e.target.value })}
                placeholder="e.g. .xml,.html"
                className="h-8 w-full rounded border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-t-2 border-t-teal-500/40">
        <CardHeader>
          <CardTitle className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            App Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">App Version</span>
              <span className="font-mono text-slate-300">0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Framework</span>
              <span className="font-mono text-slate-300">Tauri 2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Harvest CLI</span>
              <span className="font-mono text-xs text-slate-300">
                uv run python -m harvest
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="bg-teal-600 text-white hover:bg-teal-500"
        >
          <Save className="size-3.5" data-icon="inline-start" />
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
        {message && (
          <span
            className={`text-sm ${message.type === "ok" ? "text-teal-400" : "text-red-400"}`}
          >
            {message.text}
          </span>
        )}
      </div>

      {needsRestart && (
        <div className="flex items-center gap-3 rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
          <span className="text-sm text-amber-400">
            Configuration saved. Restart Harvest for changes to take effect.
          </span>
          <Button
            onClick={handleRestart}
            size="sm"
            className="bg-amber-600 text-white hover:bg-amber-500"
          >
            Restart Now
          </Button>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  source,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  source: string | null;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          {label}
        </span>
        <SourceBadge source={source} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded border border-white/[0.08] bg-white/[0.03] px-3 text-sm font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
      />
    </div>
  );
}

function SourceBadge({ source }: { source: string | null }) {
  if (!source || source === "none") return null;
  return (
    <Badge
      variant="secondary"
      className={
        source === "config"
          ? "bg-teal-500/10 text-teal-400/70 border-teal-500/20 text-[10px] px-1.5 py-0"
          : "bg-slate-500/10 text-slate-400/70 border-slate-500/20 text-[10px] px-1.5 py-0"
      }
    >
      {source}
    </Badge>
  );
}

export function Settings() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-lg font-semibold text-slate-100">Settings</h2>
      <ConfigForm />
    </div>
  );
}
