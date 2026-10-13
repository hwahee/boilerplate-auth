import { describe, expect, test } from 'bun:test';

import { loadServerConfig } from './config';

describe('loadServerConfig — AUTH_DRIVER', () => {
  test('defaults to none: sign-in is opt-in', () => {
    expect(loadServerConfig({ DB_DRIVER: 'memory' }).authDriver).toBe('none');
  });

  test('dev is allowed outside production', () => {
    for (const appEnv of ['local', 'development']) {
      expect(
        loadServerConfig({ APP_ENV: appEnv, DB_DRIVER: 'memory', AUTH_DRIVER: 'dev' }).authDriver,
      ).toBe('dev');
    }
  });

  test('dev refuses to boot in production — anyone knowing an id could sign in as it', () => {
    expect(() =>
      loadServerConfig({ APP_ENV: 'production', DB_DRIVER: 'memory', AUTH_DRIVER: 'dev' }),
    ).toThrow('AUTH_DRIVER=dev must never run with APP_ENV=production');
  });
});
