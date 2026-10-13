import { describe, expect, test } from 'bun:test';

import { UnauthorizedError } from '../lib/errors';
import { readCaller, requireMember } from './session';

const withCookie = (cookie: string) => new Request('http://localhost/', { headers: { cookie } });

describe('readCaller', () => {
  test('AUTH_DRIVER=dev: the session cookie makes the caller a member', () => {
    expect(readCaller(withCookie('a=1; session=alice'), { authDriver: 'dev' })).toEqual({
      kind: 'member',
      userId: 'alice',
    });
  });

  test('AUTH_DRIVER=dev: no cookie, or a cleared (empty) one, is a guest', () => {
    expect(readCaller(new Request('http://localhost/'), { authDriver: 'dev' })).toEqual({
      kind: 'guest',
    });
    expect(readCaller(withCookie('session='), { authDriver: 'dev' })).toEqual({ kind: 'guest' });
  });

  test('AUTH_DRIVER=none never trusts a session cookie, even a well-formed one', () => {
    expect(readCaller(withCookie('session=alice'), { authDriver: 'none' })).toEqual({
      kind: 'anyone',
    });
  });
});

describe('requireMember', () => {
  test('lets members through and turns guests away', () => {
    expect(() => requireMember({ kind: 'member', userId: 'alice' })).not.toThrow();
    expect(() => requireMember({ kind: 'guest' })).toThrow(UnauthorizedError);
  });

  test('without sign-in (AUTH_DRIVER=none) there is no one to turn away', () => {
    expect(() => requireMember({ kind: 'anyone' })).not.toThrow();
  });
});
