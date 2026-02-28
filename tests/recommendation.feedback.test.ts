import { buildWardrobePayloadFromProduct } from '../src/modules/recommendations/recommendation.feedback';

describe('buildWardrobePayloadFromProduct', () => {
  it('maps product fields into a wardrobe payload', () => {
    const payload = buildWardrobePayloadFromProduct(
      {
        title: 'Classic Denim Jacket',
        category: 'Outerwear',
        provider: 'FashionHub',
        imageUrl: 'https://example.com/jacket.png',
      },
      'Bold',
    );

    expect(payload).toEqual({
      name: 'Classic Denim Jacket',
      category: 'Outerwear',
      color: 'Bold',
      season: 'All-Season',
      brand: 'FashionHub',
      imageUrl: 'https://example.com/jacket.png',
    });
  });

  it('prefers explicit color in title over fallback profile color', () => {
    const payload = buildWardrobePayloadFromProduct(
      {
        title: 'Red Urban Bomber',
        category: 'Outerwear',
        provider: 'FashionHub',
        imageUrl: null,
      },
      'Bold',
    );

    expect(payload.color).toBe('Red');
  });

  it('uses safe defaults when fields are missing', () => {
    const payload = buildWardrobePayloadFromProduct(
      {
        title: '',
        category: '',
        provider: '',
        imageUrl: null,
      },
      '',
    );

    expect(payload.name).toBe('Liked Product');
    expect(payload.category).toBe('General');
    expect(payload.brand).toBe('Unknown');
    expect(payload.imageUrl).toBeNull();
    expect(payload.color).toBe('Unknown');
  });
});
