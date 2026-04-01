import { sortAndFilterShoppingSuggestions } from '../src/modules/shopping/shopping.utils';

describe('sortAndFilterShoppingSuggestions', () => {
  const suggestions = [
    {
      id: 1,
      title: 'Classic Denim Jacket',
      score: 42,
      averageRating: 4.8,
      reviewCount: 14,
      price: 89,
    },
    {
      id: 2,
      title: 'Neutral Tee',
      score: 39,
      averageRating: 4.9,
      reviewCount: 2,
      price: 35,
    },
    {
      id: 3,
      title: 'Minimal Trench',
      score: 44,
      averageRating: 4.4,
      reviewCount: 19,
      price: 129,
    },
  ];

  it('sorts top-rated results by rating then review confidence', () => {
    const ranked = sortAndFilterShoppingSuggestions(suggestions, {
      sort: 'top-rated',
    });

    expect(ranked.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it('filters out products below the requested minimum rating', () => {
    const ranked = sortAndFilterShoppingSuggestions(suggestions, {
      sort: 'personalized',
      minRating: 4.5,
    });

    expect(ranked.map((item) => item.id)).toEqual([1, 2]);
  });
});
