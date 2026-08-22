export type MediaItem = {
  src: string;
  alt: string;
  caption?: string;
  type?: "image" | "video" | "audio";
};

export type ImpactMetric = {
  value: number | string;
  label: string;
  suffix?: string;
  note?: string;
  source?: string;
  year?: number;
};

export type Program = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  category: string;
  tags: string[];
  heroImage: string;
  topics?: string[];
  gallery?: MediaItem[];
  metrics?: ImpactMetric[];
  featured?: boolean;
  note?: string;
};

export type Reference = {
  label: string;
  url: string;
  year?: number;
};

export type Resource = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  category: string;
  type: "article" | "guide" | "video" | "audio" | "download";
  readingTime?: number;
  publishedAt?: string;
  reviewedAt?: string;
  references?: Reference[];
};

export type Story = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  category: string;
  image: string;
  date?: string;
  attribution: string;
  demoContent: boolean;
};

export type Testimonial = {
  id: string;
  quote: string;
  attribution: string;
  program?: string;
  anonymous: boolean;
};

export type Partner = {
  id: string;
  name: string;
  description: string;
  website?: string;
  logo?: string;
  nameNeedsConfirmation?: boolean;
};

export type NewsItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  category: string;
  date: string;
  image: string;
  location?: string;
  demoContent: boolean;
};

export type EventItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  date: string;
  location: string;
  category: string;
  status: "upcoming" | "past" | "registration-open";
  demoContent: boolean;
};

/** Rendered publicly only when `verified` is true. */
export type SupportContact = {
  organization: string;
  service: string;
  phone: string;
  availability: string;
  website?: string;
  verified: boolean;
  lastVerified: string;
};

export type SourcedFact = {
  value: string;
  statement: string;
  source: string;
  sourceUrl: string;
  publicationYear: number | null;
  lastReviewed: string | null;
  verified: boolean;
};
