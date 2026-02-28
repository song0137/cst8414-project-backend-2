export type ProductSnapshot = {
  title: string | null;
  category: string | null;
  provider: string | null;
  imageUrl: string | null;
};

export type WardrobeInsertPayload = {
  name: string;
  category: string;
  color: string;
  season: string;
  brand: string;
  imageUrl: string | null;
};

function clean(value: string | null | undefined): string {
  return (value ?? '').trim();
}

const knownColors = [
  'Black',
  'White',
  'Gray',
  'Grey',
  'Beige',
  'Brown',
  'Navy',
  'Blue',
  'Red',
  'Green',
  'Yellow',
  'Orange',
  'Purple',
  'Pink',
];

function extractColorFromTitle(title: string | null): string | null {
  const normalized = clean(title).toLowerCase();
  if (!normalized) return null;

  for (const color of knownColors) {
    if (normalized.includes(color.toLowerCase())) {
      return color;
    }
  }

  return null;
}

export function buildWardrobePayloadFromProduct(
  product: ProductSnapshot,
  fallbackColor: string | null | undefined,
): WardrobeInsertPayload {
  const titleColor = extractColorFromTitle(product.title);
  const preferredColor = clean(fallbackColor) || 'Unknown';

  return {
    name: clean(product.title) || 'Liked Product',
    category: clean(product.category) || 'General',
    color: titleColor ?? preferredColor,
    season: 'All-Season',
    brand: clean(product.provider) || 'Unknown',
    imageUrl: product.imageUrl ?? null,
  };
}
