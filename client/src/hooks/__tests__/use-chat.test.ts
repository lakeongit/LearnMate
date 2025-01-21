import { renderHook, act } from '@testing-library/react-hooks';
import { useChat } from '../use-chat';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { rest } from 'msw';
import { server } from '../../../mocks/server';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('useChat', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('should initialize with empty messages and default metadata', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useChat(1), { wrapper });

    await waitForNextUpdate();

    expect(result.current.messages).toEqual([]);
    expect(result.current.metadata).toEqual({
      learningStyle: 'visual',
      startTime: expect.any(Number),
    });
  });

  it('should send message and update messages list', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useChat(1), { wrapper });

    await waitForNextUpdate();

    await act(async () => {
      await result.current.sendMessage('Hello', { subject: 'math' });
    });

    expect(result.current.messages).toContainEqual(
      expect.objectContaining({
        content: 'Hello',
        role: 'user',
        status: 'delivered',
      })
    );
  });

  it('should handle errors when sending messages', async () => {
    server.use(
      rest.post('/api/chats/1/messages', (req, res, ctx) =>
        res(ctx.status(500), ctx.text('Server error'))
      )
    );

    const { result, waitForNextUpdate } = renderHook(() => useChat(1), { wrapper });

    await waitForNextUpdate();

    await act(async () => {
      await expect(
        result.current.sendMessage('Hello', { subject: 'math' })
      ).rejects.toThrow();
    });

    expect(result.current.messages).toContainEqual(
      expect.objectContaining({
        content: 'Hello',
        status: 'error',
      })
    );
  });

  it('should update learning style', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useChat(1), { wrapper });

    await waitForNextUpdate();

    await act(async () => {
      await result.current.updateLearningStyle('kinesthetic');
    });

    expect(result.current.metadata.learningStyle).toBe('kinesthetic');
  });

  it('should clear messages when ending session', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useChat(1), { wrapper });

    await waitForNextUpdate();

    // Send a message first
    await act(async () => {
      await result.current.sendMessage('Hello', { subject: 'math' });
    });

    expect(result.current.messages.length).toBeGreaterThan(0);

    // Clear messages
    await act(async () => {
      await result.current.clearMessages();
    });

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.metadata).toEqual({
      learningStyle: 'visual',
      startTime: expect.any(Number),
    });
  });
});