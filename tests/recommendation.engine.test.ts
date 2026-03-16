import {
  buildFeedbackWeights,
  mapQuizRowsToProfile,
  scoreProductCandidate,
  scoreWardrobeCandidate,
} from '../src/modules/recommendations/recommendation.engine';

describe('recommendation engine helpers', () => {
  it('maps quiz dimensions into user profile', () => {
    const profile = mapQuizRowsToProfile([
      { dimension: 'style', answerText: 'Streetwear', scoreWeight: 4 },
      { dimension: 'color', answerText: 'Bold', scoreWeight: 4 },
      { dimension: 'fit', answerText: 'Relaxed', scoreWeight: 3 },
      { dimension: 'budget', answerText: 'Mid-range', scoreWeight: 3 },
    ]);

    expect(profile.style).toBe('Streetwear');
    expect(profile.color).toBe('Bold');
    expect(profile.fit).toBe('Relaxed');
    expect(profile.budget).toBe('Mid-range');
  });

  it('converts likes/dislikes into category weights', () => {
    const weights = buildFeedbackWeights([
      { category: 'Outerwear', feedbackType: 'like' },
      { category: 'Outerwear', feedbackType: 'like' },
      { category: 'Outerwear', feedbackType: 'dislike' },
      { category: 'Bottoms', feedbackType: 'dislike' },
    ]);

    expect(weights.get('outerwear')).toBeGreaterThan(0);
    expect(weights.get('bottoms')).toBeLessThan(0);
  });

  it('scores matching wardrobe and product items higher than mismatches', () => {
    const profile = mapQuizRowsToProfile([
      { dimension: 'style', answerText: 'Streetwear', scoreWeight: 4 },
      { dimension: 'color', answerText: 'Bold', scoreWeight: 4 },
      { dimension: 'fit', answerText: 'Relaxed', scoreWeight: 3 },
      { dimension: 'budget', answerText: 'Mid-range', scoreWeight: 3 },
    ]);

    const feedback = buildFeedbackWeights([{ category: 'Outerwear', feedbackType: 'like' }]);

    const wardrobeMatch = scoreWardrobeCandidate(
      { category: 'Outerwear', color: 'Red', season: 'All-Season' },
      profile,
      feedback,
      'winter',
    );
    const wardrobeMismatch = scoreWardrobeCandidate(
      { category: 'Accessories', color: 'Gray', season: 'Summer' },
      profile,
      feedback,
      'winter',
    );

    expect(wardrobeMatch).toBeGreaterThan(wardrobeMismatch);

    const productMatch = scoreProductCandidate(
      { category: 'Outerwear', title: 'Red Urban Bomber', price: 89 },
      profile,
      feedback,
      'winter',
    );
    const productMismatch = scoreProductCandidate(
      { category: 'Accessories', title: 'Classic Beige Scarf', price: 320 },
      profile,
      feedback,
      'winter',
    );

    expect(productMatch).toBeGreaterThan(productMismatch);
  });

  it('boosts highly rated products over poorly rated ones when other signals are equal', () => {
    const profile = mapQuizRowsToProfile([
      { dimension: 'style', answerText: 'Classic', scoreWeight: 4 },
      { dimension: 'color', answerText: 'Neutral', scoreWeight: 3 },
      { dimension: 'fit', answerText: 'Slim', scoreWeight: 3 },
      { dimension: 'budget', answerText: 'Mid-range', scoreWeight: 2 },
    ]);

    const feedback = buildFeedbackWeights([{ category: 'Outerwear', feedbackType: 'like' }]);

    const highlyRated = scoreProductCandidate(
      {
        category: 'Outerwear',
        title: 'Tailored Navy Blazer',
        price: 125,
        averageRating: 4.8,
        reviewCount: 18,
      },
      profile,
      feedback,
      'spring',
    );

    const poorlyRated = scoreProductCandidate(
      {
        category: 'Outerwear',
        title: 'Tailored Navy Blazer',
        price: 125,
        averageRating: 2.1,
        reviewCount: 18,
      },
      profile,
      feedback,
      'spring',
    );

    expect(highlyRated).toBeGreaterThan(poorlyRated);
  });
});
