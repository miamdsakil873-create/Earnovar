// Live Sync service to keep User Panel and Admin Panel synchronized in real-time
type SyncCallback = (data?: any) => void;
const listeners = new Set<SyncCallback>();

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('earnova_live_sync');
    broadcastChannel.onmessage = (event) => {
      listeners.forEach((cb) => {
        try {
          cb(event.data);
        } catch (e) {
          console.error(e);
        }
      });
    };
  }
} catch (e) {
  // Ignore BroadcastChannel errors in unsupported envs
}

export const notifyDataUpdated = (payload?: any) => {
  const data = { timestamp: Date.now(), ...payload };
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(data);
    } catch (e) {}
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('earnova:data-updated', { detail: data }));
    // Also save a timestamp in localStorage so other tabs / reloads pick it up
    try {
      localStorage.setItem('earnova_last_sync_timestamp', String(Date.now()));
    } catch (e) {}
  }
  listeners.forEach((cb) => {
    try {
      cb(data);
    } catch (e) {
      console.error(e);
    }
  });
};

export const onDataUpdated = (callback: SyncCallback) => {
  listeners.add(callback);
  const handleCustomEvent = (e: any) => {
    callback(e.detail);
  };
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === 'earnova_last_sync_timestamp') {
      callback({ timestamp: e.newValue });
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('earnova:data-updated', handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener('earnova:data-updated', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
};
