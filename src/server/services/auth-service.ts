/**
 * Sign-in logic — pure of HTTP concerns (cookies live in src/server/auth).
 *
 * Signing in with an id nobody has used yet creates that user: registration
 * is the first sign-in, not a separate step.
 */
import type { User } from '@shared/domain/user';
import { nowUtc } from '@shared/time';

import { UnauthorizedError } from '../lib/errors';
import type { AuditLogRepository, UnitOfWork, UserRepository } from '../repositories/types';

interface AuthServiceDeps {
  users: UserRepository;
  auditLogs: AuditLogRepository;
  uow: UnitOfWork;
}

export class AuthService {
  constructor(private readonly deps: AuthServiceDeps) {}

  /** AUTH_DRIVER=dev sign-in: the id alone is enough. Returns the (possibly new) user. */
  async devLogin(userId: string): Promise<User> {
    // ── Transaction boundary: user row + audit entry are atomic. ──
    return this.deps.uow.run(async (tx) => {
      const existing = await this.deps.users.findById(userId, tx);
      if (existing) return existing;

      const user: User = { id: userId, displayName: userId, createdAt: nowUtc() };
      await this.deps.users.insert(user, tx);
      await this.deps.auditLogs.append(
        {
          entityType: 'user',
          entityId: user.id,
          action: 'user.created',
          createdAt: user.createdAt,
        },
        tx,
      );
      return user;
    });
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
