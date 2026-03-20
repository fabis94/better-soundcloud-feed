import { describe, it, expect } from '@voidzero-dev/vite-plus-test';
import { isStreamUrl, extractUrl, withLimit } from './url';

describe('isStreamUrl', () => {
  it('matches stream API URLs', () => {
    expect(isStreamUrl('https://api-v2.soundcloud.com/stream?offset=abc')).toBe(true);
  });

  it('matches feed API URLs', () => {
    expect(isStreamUrl('https://api-v2.soundcloud.com/feed?limit=20')).toBe(true);
  });

  it('rejects non-stream URLs', () => {
    expect(isStreamUrl('https://api-v2.soundcloud.com/tracks/123')).toBe(false);
  });

  it('rejects unrelated URLs', () => {
    expect(isStreamUrl('https://example.com/stream')).toBe(false);
  });
});

describe('extractUrl', () => {
  it('returns string input as-is', () => {
    expect(extractUrl('https://example.com')).toBe('https://example.com');
  });

  it('converts URL object to string', () => {
    const url = new URL('https://example.com/path');
    expect(extractUrl(url)).toBe('https://example.com/path');
  });
});

describe('withLimit', () => {
  it('sets the limit query param', () => {
    const result = withLimit('https://api-v2.soundcloud.com/stream?limit=20', 50);
    const parsed = new URL(result);
    expect(parsed.searchParams.get('limit')).toBe('50');
  });

  it('adds limit if not present', () => {
    const result = withLimit('https://api-v2.soundcloud.com/stream', 50);
    const parsed = new URL(result);
    expect(parsed.searchParams.get('limit')).toBe('50');
  });
});
