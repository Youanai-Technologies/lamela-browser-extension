// export const API_URL = 'https://youanai.com/api/websocket/';
export const WS_URL = 'ws://localhost:8080';

// Debug mode - set to true to enable verbose logging
export const DEBUG_MODE = true;

// Logger function that only logs in debug mode
export const debugLog = (message: string, ...args: any[]): void => {
  if (DEBUG_MODE) {
    console.log(`[Lamela Debug] ${message}`, ...args);
  }
};
