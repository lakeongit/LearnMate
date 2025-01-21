import session from "express-session";
import createMemoryStore from "memorystore";
import type { ChatMessage } from "@db/schema";

// Custom type for session data
declare module "express-session" {
  interface SessionData {
    [key: string]: string;
  }
}

// Create MemoryStore instance with session
const Session = createMemoryStore(session);
const store = new Session({
  checkPeriod: 86400000 // Prune expired entries daily
});

interface QueuedMessage {
  id: string;
  userId: number;
  content: string;
  context?: Record<string, any>;
  timestamp: number;
  retries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  userMessage?: ChatMessage;
  assistantMessage?: ChatMessage;
  error?: string;
}

class MessageQueue {
  private store: typeof store;
  private processInterval: NodeJS.Timeout | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly PROCESS_INTERVAL = 1000; // 1 second
  private readonly MAX_CONCURRENT = 5;
  private processing = new Set<string>();

  constructor() {
    this.store = store;
  }

  async enqueue(userId: number, content: string, context?: Record<string, any>): Promise<string> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message: QueuedMessage = {
      id,
      userId,
      content,
      context,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };

    await new Promise<void>((resolve, reject) => {
      this.store.set(id, JSON.stringify(message) as any, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    console.log(`Enqueued message: ${id}`);
    return id;
  }

  async dequeue(): Promise<QueuedMessage | null> {
    return new Promise((resolve) => {
      this.store.all((error, messages) => {
        if (error) {
          console.error('Error getting messages:', error);
          resolve(null);
          return;
        }

        if (!messages) {
          resolve(null);
          return;
        }

        try {
          // Find oldest pending message that isn't currently processing
          const entries = Object.entries(messages as Record<string, any>);
          for (const [key, value] of entries) {
            try {
              const message: QueuedMessage = JSON.parse(value as string);
              if (message.status === 'pending' && !this.processing.has(message.id)) {
                resolve(message);
                return;
              }
            } catch (e) {
              console.error('Error parsing message:', e);
            }
          }
          resolve(null);
        } catch (e) {
          console.error('Error processing messages:', e);
          resolve(null);
        }
      });
    });
  }

  async updateStatus(id: string, status: QueuedMessage['status'], updates: Partial<QueuedMessage> = {}): Promise<void> {
    const message = await new Promise<QueuedMessage | null>((resolve) => {
      this.store.get(id, (error, value) => {
        if (error) {
          console.error('Error getting message for status update:', error);
          resolve(null);
          return;
        }
        try {
          resolve(value ? JSON.parse(value as string) : null);
        } catch (e) {
          console.error('Error parsing message:', e);
          resolve(null);
        }
      });
    });

    if (message) {
      const updatedMessage = {
        ...message,
        ...updates,
        status,
      };

      await new Promise<void>((resolve, reject) => {
        this.store.set(id, JSON.stringify(updatedMessage) as any, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  }

  async processMessage(
    message: QueuedMessage, 
    processor: (msg: QueuedMessage) => Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage; }>
  ): Promise<void> {
    this.processing.add(message.id);

    try {
      const result = await processor(message);
      await this.updateStatus(message.id, 'completed', result);
      console.log(`Successfully processed message: ${message.id}`);
    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error);
      message.retries++;

      if (message.retries >= this.MAX_RETRIES) {
        await this.updateStatus(message.id, 'failed', { 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`Message ${message.id} failed after ${this.MAX_RETRIES} retries`);
      } else {
        await this.updateStatus(message.id, 'pending');
        console.log(`Message ${message.id} will be retried. Attempt ${message.retries}/${this.MAX_RETRIES}`);
      }
    } finally {
      this.processing.delete(message.id);
    }
  }

  start(processor: (msg: QueuedMessage) => Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage; }>): void {
    if (this.processInterval) return;

    this.processInterval = setInterval(async () => {
      // Only process up to MAX_CONCURRENT messages at once
      if (this.processing.size >= this.MAX_CONCURRENT) return;

      const message = await this.dequeue();
      if (message) {
        this.processMessage(message, processor).catch(error => {
          console.error('Error in message processing:', error);
        });
      }
    }, this.PROCESS_INTERVAL);

    console.log('Message queue processor started');
  }

  stop(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      console.log('Message queue processor stopped');
    }
  }

  async getStatus(id: string): Promise<QueuedMessage | null> {
    return new Promise((resolve) => {
      this.store.get(id, (error, value) => {
        if (error) {
          console.error('Error getting message status:', error);
          resolve(null);
          return;
        }
        try {
          resolve(value ? JSON.parse(value as string) : null);
        } catch (e) {
          console.error('Error parsing message:', e);
          resolve(null);
        }
      });
    });
  }
}

export const messageQueue = new MessageQueue();