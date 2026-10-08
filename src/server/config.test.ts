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

describe('loadServerConfig — Hydra', () => {
  test('optional: without it the pages work on their own', () => {
    const config = loadServerConfig({ DB_DRIVER: 'memory', HYDRA_PUBLIC_URL: '' });
    expect(config.hydraPublicUrl).toBeUndefined();
    expect(config.hydraAdminUrl).toBeUndefined();
  });

  test('the public and admin URLs come together or not at all', () => {
    const both = loadServerConfig({
      DB_DRIVER: 'memory',
      HYDRA_PUBLIC_URL: 'http://localhost:4444',
      HYDRA_ADMIN_URL: 'http://localhost:4445',
    });
    expect(both.hydraPublicUrl).toBe('http://localhost:4444');
    expect(() =>
      loadServerConfig({ DB_DRIVER: 'memory', HYDRA_PUBLIC_URL: 'http://localhost:4444' }),
    ).toThrow('HYDRA_PUBLIC_URL and HYDRA_ADMIN_URL are set together or not at all');
  });
});
