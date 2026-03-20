import { describe, it, expect } from '@voidzero-dev/vite-plus-test';
import { matchesFilters, filterStreamResponse } from './filters';
import { buildStreamItem, buildTrack, buildUser, buildFilters, buildStreamResponse } from './test-factories';

describe('matchesFilters', () => {
  it('allows items whose type is in the whitelist', () => {
    const item = buildStreamItem({ type: 'track' });
    const filters = buildFilters({ types: ['track'] });
    expect(matchesFilters(item, filters)).toBe(true);
  });

  it('rejects items whose type is not in the whitelist', () => {
    const item = buildStreamItem({ type: 'track-repost' });
    const filters = buildFilters({ types: ['track'] });
    expect(matchesFilters(item, filters)).toBe(false);
  });

  it('excludes items by artist permalink (case-insensitive)', () => {
    const item = buildStreamItem({
      type: 'track',
      track: buildTrack({ user: buildUser({ permalink: 'SpammyDJ' }) }),
    });
    const filters = buildFilters({ excludeArtists: ['spammydj'] });
    expect(matchesFilters(item, filters)).toBe(false);
  });

  it('excludes items by reposter permalink', () => {
    const item = buildStreamItem({
      type: 'track-repost',
      user: buildUser({ permalink: 'annoying-reposter' }),
    });
    const filters = buildFilters({ excludeArtists: ['annoying-reposter'] });
    expect(matchesFilters(item, filters)).toBe(false);
  });

  it('whitelists by genre when genres are specified', () => {
    const item = buildStreamItem({
      type: 'track',
      track: buildTrack({ genre: 'UK Garage' }),
    });
    const filters = buildFilters({ genres: ['garage'] });
    expect(matchesFilters(item, filters)).toBe(true);
  });

  it('whitelists by tag_list when genres are specified', () => {
    const item = buildStreamItem({
      type: 'track',
      track: buildTrack({ genre: 'Electronic', tag_list: 'speed garage ghetto house' }),
    });
    const filters = buildFilters({ genres: ['ghetto house'] });
    expect(matchesFilters(item, filters)).toBe(true);
  });

  it('rejects items not matching any genre when genres are specified', () => {
    const item = buildStreamItem({
      type: 'track',
      track: buildTrack({ genre: 'Pop', tag_list: 'pop radio' }),
    });
    const filters = buildFilters({ genres: ['dubstep', 'garage'] });
    expect(matchesFilters(item, filters)).toBe(false);
  });

  it('passes all items when genre filter is empty', () => {
    const item = buildStreamItem({
      type: 'track',
      track: buildTrack({ genre: 'Anything' }),
    });
    const filters = buildFilters({ genres: [] });
    expect(matchesFilters(item, filters)).toBe(true);
  });

  it('rejects items with no inner track or playlist', () => {
    const item = buildStreamItem({ type: 'track' });
    delete item.track;
    const filters = buildFilters();
    expect(matchesFilters(item, filters)).toBe(false);
  });
});

describe('filterStreamResponse', () => {
  it('returns a new response with only matching items', () => {
    const response = buildStreamResponse({
      collection: [
        buildStreamItem({ type: 'track' }),
        buildStreamItem({ type: 'track-repost' }),
        buildStreamItem({ type: 'playlist' }),
      ],
    });
    const filters = buildFilters({ types: ['track', 'playlist'] });
    const result = filterStreamResponse(response, filters);

    expect(result.collection).toHaveLength(2);
    expect(result.collection.map(i => i.type)).toEqual(['track', 'playlist']);
  });

  it('preserves next_href and query_urn', () => {
    const response = buildStreamResponse({
      next_href: 'https://api-v2.soundcloud.com/stream?offset=abc',
      query_urn: 'some-urn',
    });
    const result = filterStreamResponse(response, buildFilters());
    expect(result.next_href).toBe(response.next_href);
    expect(result.query_urn).toBe(response.query_urn);
  });

  it('does not mutate the original response', () => {
    const response = buildStreamResponse({
      collection: [
        buildStreamItem({ type: 'track' }),
        buildStreamItem({ type: 'track-repost' }),
      ],
    });
    const originalLength = response.collection.length;
    filterStreamResponse(response, buildFilters({ types: ['track'] }));
    expect(response.collection).toHaveLength(originalLength);
  });
});
