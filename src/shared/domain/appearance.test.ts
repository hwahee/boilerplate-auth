import { describe, expect, test } from 'bun:test';

import { appearanceFromParams } from './appearance';

const read = (query: string) => appearanceFromParams(new URLSearchParams(query));

describe('appearanceFromParams', () => {
  test('reads theme, design and the first supported ui_locales tag', () => {
    expect(read('theme=dark&design=kids&ui_locales=fr-CA ko-KR en')).toEqual({
      theme: 'dark',
      design: 'kids',
      locale: 'ko',
    });
  });

  test('leaves out what is missing or unknown', () => {
    expect(read('')).toEqual({});
    expect(read('theme=blue&design=z&ui_locales=fr')).toEqual({});
  });
});
