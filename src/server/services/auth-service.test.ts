import { beforeEach, describe, expect, test } from 'bun:test';

import { ConflictError, NotFoundError, UnauthorizedError } from '../lib/errors';
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

describe('AuthService.signUp', () => {
  test('registers the member and audits it in the same transaction', async () => {
    const user = await service.signUp({
      userId: 'alice',
      displayName: '  Alice  ',
      bio: '  Hello!  ',
    });
    expect(user).toMatchObject({ id: 'alice', displayName: 'Alice', bio: 'Hello!' });
    expect(store.users.get('alice')).toEqual(user);
    expect(store.auditLogs).toHaveLength(1);
    expect(store.auditLogs[0]).toMatchObject({
      entityType: 'user',
      entityId: 'alice',
      action: 'user.created',
    });
  });

  test('a missing or blank bio is stored as null', async () => {
    expect((await service.signUp({ userId: 'a', displayName: 'A' })).bio).toBeNull();
    expect((await service.signUp({ userId: 'b', displayName: 'B', bio: '   ' })).bio).toBeNull();
  });

  test('a taken id is a conflict, and nothing is written', async () => {
    await service.signUp({ userId: 'alice', displayName: 'Alice' });
    await expect(service.signUp({ userId: 'alice', displayName: 'Other' })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(store.users.get('alice')?.displayName).toBe('Alice');
    expect(store.auditLogs).toHaveLength(1);
  });
});

describe('AuthService.login', () => {
  test('a registered id signs in as that member', async () => {
    const user = await service.signUp({ userId: 'alice', displayName: 'Alice' });
    expect(await service.login('alice')).toEqual(user);
  });

  test('an id nobody signed up with is not found — sign-in never creates a member', async () => {
    await expect(service.login('ghost')).rejects.toBeInstanceOf(NotFoundError);
    expect(store.users.size).toBe(0);
  });
});

describe('AuthService.currentUser', () => {
  test('returns the signed-in user', async () => {
    await service.signUp({ userId: 'alice', displayName: 'Alice' });
    expect((await service.currentUser('alice')).id).toBe('alice');
  });

  test('no session, or a session naming an unknown user, is unauthorized', async () => {
    await expect(service.currentUser(undefined)).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(service.currentUser('ghost')).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
