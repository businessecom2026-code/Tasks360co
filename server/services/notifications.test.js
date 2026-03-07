import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addConnection, sendToUser, createNotification, notifyWorkspace } from './notifications.js';

describe('SSE Connection Manager', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      write: vi.fn(),
      on: vi.fn(),
    };
  });

  it('should register a connection and clean up on close', () => {
    const userId = 'user-1';
    addConnection(userId, mockRes);

    // Should register close handler
    expect(mockRes.on).toHaveBeenCalledWith('close', expect.any(Function));

    // Sending should work
    sendToUser(userId, 'test', { hello: 'world' });
    expect(mockRes.write).toHaveBeenCalledWith(
      expect.stringContaining('event: test')
    );
    expect(mockRes.write).toHaveBeenCalledWith(
      expect.stringContaining('"hello":"world"')
    );
  });

  it('should send data in SSE format', () => {
    const userId = 'user-2';
    addConnection(userId, mockRes);

    sendToUser(userId, 'notification', { id: '123', title: 'Test' });

    const written = mockRes.write.mock.calls[0][0];
    expect(written).toMatch(/^event: notification\ndata: /);
    expect(written).toContain('"id":"123"');
    expect(written.endsWith('\n\n')).toBe(true);
  });

  it('should not crash when sending to non-existent user', () => {
    expect(() => sendToUser('nobody', 'test', {})).not.toThrow();
  });

  it('should remove connection on close callback', () => {
    const userId = 'user-3';
    addConnection(userId, mockRes);

    // Get the close callback
    const closeCallback = mockRes.on.mock.calls.find(c => c[0] === 'close')[1];
    closeCallback();

    // Should no longer send
    mockRes.write.mockClear();
    sendToUser(userId, 'test', {});
    expect(mockRes.write).not.toHaveBeenCalled();
  });

  it('should support multiple connections per user', () => {
    const userId = 'user-4';
    const mockRes2 = { write: vi.fn(), on: vi.fn() };

    addConnection(userId, mockRes);
    addConnection(userId, mockRes2);

    sendToUser(userId, 'ping', { ok: true });

    expect(mockRes.write).toHaveBeenCalledTimes(1);
    expect(mockRes2.write).toHaveBeenCalledTimes(1);
  });

  it('should handle write errors gracefully', () => {
    const userId = 'user-5';
    mockRes.write.mockImplementation(() => { throw new Error('broken pipe'); });
    addConnection(userId, mockRes);

    expect(() => sendToUser(userId, 'test', {})).not.toThrow();
  });
});

describe('createNotification', () => {
  it('should create a notification and push via SSE', async () => {
    const mockPrisma = {
      notification: {
        create: vi.fn().mockResolvedValue({
          id: 'notif-1',
          userId: 'user-1',
          type: 'task_assigned',
          title: 'Test',
          body: 'Body',
          read: false,
          createdAt: new Date().toISOString(),
        }),
      },
    };

    const result = await createNotification(mockPrisma, {
      userId: 'user-1',
      workspaceId: 'ws-1',
      type: 'task_assigned',
      title: 'Test',
      body: 'Body',
    });

    expect(result).not.toBeNull();
    expect(result.id).toBe('notif-1');
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        workspaceId: 'ws-1',
        type: 'task_assigned',
        title: 'Test',
      }),
    });
  });

  it('should return null on error', async () => {
    const mockPrisma = {
      notification: {
        create: vi.fn().mockRejectedValue(new Error('DB error')),
      },
    };

    const result = await createNotification(mockPrisma, {
      userId: 'user-1',
      type: 'test',
      title: 'Test',
    });

    expect(result).toBeNull();
  });
});

describe('notifyWorkspace', () => {
  it('should create notifications for all workspace members except excluded user', async () => {
    const mockPrisma = {
      membership: {
        findMany: vi.fn().mockResolvedValue([
          { userId: 'user-1' },
          { userId: 'user-2' },
          { userId: 'user-3' },
        ]),
      },
      notification: {
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: `notif-${data.userId}`, ...data, read: false, createdAt: new Date().toISOString() })
        ),
      },
    };

    const results = await notifyWorkspace(mockPrisma, {
      workspaceId: 'ws-1',
      type: 'task_moved',
      title: 'Task moved',
      body: 'Test → DONE',
      excludeUserId: 'user-1',
    });

    // Should notify user-2 and user-3, not user-1
    expect(results).toHaveLength(2);
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);

    const createdUserIds = mockPrisma.notification.create.mock.calls.map(
      c => c[0].data.userId
    );
    expect(createdUserIds).not.toContain('user-1');
    expect(createdUserIds).toContain('user-2');
    expect(createdUserIds).toContain('user-3');
  });

  it('should skip null userIds', async () => {
    const mockPrisma = {
      membership: {
        findMany: vi.fn().mockResolvedValue([
          { userId: null },
          { userId: 'user-2' },
        ]),
      },
      notification: {
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'n1', ...data, read: false, createdAt: new Date().toISOString() })
        ),
      },
    };

    const results = await notifyWorkspace(mockPrisma, {
      workspaceId: 'ws-1',
      type: 'test',
      title: 'Test',
    });

    expect(results).toHaveLength(1);
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
  });
});
