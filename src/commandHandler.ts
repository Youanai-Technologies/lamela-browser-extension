/**
 * Command Handler for Lamela Browser Extension
 * Processes commands received from the server and executes web scraping operations
 */

import { debugLog } from './data';
import { CommandPacket, CommandResultPacket, CommandType, PacketType } from './types';
import { sendWebSocketMessage } from './ws';

export class CommandHandler {
  /**
   * Process a command received from the server
   * @param packet The command packet
   */
  public static async processCommand(packet: CommandPacket): Promise<void> {
    const { commandId, command, params, accessCode } = packet.data;
    debugLog(`Received command: ${command}`, params);

    let result = null;
    let success = true;
    let error = null;

    try {
      // Execute the command
      debugLog(`Executing command: ${command}`);
      result = await this.executeCommand(command, params);
      debugLog(`Command ${command} executed successfully:`, result);
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
      debugLog(`Error executing command ${command}:`, err);
    }

    // Send result back to server
    await this.sendCommandResult(commandId, accessCode, success, result, error);
  }

  /**
   * Send command result back to the server
   */
  private static async sendCommandResult(
    commandId: string,
    accessCode: string,
    success: boolean,
    result: any,
    error: string | null
  ): Promise<void> {
    debugLog(`Sending command result for ${commandId}:`, { success, result, error });

    const resultPacket: CommandResultPacket = {
      type: PacketType.COMMAND_RESULT,
      data: {
        commandId,
        accessCode,
        success,
        result,
        error: error || undefined,
        timestamp: Date.now()
      }
    };

    await sendWebSocketMessage(resultPacket);
  }

