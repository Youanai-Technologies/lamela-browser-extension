/**
 * Types for Lamela Browser Extension
 */

// Command types that can be received from the server
export enum CommandType {
  // Navigation commands
  GOTO = 'goto',
  RELOAD = 'reload',
  BACK = 'back',
  FORWARD = 'forward',

  // Content interaction commands
  CLICK = 'click',
  TYPE = 'type',
  SELECT = 'select',
  HOVER = 'hover',
  FOCUS = 'focus',

  // Content extraction commands
  SCREENSHOT = 'screenshot',
  PDF = 'pdf',
  GET_TEXT = 'getText',
  GET_HTML = 'getHtml',
  GET_ATTRIBUTE = 'getAttribute',
  EVALUATE = 'evaluate',

  // Wait commands
  WAIT_FOR_SELECTOR = 'waitForSelector',
  WAIT_FOR_NAVIGATION = 'waitForNavigation',
  WAIT_FOR_TIMEOUT = 'waitForTimeout',

  // Browser control commands
  EXIT = 'exit'
}

// Packet types for WebSocket communication
export enum PacketType {
  COMMAND = 'COMMAND',
  COMMAND_RESULT = 'COMMAND_RESULT',
  INIT = 'INIT',
  EXIT = 'EXIT',
  PING = 'PING',
  PONG = 'PONG',
  ERROR = 'ERROR'
}

// Command packet structure
export interface CommandPacket {
  type: PacketType.COMMAND;
  data: {
    accessCode: string;
    commandId: string;
    command: CommandType;
    params: Record<string, any>;
    timestamp: number;
  };
}

// Command result packet structure
export interface CommandResultPacket {
  type: PacketType.COMMAND_RESULT;
  data: {
    commandId: string;
    accessCode: string;
    success: boolean;
    result?: any;
    error?: string;
    timestamp: number;
  };
}

// Init packet structure
export interface InitPacket {
  type: PacketType.INIT;
  data: {
    accessCode: string;
    userAgent: string;
    isOnline: boolean;
    lastOnline: Date;
  };
}

// Union type for all packet types
export type Packet =
  | CommandPacket
  | CommandResultPacket
  | InitPacket
  | { type: PacketType.EXIT; data: any }
  | { type: PacketType.PING; data: any }
  | { type: PacketType.PONG; data: any }
  | { type: PacketType.ERROR; data: any }; 
