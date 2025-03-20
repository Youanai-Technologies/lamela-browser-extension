/// <reference types="chrome"/>

import { generateAccessCode } from './ws';

// Function to get or generate access code
function getAccessCode(): string {
  // Generate a new access code each time the popup is opened
  return generateAccessCode();
}

// Function to check if WebSocket is connected
function isConnected(): boolean {
  // For now, we'll just check if we have an access code
  return true; // We'll implement proper connection check later
}

// Function to update the popup UI
function updatePopupUI(): void {
  const statusElement = document.getElementById('status');
  const accessCodeElement = document.getElementById('accessCode');

  if (!statusElement || !accessCodeElement) {
    console.error('Required elements not found');
    return;
  }

  // Update access code
  const code = getAccessCode();
  accessCodeElement.textContent = code;

  // Update connection status
  if (isConnected()) {
    statusElement.textContent = 'Ready to connect';
    statusElement.className = 'status connected';
  } else {
    statusElement.textContent = 'Not ready';
    statusElement.className = 'status disconnected';
  }
}

// Function to run when the popup is opened
function onPopupOpen(): void {
  console.log('Popup opened!');
  updatePopupUI();
}

// Function to run when the popup is closed
function onPopupClose(): void {
  console.log('Popup closed!');
}

// Run when popup is opened
document.addEventListener('DOMContentLoaded', () => {
  onPopupOpen();
});

// Run when popup is closed
window.addEventListener('beforeunload', () => {
  onPopupClose();
}); 