  /**
   * Execute a command based on its type
   * @param command The command type
   * @param params Command parameters
   * @returns Result of the command execution
   */
  private static async executeCommand(command: CommandType, params: Record<string, any>): Promise<any> {
    switch (command) {
      // Navigation commands
      case CommandType.GOTO:
        return await this.navigateToUrl(params.url);
      case CommandType.RELOAD:
        return await this.reloadPage();
      case CommandType.BACK:
        return await this.navigateBack();
      case CommandType.FORWARD:
        return await this.navigateForward();

      // Content interaction commands
      case CommandType.CLICK:
        return await this.clickElement(params.selector);
      case CommandType.TYPE:
        return await this.fillForm(params.selector, params.text);
      case CommandType.SELECT:
        return await this.selectOption(params.selector, params.value);
      case CommandType.HOVER:
        return await this.hoverElement(params.selector);
      case CommandType.FOCUS:
        return await this.focusElement(params.selector);

      // Content extraction commands
      case CommandType.GET_TEXT:
        return await this.extractText(params.selector);
      case CommandType.GET_HTML:
        return await this.extractHtml(params.selector);
      case CommandType.GET_ATTRIBUTE:
        return await this.extractAttribute(params.selector, params.attribute);
      case CommandType.EVALUATE:
        return await this.evaluateFunction(params.function, params.arguments);

      // Wait commands
      case CommandType.WAIT_FOR_SELECTOR:
        return await this.waitForElement(params.selector, params.timeout);
      case CommandType.WAIT_FOR_NAVIGATION:
        return await this.waitForNavigation(params.timeout);
      case CommandType.WAIT_FOR_TIMEOUT:
        return await this.waitForTimeout(params.timeout);

      // Browser control commands
      case CommandType.EXIT:
        return this.handleExit();

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  /**
   * Navigate to a URL
   * @param url The URL to navigate to
   */
  private static async navigateToUrl(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
          // Create a new tab if none exists
          chrome.tabs.create({ url }, (tab) => {
            this.waitForTabLoad(tab.id as number)
              .then(() => resolve({ success: true, url }))
              .catch(reject);
          });
        } else {
          // Update existing tab
          chrome.tabs.update(tabs[0].id as number, { url }, (tab) => {
            this.waitForTabLoad(tab?.id as number)
              .then(() => resolve({ success: true, url }))
              .catch(reject);
          });
        }
      });
    });
  }

  /**
   * Reload the current page
   */
  private static async reloadPage(): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
          reject(new Error('No active tab found'));
          return;
        }

        const tabId = tabs[0].id as number;
        chrome.tabs.reload(tabId, {}, () => {
          this.waitForTabLoad(tabId)
            .then(() => resolve({ success: true }))
            .catch(reject);
        });
      });
    });
  }

  /**
   * Navigate back in history
   */
  private static async navigateBack(): Promise<any> {
    return this.executeScriptInActiveTab(`
      window.history.back();
      return { success: true };
    `);
  }

  /**
   * Navigate forward in history
   */
  private static async navigateForward(): Promise<any> {
    return this.executeScriptInActiveTab(`
      window.history.forward();
      return { success: true };
    `);
  }

  /**
   * Wait for a tab to finish loading
   * @param tabId The ID of the tab
   */
  private static waitForTabLoad(tabId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const listener = (changedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (changedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };

      chrome.tabs.onUpdated.addListener(listener);

      // Set a timeout to prevent hanging
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(); // Resolve anyway after timeout
      }, 30000);
    });
  }

  /**
   * Click an element on the page
   * @param selector CSS selector for the element
   */
  private static async clickElement(selector: string): Promise<any> {
    return this.executeScriptInActiveTab(`
      const element = document.querySelector('${this.escapeString(selector)}');
      if (!element) throw new Error('Element not found: ${this.escapeString(selector)}');
      element.click();
      return { clicked: true, selector: '${this.escapeString(selector)}' };
    `);
  }

  /**
   * Fill a form element with text
   * @param selector CSS selector for the form element
   * @param text Text to fill
   */
  private static async fillForm(selector: string, text: string): Promise<any> {
    return this.executeScriptInActiveTab(`
      const element = document.querySelector('${this.escapeString(selector)}');
      if (!element) throw new Error('Form element not found: ${this.escapeString(selector)}');
      
      element.value = '${this.escapeString(text)}';
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      
      return { filled: true, selector: '${this.escapeString(selector)}' };
    `);
  }

  /**
   * Select an option in a select element
   * @param selector CSS selector for the select element
   * @param value Value to select
   */
  private static async selectOption(selector: string, value: string): Promise<any> {
    return this.executeScriptInActiveTab(`
      const select = document.querySelector('${this.escapeString(selector)}');
      if (!select) throw new Error('Select element not found: ${this.escapeString(selector)}');
      
      select.value = '${this.escapeString(value)}';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      
      return { selected: true, selector: '${this.escapeString(selector)}', value: '${this.escapeString(value)}' };
    `);
  }

  /**
   * Hover over an element
   * @param selector CSS selector for the element
   */
  private static async hoverElement(selector: string): Promise<any> {
    return this.executeScriptInActiveTab(`
      const element = document.querySelector('${this.escapeString(selector)}');
      if (!element) throw new Error('Element not found: ${this.escapeString(selector)}');
      
      element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      
      return { hovered: true, selector: '${this.escapeString(selector)}' };
    `);
  }

  /**
   * Focus an element
   * @param selector CSS selector for the element
   */
  private static async focusElement(selector: string): Promise<any> {
    return this.executeScriptInActiveTab(`
      const element = document.querySelector('${this.escapeString(selector)}');
      if (!element) throw new Error('Element not found: ${this.escapeString(selector)}');
      
      element.focus();
      
      return { focused: true, selector: '${this.escapeString(selector)}' };
    `);
  }

  /**
   * Extract text from elements on the page
   * @param selector CSS selector for the elements
   */
  private static async extractText(selector: string): Promise<any> {
    return this.executeScriptInActiveTab(`
      const elements = Array.from(document.querySelectorAll('${this.escapeString(selector)}'));
      if (elements.length === 0) throw new Error('No elements found: ${this.escapeString(selector)}');
      
      return elements.map(el => el.innerText || el.textContent);
    `);
  }

  /**
   * Extract HTML from elements on the page
   * @param selector CSS selector for the elements
   */
  private static async extractHtml(selector: string): Promise<any> {
    return this.executeScriptInActiveTab(`
      const elements = Array.from(document.querySelectorAll('${this.escapeString(selector)}'));
      if (elements.length === 0) throw new Error('No elements found: ${this.escapeString(selector)}');
      
      return elements.map(el => el.outerHTML);
    `);
  }

  /**
   * Extract an attribute from elements on the page
   * @param selector CSS selector for the elements
   * @param attribute Attribute to extract
   */
  private static async extractAttribute(selector: string, attribute: string): Promise<any> {
    return this.executeScriptInActiveTab(`
      const elements = Array.from(document.querySelectorAll('${this.escapeString(selector)}'));
      if (elements.length === 0) throw new Error('No elements found: ${this.escapeString(selector)}');
      
      return elements.map(el => el.getAttribute('${this.escapeString(attribute)}'));
    `);
  }

  /**
   * Evaluate a JavaScript function in the page context
   * @param functionStr The function to evaluate as a string
   * @param argsStr The arguments to pass to the function as a JSON string
   */
  private static async evaluateFunction(functionStr: string, argsStr: string): Promise<any> {
    // Parse the arguments
    let args: any[] = [];
    try {
      args = JSON.parse(argsStr || '[]');
    } catch (error) {
      console.error('Error parsing function arguments:', error);
    }

    // Create a script that will execute the function with the provided arguments
    const script = `
      (function() {
        try {
          // Convert the function string to an actual function
          const fn = ${functionStr};
          
          // Call the function with the provided arguments
          return fn.apply(null, ${JSON.stringify(args)});
        } catch (error) {
          return { error: error.message || 'Unknown error during evaluation' };
        }
      })();
    `;

    // Execute the script in the page context
    const result = await this.executeScriptInActiveTab(script);

    // Check if there was an error during execution
    if (result && result.error) {
      throw new Error(result.error);
    }

    return result;
  }

  /**
   * Wait for an element to appear on the page
   * @param selector CSS selector for the element
   * @param timeout Timeout in milliseconds
   */
  private static async waitForElement(selector: string, timeout: number = 10000): Promise<any> {
    return this.executeScriptInActiveTab(`
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkElement = () => {
          const element = document.querySelector('${this.escapeString(selector)}');
          if (element) {
            resolve({ found: true, selector: '${this.escapeString(selector)}' });
            return;
          }
          
          if (Date.now() - startTime > ${timeout}) {
            reject(new Error('Timeout waiting for element: ${this.escapeString(selector)}'));
            return;
          }
          
          setTimeout(checkElement, 100);
        };
        
        checkElement();
      });
    `);
  }

  /**
   * Wait for navigation to complete
   * @param timeout Timeout in milliseconds
   */
  private static async waitForNavigation(timeout: number = 30000): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
          reject(new Error('No active tab found'));
          return;
        }

        const tabId = tabs[0].id as number;
        let timeoutId: number | null = null;

        const listener = (changedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
          if (changedTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            if (timeoutId) clearTimeout(timeoutId);
            resolve({ success: true });
          }
        };

        chrome.tabs.onUpdated.addListener(listener);

        // Set a timeout to prevent hanging
        timeoutId = setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve({ success: true, timedOut: true });
        }, timeout) as unknown as number;
      });
    });
  }

  /**
   * Wait for a specified amount of time
   * @param timeout Time to wait in milliseconds
   */
  private static async waitForTimeout(timeout: number = 1000): Promise<any> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ success: true, waited: timeout });
      }, timeout);
    });
  }

  /**
   * Execute a script in the active tab
   * @param scriptString The script to execute
   */
  private static async executeScriptInActiveTab(scriptString: string): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
          reject(new Error('No active tab found'));
          return;
        }

        chrome.tabs.executeScript(
          tabs[0].id as number,
          { code: `(function() { ${scriptString} })()` },
          (results) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            resolve(results?.[0]);
          }
        );
      });
    });
  }

  /**
   * Handle exit command
   */
  private static handleExit(): any {
    console.log('Received exit command');
    return { exited: true };
  }

  /**
   * Escape a string for use in JavaScript
   * @param str The string to escape
   */
  private static escapeString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
  }
} 
