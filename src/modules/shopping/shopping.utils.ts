export type ShoppingSuggestion = {
  id: number;
  title: string;
  score: number;
  averageRating: number | null;
  reviewCount: number;
  price: number;
};

export type ShoppingSortMode = 'personalized' | 'top-rated' | 'price-low' | 'price-high';

export function sortAndFilterShoppingSuggestions(
  suggestions: ShoppingSuggestion[],
  options: { sort: ShoppingSortMode; minRating?: number },
): ShoppingSuggestion[] {
  const filtered = suggestions.filter((item) => {
    if (options.minRating === undefined) return true;
    if (item.averageRating === null) return false;
    return item.averageRating >= options.minRating;
  });

  const sorted = [...filtered];

  switch (options.sort) {
    case 'top-rated':
      sorted.sort((a, b) => {
        const aWeighted = (a.averageRating ?? 0) * 100 + Math.min(a.reviewCount, 50);
        const bWeighted = (b.averageRating ?? 0) * 100 + Math.min(b.reviewCount, 50);
        return bWeighted - aWeighted || b.score - a.score;
      });
      break;
    case 'price-low':
      sorted.sort((a, b) => a.price - b.price || b.score - a.score);
      break;
    case 'price-high':
      sorted.sort((a, b) => b.price - a.price || b.score - a.score);
      break;
    case 'personalized':
    default:
      sorted.sort((a, b) => b.score - a.score || (b.averageRating ?? 0) - (a.averageRating ?? 0));
      break;
  }

  return sorted;
}
