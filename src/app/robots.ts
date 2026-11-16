import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.squadpicks.co.uk';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/rules', '/terms', '/privacy', '/join/'],
      disallow: ['/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
