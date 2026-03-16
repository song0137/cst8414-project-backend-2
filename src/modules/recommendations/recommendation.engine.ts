export type QuizProfileRow = {
  dimension: string;
  answerText: string;
  scoreWeight: number;
};

export type QuizProfile = {
  style?: string;
  color?: string;
  fit?: string;
  budget?: string;
  dimensions: Record<string, string>;
  totalQuizScore: number;
};

export type FeedbackSignalRow = {
  category: string | null;
  feedbackType: string;
};

export type WardrobeCandidate = {
  category: string;
  color: string;
  season: string;
};

export type ProductCandidate = {
  category: string;
  title: string;
  price: number;
  averageRating?: number | null;
  reviewCount?: number | null;
};

const styleCategoryAffinity: Record<string, string[]> = {
  streetwear: ['outerwear', 'tops', 'bottoms', 'shoes'],
  minimalist: ['tops', 'bottoms', 'outerwear'],
  classic: ['outerwear', 'tops', 'bottoms', 'accessories'],
};

const fitCategoryAffinity: Record<string, string[]> = {
  relaxed: ['outerwear', 'bottoms'],
  slim: ['tops', 'outerwear'],
  athletic: ['tops', 'bottoms', 'shoes'],
};

const paletteMap: Record<string, string[]> = {
  bold: ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'],
  neutral: ['black', 'white', 'gray', 'grey', 'beige', 'brown', 'cream', 'navy'],
  pastel: ['pastel', 'pink', 'lavender', 'mint', 'peach', 'sky', 'baby'],
};

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function getCurrentSeasonLabel(now = new Date()): 'winter' | 'spring' | 'summer' | 'fall' {
  const month = now.getUTCMonth() + 1;
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'fall';
}

function seasonMatches(itemSeason: string, currentSeason: string): boolean {
  const normalized = normalize(itemSeason);
  if (!normalized) return false;
  if (normalized.includes('all')) return true;
  return normalized.includes(normalize(currentSeason));
}

function matchesColorPalette(itemColor: string, profileColor?: string): boolean {
  const profile = normalize(profileColor);
  if (!profile || !paletteMap[profile]) return false;
  const color = normalize(itemColor);
  return paletteMap[profile].some((allowedColor) => color.includes(allowedColor));
}

function matchesStyleCategory(category: string, profileStyle?: string): boolean {
  const style = normalize(profileStyle);
  const mapped = styleCategoryAffinity[style];
  if (!mapped) return false;
  return mapped.includes(normalize(category));
}

function matchesFitCategory(category: string, profileFit?: string): boolean {
  const fit = normalize(profileFit);
  const mapped = fitCategoryAffinity[fit];
  if (!mapped) return false;
  return mapped.includes(normalize(category));
}

function scoreBudget(price: number, budget?: string): number {
  const normalized = normalize(budget);
  if (!normalized || !Number.isFinite(price)) return 0;
  if (normalized.includes('budget')) return price <= 70 ? 8 : -6;
  if (normalized.includes('mid')) return price <= 140 ? 8 : -3;
  if (normalized.includes('premium')) return price >= 120 ? 6 : 2;
  return 0;
}

function scoreReviewSignal(averageRating?: number | null, reviewCount?: number | null): number {
  if (!Number.isFinite(averageRating) || !reviewCount || reviewCount <= 0) return 0;

  const centeredRating = ((averageRating ?? 0) - 3) * 4;
  const confidenceBonus = Math.min(reviewCount, 20) / 5;
  return round(centeredRating + confidenceBonus);
}

export function mapQuizRowsToProfile(rows: QuizProfileRow[]): QuizProfile {
  const dimensions: Record<string, string> = {};
  let totalQuizScore = 0;

  for (const row of rows) {
    const key = normalize(row.dimension);
    dimensions[key] = row.answerText;
    totalQuizScore += row.scoreWeight ?? 0;
  }

  return {
    style: dimensions.style,
    color: dimensions.color,
    fit: dimensions.fit,
    budget: dimensions.budget,
    dimensions,
    totalQuizScore,
  };
}

export function buildFeedbackWeights(rows: FeedbackSignalRow[]): Map<string, number> {
  const weights = new Map<string, number>();
  for (const row of rows) {
    const category = normalize(row.category);
    if (!category) continue;
    const delta = normalize(row.feedbackType) === 'like' ? 1 : -1;
    weights.set(category, (weights.get(category) ?? 0) + delta);
  }
  return weights;
}

export function scoreWardrobeCandidate(
  candidate: WardrobeCandidate,
  profile: QuizProfile,
  feedbackWeights: Map<string, number>,
  currentSeason = getCurrentSeasonLabel(),
): number {
  const category = normalize(candidate.category);
  let score = 40;

  if (matchesStyleCategory(candidate.category, profile.style)) score += 12;
  if (matchesFitCategory(candidate.category, profile.fit)) score += 6;
  if (matchesColorPalette(candidate.color, profile.color)) score += 8;
  if (seasonMatches(candidate.season, currentSeason)) score += 6;

  score += (feedbackWeights.get(category) ?? 0) * 5;
  return round(score);
}

export function scoreProductCandidate(
  candidate: ProductCandidate,
  profile: QuizProfile,
  feedbackWeights: Map<string, number>,
  _currentSeason = getCurrentSeasonLabel(),
): number {
  const category = normalize(candidate.category);
  let score = 35;

  if (matchesStyleCategory(candidate.category, profile.style)) score += 10;
  if (matchesFitCategory(candidate.category, profile.fit)) score += 4;
  if (matchesColorPalette(candidate.title, profile.color)) score += 5;

  score += scoreBudget(candidate.price, profile.budget);
  score += scoreReviewSignal(candidate.averageRating, candidate.reviewCount);
  score += (feedbackWeights.get(category) ?? 0) * 7;

  return round(score);
}

export function buildProductMatchReasons(
  candidate: ProductCandidate,
  profile: QuizProfile,
  feedbackWeights: Map<string, number>,
): string[] {
  const reasons: string[] = [];
  const category = normalize(candidate.category);

  if (matchesStyleCategory(candidate.category, profile.style) && profile.style) {
    reasons.push(`Matches your ${profile.style.toLowerCase()} style`);
  }

  if (matchesFitCategory(candidate.category, profile.fit) && profile.fit) {
    reasons.push(`Fits your ${profile.fit.toLowerCase()} preference`);
  }

  if (matchesColorPalette(candidate.title, profile.color) && profile.color) {
    reasons.push(`Works with your ${profile.color.toLowerCase()} color palette`);
  }

  if (scoreBudget(candidate.price, profile.budget) > 0 && profile.budget) {
    reasons.push(`Aligned with your ${profile.budget.toLowerCase()} budget`);
  }

  if ((feedbackWeights.get(category) ?? 0) > 0) {
    reasons.push('Similar shoppers choices got positive feedback from you');
  }

  if ((candidate.reviewCount ?? 0) > 0 && (candidate.averageRating ?? 0) >= 4) {
    reasons.push('Highly rated by the community');
  }

  return reasons.slice(0, 3);
}
