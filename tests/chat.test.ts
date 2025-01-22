import WebSocket from 'ws';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';

describe('Chat System Integration Tests', () => {
  let ws: WebSocket;
  const TEST_USER_ID = 1;
  const SERVER_URL = 'ws://localhost:5000/ws';

  beforeAll((done) => {
    ws = new WebSocket(SERVER_URL);
    ws.on('open', () => {
      // Register the test user
      ws.send(JSON.stringify({ type: 'register', userId: TEST_USER_ID }));
      done();
    });

    ws.on('error', (error) => {
      console.error('WebSocket connection error:', error);
      done(error);
    });
  });

  afterAll(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  // Helper function to send message and wait for response
  const sendMessageAndWaitForResponse = (message: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Response timeout'));
      }, 5000);

      const messageHandler = (event: WebSocket.RawData) => {
        clearTimeout(timeout);
        try {
          const response = JSON.parse(event.toString());
          ws.removeListener('message', messageHandler);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      };

      ws.on('message', messageHandler);

      ws.send(JSON.stringify({
        type: 'message',
        content: message,
        userId: TEST_USER_ID,
        context: {
          subject: 'Mathematics',
          topic: 'Algebra',
          learningStyle: 'visual',
          sessionDuration: 300
        }
      }));
    });
  };

  // Test basic message sending
  it('should successfully send a message and receive a response', async () => {
    const response = await sendMessageAndWaitForResponse('What is algebra?');
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
  }, 10000);

  // Test typing status updates
  it('should receive typing status updates', async () => {
    return new Promise((resolve) => {
      const typingHandler = (event: WebSocket.RawData) => {
        const data = JSON.parse(event.toString());
        if (data.type === 'typing_status') {
          expect(data.isTyping).toBeDefined();
          ws.removeListener('message', typingHandler);
          resolve(true);
        }
      };

      ws.on('message', typingHandler);
      ws.send(JSON.stringify({
        type: 'message',
        content: 'Tell me about equations',
        userId: TEST_USER_ID
      }));
    });
  }, 10000);

  // Test error handling
  it('should handle malformed messages gracefully', async () => {
    ws.send('malformed message');

    return new Promise((resolve) => {
      ws.once('message', (event: WebSocket.RawData) => {
        const response = JSON.parse(event.toString());
        expect(response.error).toBeDefined();
        resolve(true);
      });
    });
  });

  // Test subject-specific queries
  it('should handle subject-specific messages', async () => {
    const response = await sendMessageAndWaitForResponse('[Mathematics] What is the quadratic formula?');
    expect(response).toBeDefined();
    expect(response.subject).toBe('Mathematics');
  }, 10000);

  // Test session management
  it('should maintain session context', async () => {
    // First message to establish context
    await sendMessageAndWaitForResponse('Let\'s learn about polynomials');

    // Follow-up message should maintain context
    const response = await sendMessageAndWaitForResponse('Can you give me an example?');
    expect(response).toBeDefined();
    expect(response.context).toBeDefined();
    expect(response.context.subject).toBe('Mathematics');
  }, 20000);
});