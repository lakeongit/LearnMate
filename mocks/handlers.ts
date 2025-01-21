import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth endpoints
  http.post('/api/login', () => {
    return HttpResponse.json({
      message: 'Successfully logged in',
      user: {
        id: 1,
        username: 'testuser',
        name: 'Test User',
        grade: 10,
        learningStyle: 'visual',
        subjects: ['math', 'science'],
      }
    });
  }),

  // Chat endpoints
  http.get('/api/chats/:userId', () => {
    return HttpResponse.json({
      messages: [],
      metadata: {
        learningStyle: 'visual',
        startTime: Date.now(),
      },
    });
  }),

  http.post('/api/chats/:userId/messages', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      messages: [
        {
          role: 'user',
          content: body.content,
          status: 'delivered',
        },
        {
          role: 'assistant',
          content: 'This is a mock response',
          status: 'delivered',
        },
      ],
      metadata: {
        learningStyle: 'visual',
        startTime: Date.now(),
      },
    });
  }),

  // Achievement endpoints
  http.get('/api/achievements/:userId', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'First Steps',
        description: 'Complete your first learning session',
        badgeIcon: 'svg-icon',
        rarity: 'common',
        earned: null,
        progress: 0,
      },
    ]);
  }),

  // Learning content endpoints
  http.get('/api/learning-content/:userId', () => {
    return HttpResponse.json([
      {
        id: 1,
        title: 'Introduction to Algebra',
        description: 'Learn the basics of algebra',
        estimatedDuration: 30,
        difficulty: 1,
        grade: 10,
        progress: [],
      },
    ]);
  }),

  http.put('/api/chats/:userId/learning-style', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      messages: [],
      metadata: {
        learningStyle: body.learningStyle,
        startTime: Date.now(),
      },
    });
  }),

  http.post('/api/chats/:userId/end-session', () => {
    return HttpResponse.json({
      messages: [],
      metadata: {
        learningStyle: 'visual',
        startTime: Date.now(),
      },
    });
  }),
];