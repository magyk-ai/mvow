import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@ks/shared';

/** Typed Socket.IO client */
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Singleton socket instance */
let socket: TypedSocket | null = null;

/**
 * Get the Socket.IO client instance (lazy initialization).
 * Uses VITE_SERVER_URL environment variable or defaults to localhost.
 */
export function getSocket(): TypedSocket {
  if (!socket) {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    socket = io(serverUrl, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

/**
 * Connect the socket if not already connected.
 */
export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

/**
 * Disconnect the socket if connected.
 */
export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

/**
 * Check if socket is currently connected.
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
