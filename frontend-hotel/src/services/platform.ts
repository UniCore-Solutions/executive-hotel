/** Platform identity + hero content — sourced from the backend platform query.
    Returns empty content when the backend is unreachable.
    Single-property platform: the platform record and the canonical hotel are
    the SAME property (both carry the "Executive Hotel" identity after the
    canonical rename). The header/footer display the canonical hotel name
    first (see Header/Footer); this module feeds the home hero + brand line. */
import { PlatformBySlugDocument, type PlatformBySlugQuery } from '@/graphql/generated/graphql';
import { gqlRequest } from './graphqlClient';

export const PLATFORM_SLUG =
  process.env.NEXT_PUBLIC_PLATFORM_SLUG ?? 'executive-hotel';

export interface PlatformIdentity {
  name: string;
  tagline: string | null;
  description: string | null;
  slug: string;
}

export interface PlatformHero {
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  imageAlt: string | null;
  mobileImageUrl: string | null;
  ctaLabel: string | null;
  ctaTarget: string | null;
}

export interface FeaturedExperience {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number | null;
  currencyCode: string | null;
  durationMinutes: number | null;
  location: string | null;
}

export interface PlatformContent {
  identity: PlatformIdentity | null;
  hero: PlatformHero | null;
  featuredExperiences: FeaturedExperience[] | null;
}

export const EMPTY_PLATFORM_CONTENT: PlatformContent = {
  identity: null,
  hero: null,
  featuredExperiences: null,
};

async function fetchPlatform(): Promise<PlatformBySlugQuery['platform'] | null> {
  try {
    const { platform } = await gqlRequest(PlatformBySlugDocument, { slug: PLATFORM_SLUG });
    return platform ?? null;
  } catch {
    return null;
  }
}

type HeroBlockShape = Extract<
  PlatformBySlugQuery['platform']['contentBlocks'][number],
  { __typename: 'HeroBlock' }
>;

function heroFromBlock(block: HeroBlockShape): PlatformHero | null {
  if (!block.image) return null;
  return {
    eyebrow: block.eyebrow,
    title: block.title,
    subtitle: block.subtitle,
    imageUrl: block.image.url,
    imageAlt: block.image.altText,
    mobileImageUrl: block.mobileImage?.url ?? null,
    ctaLabel: block.ctaLabel,
    ctaTarget: block.ctaTarget,
  };
}

export async function getPlatformContent(force = false): Promise<PlatformContent> {
  if (!force && cache) return cache;
  const content = await loadPlatformContent();
  if (content !== EMPTY_PLATFORM_CONTENT) cache = content;
  return content;
}

/** The transformed platform content, memoized per session — the layout (every
    route) and the home page both consume it, so this removes a duplicate
    PlatformBySlug request on every navigation. Only successful loads are
    cached: a transient backend failure is retried on the next navigation
    instead of sticking. Mirrors the canonicalHotel singleton. */
let cache: PlatformContent | null = null;

async function loadPlatformContent(): Promise<PlatformContent> {
  const platform = await fetchPlatform();
  if (!platform) return EMPTY_PLATFORM_CONTENT;

  const heroBlock = platform.contentBlocks.find((b) => b.__typename === 'HeroBlock');
  const hero = heroBlock && heroBlock.__typename === 'HeroBlock' ? heroFromBlock(heroBlock) : null;

  const featuredBlock = platform.contentBlocks.find(
    (b) => b.__typename === 'FeaturedExperiencesBlock'
  );

  return {
    identity: {
      name: platform.name,
      tagline: platform.tagline,
      description: platform.description,
      slug: platform.slug,
    },
    hero,
    featuredExperiences:
      featuredBlock && featuredBlock.__typename === 'FeaturedExperiencesBlock'
        ? featuredBlock.items.map((item) => ({ ...item.experience }))
        : null,
  };
}