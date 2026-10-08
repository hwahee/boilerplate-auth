import { beforeEach, describe, expect, test } from 'bun:test';

import { nowUtc } from '@shared/time';

import { createFakeHydra } from '../identity/fake-hydra';
import { NotFoundError } from '../lib/errors';
import {
  createMemoryMembershipRepository,
  createMemoryUserRepository,
  MemoryStore,
} from '../repositories/memory';
import { IdentityService } from './identity-service';

let store: MemoryStore;
let hydra: ReturnType<typeof createFakeHydra>;
let service: IdentityService;

beforeEach(async () => {
  store = new MemoryStore();
  hydra = createFakeHydra();
  const users = createMemoryUserRepository(store);
  service = new IdentityService({
    hydra,
    users,
    memberships: createMemoryMembershipRepository(store),
  });
  await users.insert({
    id: 'alice',
    displayName: 'Alice',
    bio: null,
    createdAt: nowUtc(),
  });
});

const servicesOf = (userId: string) => createMemoryMembershipRepository(store).servicesOf(userId);

describe('IdentityService — login', () => {
  test('someone Hydra remembers goes straight back, joining the service', async () => {
    const challenge = hydra.startLogin({ clientId: 'todo-app', rememberedAs: 'alice' });
    const resumed = await service.resumeLogin(challenge);
    expect(resumed.redirectTo).toContain(challenge);
    expect(hydra.answers.get(challenge)).toEqual({ subject: 'alice' });
    expect(await servicesOf('alice')).toEqual(['todo-app']);
  });

  test('a member signed in here goes straight back too', async () => {
    const challenge = hydra.startLogin();
    const resumed = await service.resumeLogin(challenge, 'alice');
    expect(resumed.redirectTo).not.toBeNull();
    expect(hydra.answers.get(challenge)).toEqual({ subject: 'alice' });
  });

  test('otherwise the page asks, naming the service', async () => {
    const challenge = hydra.startLogin({ clientId: 'todo-app', clientName: 'Todo App' });
    expect(await service.resumeLogin(challenge)).toEqual({
      redirectTo: null,
      service: { id: 'todo-app', name: 'Todo App' },
    });
    // A session naming a member that no longer exists doesn't count.
    expect((await service.resumeLogin(challenge, 'ghost')).redirectTo).toBeNull();
    expect(hydra.answers.has(challenge)).toBe(false);
  });

  test('signing in on the page answers the request and joins the service once', async () => {
    const first = hydra.startLogin({ clientId: 'chat-app' });
    await service.completeLogin(first, 'alice');
    const second = hydra.startLogin({ clientId: 'chat-app' });
    await service.completeLogin(second, 'alice');
    expect(await servicesOf('alice')).toEqual(['chat-app']);
  });

  test('a request answered once is gone', async () => {
    const challenge = hydra.startLogin();
    await service.completeLogin(challenge, 'alice');
    await expect(service.completeLogin(challenge, 'alice')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('IdentityService — consent and logout', () => {
  test('consent is granted as asked, with the nickname as the name claim', async () => {
    const challenge = hydra.startConsent('alice', ['openid', 'profile']);
    await service.consent(challenge);
    expect(hydra.answers.get(challenge)).toEqual({
      scope: ['openid', 'profile'],
      audience: [],
      idToken: { name: 'Alice' },
    });
  });

  test('the logout request names who is signing out, and whether it was confirmed here', async () => {
    const asked = hydra.startLogout({ subject: 'alice' });
    expect(await service.logoutRequest(asked)).toEqual({ displayName: 'Alice', confirmed: false });

    const confirmed = hydra.startLogout({
      subject: 'alice',
      requestUrl: service.confirmedLogoutUrl(),
    });
    expect((await service.logoutRequest(confirmed)).confirmed).toBe(true);

    const unknown = hydra.startLogout({ subject: null });
    expect(await service.logoutRequest(unknown)).toEqual({ displayName: null, confirmed: false });
  });

  test('without Hydra the flows are 404 and a confirmed sign-out ends on /logged-out', async () => {
    const alone = new IdentityService({
      hydra: null,
      users: createMemoryUserRepository(store),
      memberships: createMemoryMembershipRepository(store),
    });
    await expect(alone.resumeLogin('login-1')).rejects.toBeInstanceOf(NotFoundError);
    expect(alone.confirmedLogoutUrl()).toBe('/logged-out');
  });
});
