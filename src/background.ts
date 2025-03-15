import { debugLog } from "./data";
import { PacketType } from "./types";
import { generateAccessCode, initializeWebSocket, sendWebSocketMessage } from "./ws";

// Create an alarm to keep the service worker alive and send regular pings
chrome.alarms.create('lamela-keepAlive', { periodInMinutes: 0.5 });

const keepAlive = async () => {
  debugLog('Keeping alive...');
  const storage = await chrome.storage.local.get(["accessCode"]);
  const accessCode = storage.accessCode || generateAccessCode();

  if (!storage.accessCode) {
    debugLog(`Setting new access code: ${accessCode}`);
    await chrome.storage.local.set({ accessCode });
  }

  // Initialize persistent WebSocket connection if not already connected
  initializeWebSocket(accessCode);

  // Send periodic ping to keep the connection alive
  await sendWebSocketMessage({
    type: PacketType.INIT,
    data: {
      accessCode,
      userAgent: navigator.userAgent,
      isOnline: true,
      lastOnline: new Date(),
    }
  });
}

// Listen for alarm events
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'lamela-keepAlive') {
    return;
  }

  debugLog('Alarm triggered: lamela-keepAlive');
  await keepAlive();
});

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener(async () => {
  debugLog('Extension installed or updated');

  // Request necessary permissions
  chrome.permissions.request({
    permissions: ['tabs', 'activeTab', 'scripting'],
    origins: ['<all_urls>']
  }, (granted) => {
    if (granted) {
      debugLog('All permissions granted');
    } else {
      debugLog('Some permissions were not granted');
    }
  });

  await keepAlive();
});

// Initialize when the background script starts
debugLog('Background script started');
keepAlive().catch(error => {
  debugLog('Error during initialization:', error);
});
