export type TestMeta = {
  slug: string;
  title: string;
  brand: string;
  model: string;
  generation?: string;
  year?: number;
  version?: string;
  publishedAt: string;
  lead?: string;
  originalUrl?: string;
  heroImage?: string;
  galleryDir?: string;
  tags?: string[];
  bodyType?: string;
  drivetrain?: string;
  engine?: string;
  power?: string;
  torque?: string;
  gearbox?: string;
};

export type Test = {
  meta: TestMeta;
  contentHtml: string;
};

