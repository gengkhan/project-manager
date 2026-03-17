import { io } from "socket.io-client";
import { getSocketUrl, onServerSwitch } from "./server-manager";

let socket = null;
let currentToken = null;

/**
 * Inisialisasi koneksi Socket.io
 * Dipanggil setelah user login
 */
export const connectSocket = (token) => {
  if (socket?.connected) return socket;
  currentToken = token;

  socket = io(getSocketUrl(), {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("[Socket] Connection error:", error.message);
  });

  return socket;
};

onServerSwitch(() => {
  if (!socket) return;
  if (!currentToken) return;

  try {
    socket.disconnect();
  } catch {
    // ignore
  }

  socket = io(getSocketUrl(), {
    auth: { token: currentToken },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
});

/**
 * Disconnect socket
 * Dipanggil saat user logout
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentToken = null;
};

/**
 * Dapatkan instance socket saat ini
 */
export const getSocket = () => socket;

export default socket;
