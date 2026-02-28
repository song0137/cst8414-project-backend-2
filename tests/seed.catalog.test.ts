import { getSeedProducts } from '../src/db/seed.catalog';

describe('seed product catalog', () => {
  it('contains at least 23 products for recommendation variety', () => {
    const products = getSeedProducts();
    expect(products.length).toBeGreaterThanOrEqual(23);
  });

  it('covers all core recommendation categories', () => {
    const products = getSeedProducts();
    const categories = new Set(products.map((p) => p.category));

    expect(categories.has('Outerwear')).toBe(true);
    expect(categories.has('Tops')).toBe(true);
    expect(categories.has('Bottoms')).toBe(true);
    expect(categories.has('Shoes')).toBe(true);
    expect(categories.has('Accessories')).toBe(true);
  });

  it('has unique provider-title pairs to avoid duplicate seed rows', () => {
    const products = getSeedProducts();
    const keys = products.map((p) => `${p.provider}::${p.title}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
