// IndexedDB wrapper for storing tile blobs
let dbPromise: Promise<IDBDatabase> | null = null;

interface TileRecord {
  blob: Blob;
  url: string;
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open("MapTilesCache", 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("tiles")) {
        db.createObjectStore("tiles", { keyPath: "url" });
      }
    };

    request.onsuccess = (event) =>
      resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) =>
      reject((event.target as IDBOpenDBRequest).error);
    request.onblocked = () => {
      console.warn("IndexedDB blocked – another tab may have it open");
    };
  });

  return dbPromise;
}

/**
 * Get a cached tile blob by URL.
 * @param url Tile URL
 * @returns Blob or null if not found
 */
export async function getCachedTile(url: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("tiles", "readonly");
      const store = tx.objectStore("tiles");
      const req = store.get(url);

      req.onsuccess = () => {
        const record = req.result as TileRecord | undefined;
        resolve(record?.blob ?? null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to read from IndexedDB", err);
    return null;
  }
}

/**
 * Cache a tile blob with its URL
 * @param url Tile URL
 * @param blob Tile image as Blob
 */
export async function cacheTile(url: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("tiles", "readwrite");
      const store = tx.objectStore("tiles");
      const req = store.put({ url, blob } as TileRecord);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to write to IndexedDB", err);
  }
}

/**
 * Optional: pre-initialize the tile cache DB
 */
export function initTileCache(): void {
  openDB().catch((err) => console.warn("Tile cache init failed", err));
}
