import { invoke } from "@tauri-apps/api/core";
import { useQuery } from "@tanstack/react-query";

export interface CollectEntry {
  collect_id: string;
  files: { name: string; size: number }[];
}

export interface ResolvedConfigEntry {
  name: string;
  status: string;
  value: string;
  source: string;
}

export interface AppConfig {
  canopy_client_id: string;
  canopy_client_secret: string;
  canopy_org_id: string;
  canopy_local_dir: string;
  canopy_mode: string;
}

export function useProcessed() {
  return useQuery({
    queryKey: ["processed"],
    queryFn: () => invoke<Record<string, string>>("get_processed"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useLastPoll() {
  return useQuery({
    queryKey: ["lastPoll"],
    queryFn: () => invoke<{ last_poll_ts: string }>("get_last_poll"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useCollectFiles() {
  return useQuery({
    queryKey: ["collectFiles"],
    queryFn: () => invoke<CollectEntry[]>("list_collect_files"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export interface ProcessStatus {
  running: boolean;
}

export function useHarvestStatus() {
  return useQuery({
    queryKey: ["harvestStatus"],
    queryFn: () => invoke<ProcessStatus>("harvest_status"),
    staleTime: 3_000,
  });
}

export function useTailLog(lines: number = 100) {
  return useQuery({
    queryKey: ["tailLog", lines],
    queryFn: () => invoke<string[]>("tail_log", { lines }),
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}

export function useTailAppLog(lines: number = 100) {
  return useQuery({
    queryKey: ["tailAppLog", lines],
    queryFn: () => invoke<string[]>("tail_app_log", { lines }),
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}

export interface DiskUsage {
  total_bytes: number;
  available_bytes: number;
  used_bytes: number;
}

export function useDiskUsage() {
  return useQuery({
    queryKey: ["diskUsage"],
    queryFn: () => invoke<DiskUsage>("get_disk_usage"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useCanopyDirCheck() {
  return useQuery({
    queryKey: ["canopyDirCheck"],
    queryFn: () => invoke<boolean>("check_canopy_dir"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export interface DownloadEntry {
  gid: string;
  filename: string;
  status: string;
  total_bytes: number;
  completed_bytes: number;
  speed_bytes: number;
  connections: number;
}

export function useDownloadProgress(enabled: boolean) {
  return useQuery({
    queryKey: ["downloadProgress"],
    queryFn: () => invoke<DownloadEntry[]>("get_download_progress"),
    refetchInterval: 2_000,
    staleTime: 1_000,
    enabled,
  });
}

export function useAria2Check() {
  return useQuery({
    queryKey: ["aria2Check"],
    queryFn: () => invoke<boolean>("check_aria2_rpc"),
    staleTime: 30_000,
  });
}

export function useResolvedConfig() {
  return useQuery({
    queryKey: ["resolvedConfig"],
    queryFn: () => invoke<ResolvedConfigEntry[]>("get_resolved_config"),
    staleTime: 10_000,
  });
}

export function useAppConfig() {
  return useQuery({
    queryKey: ["appConfig"],
    queryFn: () => invoke<AppConfig>("load_config"),
    staleTime: 10_000,
  });
}

