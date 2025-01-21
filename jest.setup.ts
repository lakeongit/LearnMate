import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock WebSocket
class MockWebSocket {
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  send = jest.fn();
  close = jest.fn();
}

global.WebSocket = MockWebSocket as any;

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
