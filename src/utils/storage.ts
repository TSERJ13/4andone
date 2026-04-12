const DB_NAME = '4andone-music';
const DB_VERSION = 110; // Bumped to 110 for robust persistent storage migration
const STORE_NAME = 'tracks';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      // IDB Upgrade
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (e: any) => resolve(e.target.result);
    request.onerror = (e) => {
      // IDB Open Error
      reject(new Error('Persistent storage unavailable. Please REFRESH the page.'));
    };
  });
};

export const saveAudioFile = async (id: string, file: File | Blob): Promise<void> => {
  if (!id) throw new Error("ID required for storage");
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.put(file, id);

      transaction.oncomplete = () => {
        // IDB Success
        resolve();
      };
      transaction.onerror = () => reject(new Error('Failed to save to local storage'));

      request.onerror = () => reject(new Error('Put request failed'));
    });
  } catch (err) {
    // IDB Save Critical
    throw err;
  }
};

export const getAudioFile = async (id: string): Promise<Blob | null> => {
  if (!id) return null;
  try {
    const db = await openDB();
    if (!db.objectStoreNames.contains(STORE_NAME)) return null;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Retrieve failed'));
    });
  } catch (err) {
    // IDB Retrieve Error
    return null;
  }
};

export const clearAllAudio = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject();
  });
};
