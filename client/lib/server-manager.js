const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5555/api";
const DEFAULT_API_URL_FALLBACK =
  process.env.NEXT_PUBLIC_API_URL_FALLBACK || DEFAULT_API_URL;

const DEFAULT_SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5555";
const DEFAULT_SOCKET_URL_FALLBACK =
  process.env.NEXT_PUBLIC_SOCKET_URL_FALLBACK || DEFAULT_SOCKET_URL;

function normalizeBase(url) {
  return typeof url === "string" ? url.replace(/\/$/, "") : "";
}

const apiUrls = [normalizeBase(DEFAULT_API_URL), normalizeBase(DEFAULT_API_URL_FALLBACK)].filter(
  Boolean,
);
const socketUrls = [
  normalizeBase(DEFAULT_SOCKET_URL),
  normalizeBase(DEFAULT_SOCKET_URL_FALLBACK),
].filter(Boolean);

let activeIndex = 0;

const listeners = new Set();

export function getApiUrl() {
  return apiUrls[activeIndex] || apiUrls[0] || "";
}

export function getSocketUrl() {
  return socketUrls[activeIndex] || socketUrls[0] || "";
}

export function getActiveIndex() {
  return activeIndex;
}

export function onServerSwitch(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function switchServer(reason) {
  if (apiUrls.length <= 1 && socketUrls.length <= 1) return activeIndex;

  const nextIndex = activeIndex === 0 ? 1 : 0;
  if (nextIndex === activeIndex) return activeIndex;

  const prevIndex = activeIndex;
  activeIndex = nextIndex;

  const payload = {
    prevIndex,
    nextIndex,
    apiUrl: getApiUrl(),
    socketUrl: getSocketUrl(),
    reason,
  };

  for (const fn of listeners) {
    try {
      fn(payload);
    } catch {
      // ignore listener errors
    }
  }

  return activeIndex;
}

