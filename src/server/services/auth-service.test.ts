import { beforeEach, describe, expect, test } from 'bun:test';

import { UnauthorizedError } from '../lib/errors';
import {
  createMemoryAuditLogRepository,
  createMemoryUnitOfWork,
  createMemoryUserRepository,
  MemoryStore,
} from '../repositories/memory';
import { AuthService } from './auth-service';

let store: MemoryStore;
let service: AuthService;

beforeEach(() => {
  store = new MemoryStore();
  service = new AuthService({
    users: createMemoryUserRepository(store),
    auditLogs: createMemoryAuditLogRepository(store),
    uow: createMemoryUnitOfWork(store),
  });
});

describe('AuthService.devLogin', () => {
  test('the first sign-in creates the user and audits it in the same transaction', async () => {
    const user = await service.devLogin('alice');
    expect(user).toMatchObject({ id: 'alice', displayName: 'alice' });
    expect(store.users.get('alice')).toEqual(user);
    expect(store.auditLogs).toHaveLength(1);
    expect(store.auditLogs[0]).toMatchObject({
      entityType: 'user',
      entityId: 'alice',
      action: 'user.created',
    });
  });

  test('signing in again returns the same user and writes nothing', async () => {
    const first = await service.devLogin('alice');
    const again = await service.devLogin('alice');
    expect(again).toEqual(first);
    expect(store.auditLogs).toHaveLength(1);
  });
});

describe('AuthService.currentUser', () => {
  test('returns the signed-in user', async () => {
    await service.devLogin('alice');
    expect((await service.currentUser('alice')).id).toBe('alice');
  });

  test('no session, or a session naming an unknown user, is unauthorized', async () => {
    await expect(service.currentUser(undefined)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(service.currentUser('ghost')).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
