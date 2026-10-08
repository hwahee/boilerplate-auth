/**
 * Sign-up and sign-in logic — pure of HTTP concerns (cookies live in
 * src/server/auth).
 *
 * Signing up and signing in are separate steps: sign-up registers an id
 * (taken → ConflictError), sign-in accepts only a registered id (unknown →
 * NotFoundError). There is no password at either step (CLAUDE.md).
 */
import type { SignUpInput, User } from '@shared/domain/user';
import { nowUtc } from '@shared/time';

import { ConflictError, NotFoundError, UnauthorizedError } from '../lib/errors';
import type { AuditLogRepository, UnitOfWork, UserRepository } from '../repositories/types';

interface AuthServiceDeps {
  users: UserRepository;
  auditLogs: AuditLogRepository;
  uow: UnitOfWork;
}

export class AuthService {
  constructor(private readonly deps: AuthServiceDeps) {}

  /** Registers a new member. Throws ConflictError when the id is taken. */
  async signUp(input: SignUpInput): Promise<User> {
    const bio = input.bio?.trim() ?? '';
    const user: User = {
      id: input.userId,
      displayName: input.displayName.trim(),
      bio: bio === '' ? null : bio,
      createdAt: nowUtc(),
    };

    // ── Transaction boundary: user row + audit entry are atomic. ──
    await this.deps.uow.run(async (tx) => {
      if (!(await this.deps.users.insert(user, tx))) throw new ConflictError('user', user.id);
      await this.deps.auditLogs.append(
        {
          entityType: 'user',
          entityId: user.id,
          action: 'user.created',
          createdAt: user.createdAt,
        },
        tx,
      );
    });
    return user;
  }

  /** AUTH_DRIVER=dev sign-in: a registered id alone. Throws NotFoundError otherwise. */
  async login(userId: string): Promise<User> {
    const user = await this.deps.users.findById(userId);
    if (!user) throw new NotFoundError('user', userId);
    return user;
  }

  /**
   * The signed-in user. Throws UnauthorizedError when there is none —
   * including a session naming a user that no longer exists (e.g. the
   * in-memory store was reset by a restart).
   */
  async currentUser(userId: string | undefined): Promise<User> {
    if (userId === undefined) throw new UnauthorizedError();
    const user = await this.deps.users.findById(userId);
    if (!user) throw new UnauthorizedError();
    return user;
  }
}
