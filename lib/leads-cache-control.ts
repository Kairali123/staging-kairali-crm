import { clearIDBCache } from "@/lib/idb"

export const LEADS_CACHE_CLEARED_EVENT = "leads-cache-cleared"

type MemoryResetFn = () => void | Promise<void>

const memoryResetters = new Set<MemoryResetFn>()

const LEADS_STORAGE_PREFIXES = [
  "leads_",
  "received_leads_cache",
  "sent_leads_cache",
]

function isLeadsStorageKey(key: string) {
  return LEADS_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
}

function clearStorage(storage: Storage) {
  const keysToRemove: string[] = []

  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i)
    if (key && isLeadsStorageKey(key)) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key))
}

export function registerLeadsMemoryCacheReset(reset: MemoryResetFn) {
  memoryResetters.add(reset)
  return () => {
    memoryResetters.delete(reset)
  }
}

export async function clearLeadsCacheArtifacts() {
  if (typeof window === "undefined") return

  for (const reset of Array.from(memoryResetters)) {
    try {
      await reset()
    } catch (error) {
      console.warn("Leads memory cache reset failed:", error)
    }
  }

  clearStorage(window.localStorage)
  clearStorage(window.sessionStorage)

  await clearIDBCache()
}
