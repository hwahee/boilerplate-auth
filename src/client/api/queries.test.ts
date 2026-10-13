import { describe, expect, test } from 'bun:test';

import type { User } from '@shared/domain/user';
import { nowUtc } from '@shared/time';
import { QueryClient } from '@tanstack/react-query';

import { authKeys, replaceMe } from './queries';

const ALICE: User = { id: 'alice', displayName: 'Alice', bio: null, createdAt: nowUtc() };

/** A `me` fetch that went out with the old cookie and answers only when told to. */
function meInFlight(queryClient: QueryClient) {
  let answer: (user: User | null) => void = () => undefined;
  const done = queryClient
    .fetchQuery({
      queryKey: authKeys.me,
      queryFn: () => new Promise<User | null>((resolve) => (answer = resolve)),
    })
    .catch(() => undefined); // cancelled
  return { answer: (user: User | null) => answer(user), done };
}

describe('replaceMe', () => {
  test('a me fetch sent before signing out does not bring the member back', async () => {
    const queryClient = new QueryClient();
    const stale = meInFlight(queryClient);
    await replaceMe(queryClient, null);
    stale.answer(ALICE);
    await stale.done;
    expect(queryClient.getQueryData<User | null>(authKeys.me)).toBeNull();
  });

  test('a me fetch sent before signing in does not sign the member out again', async () => {
    const queryClient = new QueryClient();
    const stale = meInFlight(queryClient);
    await replaceMe(queryClient, ALICE);
    stale.answer(null);
    await stale.done;
    expect(queryClient.getQueryData<User | null>(authKeys.me)).toEqual(ALICE);
  });
});
