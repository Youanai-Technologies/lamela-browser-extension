# Lamela Browser Extension

A powerful Chrome extension built with TypeScript that enables remote browser automation and control through WebSocket communication.

## Overview

Lamela is a browser extension that establishes a persistent WebSocket connection to a server, allowing remote control of the browser through a set of predefined commands. It can be used for browser automation, web scraping, and remote browser control.

## Features

- **Persistent WebSocket Connection**: Maintains a connection to a server for real-time communication
- **Remote Browser Control**: Execute commands remotely to control browser navigation and interaction
- **Web Scraping Capabilities**: Extract content, take screenshots, and interact with web pages
- **Automatic Reconnection**: Handles connection drops with automatic reconnection
- **Unique Access Code**: Generates a unique access code for secure identification
- **Background Service Worker**: Runs in the background even when the popup is closed
- **Heartbeat Mechanism**: Keeps the connection alive with periodic pings

## Architecture

The extension is built with a modular architecture:

### Core Components

1. **Background Script** (`background.ts`):

   - Initializes the extension
   - Maintains a persistent WebSocket connection
   - Sends periodic keepalive messages
   - Handles browser startup and shutdown events

2. **WebSocket Handler** (`ws.ts`):

   - Manages WebSocket connections
   - Handles message sending and receiving
   - Implements reconnection logic
   - Generates unique access codes

3. **Command Handler** (`commandHandler.ts`):

   - Processes incoming commands from the server
   - Executes browser automation tasks
   - Returns command results to the server
   - Supports a wide range of browser control operations

4. **Type Definitions** (`types.ts`):

   - Defines packet structures for WebSocket communication
   - Enumerates supported command types
   - Provides TypeScript interfaces for type safety

5. **Content Script** (`content.ts`):

   - Runs in the context of web pages
   - Enables direct interaction with page content
   - Executes JavaScript in the page context

6. **Popup UI** (`popup.html`, `popup.ts`):
   - Provides a simple user interface
   - Shows extension status

### Command Types

The extension supports various command types:

#### Navigation Commands

- `goto`: Navigate to a specific URL
- `reload`: Reload the current page
- `back`: Navigate back in history
- `forward`: Navigate forward in history

#### Content Interaction Commands

- `click`: Click on an element
- `type`: Enter text into a form field
- `select`: Select an option from a dropdown
- `hover`: Hover over an element
- `focus`: Focus on an element

#### Content Extraction Commands

- `screenshot`: Capture a screenshot
- `pdf`: Generate a PDF of the page
- `getText`: Extract text content
- `getHtml`: Extract HTML content
- `getAttribute`: Get an attribute value
- `evaluate`: Evaluate JavaScript in the page context

#### Wait Commands

- `waitForSelector`: Wait for an element to appear
- `waitForNavigation`: Wait for navigation to complete
- `waitForTimeout`: Wait for a specified time

#### Browser Control Commands

- `exit`: Close the browser or terminate the session

## Technical Implementation

### WebSocket Communication

The extension establishes a WebSocket connection to a server and maintains it with:

- Automatic reconnection on disconnection
- Periodic ping messages to keep the connection alive
- Proper handling of connection states

### Service Worker Lifecycle

The extension uses Chrome's service worker model:

- Initializes on browser startup or extension installation
- Stays active through periodic alarms
- Handles browser shutdown events
- Preserves state between sessions

### Security Features

- Generates a unique access code for authentication
- Stores the access code securely in Chrome's local storage
- Validates commands before execution

### Error Handling

- Robust error handling for all operations
- Detailed logging for debugging
- Graceful recovery from failures

## Development

### Prerequisites

- Node.js and npm/pnpm
- Chrome browser

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   pnpm install
   ```
3. Build the extension:
   ```
   pnpm run build
   ```
4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

### Development Workflow

- Use `pnpm run watch` for automatic rebuilding during development
- Check the background service worker console for logs
- Test commands through the WebSocket server

## Configuration

The extension can be configured by modifying:

- `data.ts`: Contains WebSocket URL and debug settings
- `manifest.json`: Extension permissions and metadata

## Permissions

The extension requires the following permissions:

- `storage`: To store the access code and state
- `alarms`: For periodic keepalive messages
- `windows`: To detect browser window events
- `tabs`: To interact with browser tabs
- `activeTab`: To access the active tab
- `scripting`: To execute scripts in web pages
- `<all_urls>`: To operate on any website
