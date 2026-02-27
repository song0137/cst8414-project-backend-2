import { z } from 'zod';

const imageUrlField = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().optional(),
);

export const wardrobeCreateSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  color: z.string().min(1),
  season: z.string().min(1),
  brand: z.string().min(1),
  imageUrl: imageUrlField,
});

export const wardrobeUpdateSchema = wardrobeCreateSchema.partial();

export const wardrobeQuerySchema = z.object({
  category: z.string().optional(),
  color: z.string().optional(),
  season: z.string().optional(),
  q: z.string().optional(),
});
