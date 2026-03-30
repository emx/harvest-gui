import { invoke } from "@tauri-apps/api/core";
import { useQuery } from "@tanstack/react-query";

export interface CollectEntry {
  collect_id: string;
  files: { name: string; size: number }[];
}

export interface ConfigEntry {
  name: string;
  status: string;
  value: string;
}

export function useProcessed() {
  return useQuery({
    queryKey: ["processed"],
    queryFn: () => invoke<Record<string, string>>("get_processed"),
    staleTime: 30_000,
  });
}

export function useLastPoll() {
  return useQuery({
    queryKey: ["lastPoll"],
    queryFn: () => invoke<{ last_poll_ts: string }>("get_last_poll"),
    staleTime: 30_000,
  });
}

export function useCollectFiles() {
  return useQuery({
    queryKey: ["collectFiles"],
    queryFn: () => invoke<CollectEntry[]>("list_collect_files"),
    staleTime: 30_000,
  });
}

export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => invoke<ConfigEntry[]>("get_config"),
    staleTime: 30_000,
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

