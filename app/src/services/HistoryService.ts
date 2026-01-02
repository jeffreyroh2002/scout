import * as FileSystem from 'expo-file-system';
import type { HistoryEntry } from '../types';

const HISTORY_FILE = `${FileSystem.documentDirectory}scan-history.json`;
const MAX_HISTORY = 5;

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const info = await FileSystem.getInfoAsync(HISTORY_FILE);
    if (!info.exists) return [];
    const content = await FileSystem.readAsStringAsync(HISTORY_FILE);
    const parsed = JSON.parse(content) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveHistory(entries: HistoryEntry[]): Promise<void> {
  try {
    const sliced = entries.slice(0, MAX_HISTORY);
    await FileSystem.writeAsStringAsync(HISTORY_FILE, JSON.stringify(sliced));
  } catch {
    // ignore write errors to avoid breaking UX
  }
}

export function upsertHistory(entries: HistoryEntry[], next: HistoryEntry): HistoryEntry[] {
  const filtered = entries.filter((e) => e.productId !== next.productId);
  const updated = [{ ...next, timestamp: Date.now() }, ...filtered];
  return updated.slice(0, MAX_HISTORY);
}
