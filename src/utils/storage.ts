const DB_NAME = '4andone-music';
const DB_VERSION = 110;
const STORE_NAME = 'tracks';

const openDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
  };
  request.onsuccess = () => {
    request.result.onversionchange = () => request.result.close();
    resolve(request.result);
  };
  request.onerror = () => reject(new Error('Persistent storage unavailable. Please refresh the page.'));
});

async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, mode);
      const request = operation(tx.objectStore(STORE_NAME));
      // Request success is not commit success: quota/abort may happen afterward.
      tx.oncomplete = () => { db.close(); resolve(request.result); };
      tx.onabort = tx.onerror = () => { db.close(); reject(tx.error || new Error('Audio storage transaction failed')); };
    } catch (error) { db.close(); reject(error); }
  });
}
export const saveAudioFile = async (id: string, file: File | Blob): Promise<void> => {
  if (!id) throw new Error('ID required for storage');
  await transaction('readwrite', store => store.put(file, id));
};
export const getAudioFile = async (id: string): Promise<Blob | null> => {
  if (!id) return null;
  try { return (await transaction('readonly', store => store.get(id))) || null; }
  catch { return null; }
};
export const deleteAudioFile = async (id: string): Promise<void> => {
  if (id) await transaction('readwrite', store => store.delete(id));
};
export const clearAllAudio = async (): Promise<void> => {
  await transaction('readwrite', store => store.clear());
};
