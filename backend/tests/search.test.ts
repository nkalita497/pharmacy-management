import { searchFts } from '../src/utils/fts';

describe('FTS search', () => {
  it('returns empty array for empty query', async () => {
    const results = await searchFts('   ');
    expect(results).toEqual([]);
  });
});
