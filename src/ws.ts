/**
 * WebSocket utilities for the Lamela Browser Extension
 */

import { CommandHandler } from "./commandHandler";
import { WS_URL, debugLog } from "./data";
import { CommandPacket, Packet, PacketType } from "./types";

// Singleton WebSocket connection
let socket: WebSocket | null = null;
let reconnectTimeout: number | null = null;
let pingInterval: number | null = null;
const RECONNECT_DELAY_MS = 5000;
const PING_INTERVAL_MS = 30000; // 30 seconds

// Ping data interface
export interface PingData {
  type: string;
  data: Record<string, any>;
}

/**
 * Send a message to the WebSocket server
 * @param data Data to send
 * @returns Promise that resolves when message is sent
 */
export const sendWebSocketMessage = (data: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      if (socket && socket.readyState === WebSocket.OPEN) {
        // Use existing connection if available
        const message = JSON.stringify(data);
        debugLog("Sending message:", message);
        socket.send(message);
        resolve();
      } else {
        // Create a new temporary connection if needed
        debugLog("Creating temporary connection to send message");
        const tempSocket = new WebSocket(WS_URL);

        tempSocket.onopen = () => {
          // Send the data as JSON
          const message = JSON.stringify(data);
          debugLog("Sending message via temporary connection:", message);
          tempSocket.send(message);

          // Close the connection after sending
          tempSocket.close();
          resolve();
        };

        tempSocket.onerror = (error) => {
          debugLog("Error with temporary connection:", error);
          reject(error);
        };

        // Set a timeout to prevent hanging connections
        setTimeout(() => {
          if (tempSocket.readyState !== WebSocket.CLOSED) {
            tempSocket.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 5000);
      }
    } catch (error) {
      debugLog("Error sending message:", error);
      reject(error);
    }
  });
};

/**
 * Initialize a persistent WebSocket connection
 * @param accessCode The extension's access code
 */
export const initializeWebSocket = (accessCode: string): void => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    debugLog('WebSocket connection already established');
    return;
  }

  debugLog('Initializing persistent WebSocket connection');

  // Clear any existing reconnect timeout
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Clear any existing ping interval
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }

  // Create a new WebSocket connection
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    debugLog('WebSocket connection established');

    // Register with the server
    const registerMessage = {
      type: PacketType.REGISTER,
      data: { accessCode }
    };

    if (socket) {
      debugLog('Sending registration message', registerMessage);
      socket.send(JSON.stringify(registerMessage));

      // Set up ping interval to keep the connection alive
      // This is more efficient than sending full JSON messages
      pingInterval = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          // Send a small ping message instead of a full data packet
          debugLog('Sending ping');
          socket.send('ping');
        }
      }, PING_INTERVAL_MS);
    }
  };

  socket.onmessage = async (event) => {
    // Ignore ping responses
    if (event.data === 'pong') {
      debugLog('Received pong');
      return;
    }

    debugLog('Received message:', event.data);

    try {
      const packet = JSON.parse(event.data) as Packet;

      // Handle different packet types
      if (packet.type === PacketType.COMMAND) {
        debugLog('Processing command packet', packet);
        await CommandHandler.processCommand(packet as CommandPacket);
      } else {
        debugLog('Received non-command packet', packet);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  };

  socket.onclose = (event) => {
    debugLog(`WebSocket connection closed (code: ${event.code}, reason: ${event.reason}), scheduling reconnect`);

    // Clear ping interval
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }

    // Schedule reconnection
    reconnectTimeout = setTimeout(() => {
      initializeWebSocket(accessCode);
    }, RECONNECT_DELAY_MS);
  };

  socket.onerror = (error) => {
    debugLog('WebSocket error:', error);
  };
};

/**
 * Close the WebSocket connection
 */
export const closeWebSocket = (): void => {
  debugLog('Closing WebSocket connection');

  if (socket) {
    socket.close();
    socket = null;
  }

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
};

/**
 * Generate a random number id
 * @returns A random number id
 */
export const generateAccessCode = (): string => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  debugLog(`Generated access code: ${code}`);
  return code;
};
