import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'leafscan-cache';

function cacheKey(key: string) {
  return `${PREFIX}:${key}`;
}

export async function readCachedData<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

export async function writeCachedData<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(
      cacheKey(key),
      JSON.stringify({
        data,
        cachedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Cache is best-effort only.
  }
}

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<{ data: T; fromCache: boolean }> {
  try {
    const data = await fetcher();
    await writeCachedData(key, data);
    return { data, fromCache: false };
  } catch (error) {
    const cached = await readCachedData<T>(key);
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }
    throw error;
  }
}
