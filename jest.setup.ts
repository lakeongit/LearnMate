import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Define WebSocket event types
interface WebSocketEventMap {
  open: Event;
  close: CloseEvent;
  message: MessageEvent;
  error: Event;
}

// Mock WebSocket with proper event handling
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private eventListeners: { [K in keyof WebSocketEventMap]?: Array<(event: WebSocketEventMap[K]) => void> } = {};

  constructor(url: string) {
    this.url = url;
    // Simulate connection success
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  addEventListener<K extends keyof WebSocketEventMap>(type: K, listener: (event: WebSocketEventMap[K]) => void) {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type]!.push(listener);
  }

  removeEventListener<K extends keyof WebSocketEventMap>(type: K, listener: (event: WebSocketEventMap[K]) => void) {
    if (this.eventListeners[type]) {
      this.eventListeners[type] = this.eventListeners[type]!.filter(l => l !== listener);
    }
  }

  send = jest.fn((data: string) => {
    // Simulate message echo for testing
    setTimeout(() => {
      const event = new MessageEvent('message', { data });
      this.dispatchEvent('message', event);
    }, 0);
  });

  close = jest.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      const event = new CloseEvent('close');
      this.onclose(event);
    }
  });

  private dispatchEvent<K extends keyof WebSocketEventMap>(type: K, event: WebSocketEventMap[K]) {
    // Call the specific handler if exists
    const handler = this[`on${type}`] as ((event: WebSocketEventMap[K]) => void) | null;
    if (handler) {
      handler(event);
    }

    // Call all registered listeners
    const listeners = this.eventListeners[type] || [];
    listeners.forEach(listener => listener(event));
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.PERPLEXITY_API_KEY = 'test-key';

// Setup custom jest matchers
expect.extend({
  toHaveBeenCalledWithMatch(received: jest.Mock, expectedObj: object) {
    const pass = received.mock.calls.some(call =>
      JSON.stringify(call[0]).includes(JSON.stringify(expectedObj))
    );
    return {
      pass,
      message: () => `expected ${received} to have been called with an object matching ${expectedObj}`,
    };
  },
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledWithMatch(obj: object): R;
    }
  }
}