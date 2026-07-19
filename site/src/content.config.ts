import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const tests = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/tests' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    brand: z.string(),
    model: z.string(),
    generation: z.string().optional(),
    year: z.number().optional(),
    version: z.string().optional(),
    publishedAt: z.string(),
    lead: z.string().optional(),
    originalUrl: z.string().optional(),
    heroImage: z.string().optional(),
    galleryDir: z.string().optional(),
    tags: z.array(z.string()).optional(),
    bodyType: z.string().optional(),
    drivetrain: z.string().optional(),
    engine: z.string().optional(),
    power: z.string().optional(),
    torque: z.string().optional(),
    gearbox: z.string().optional(),
    rating: z.number().min(1).max(10).optional(),
    canonical: z.string().url().optional(),
    wave: z.string().optional(),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/news' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    publishedAt: z.string(),
    lead: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    sourceName: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    enriched: z.boolean().optional(),
    aiAssisted: z.boolean().default(true),
    partnerDisclosure: z.string().optional(),
  }),
});

const models = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/models' }),
  schema: z.object({
    slug: z.string(),
    brand: z.string(),
    model: z.string(),
    segment: z.string(),
    msrpPln: z.number().optional(),
    usedPriceEstPln: z.number().optional(),
    bodyType: z.string().optional(),
  }),
});

export const collections = { tests, news, models };
