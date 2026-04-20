import crypto from 'crypto';

interface LinkPreview {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

/**
 * Fetch link preview with fallback chain:
 * 1. Microlink API
 * 2. Open Graph meta tags
 * 3. HTML title tag
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  try {
    // Validate URL
    if (!isValidUrl(url)) {
      return { title: url, url };
    }

    // 1. Try Microlink API
    try {
      const preview = await fetchWithMicrolink(url);
      if (preview.title || preview.image) {
        return preview;
      }
    } catch (e) {
      console.debug('Microlink failed, trying fallback');
    }

    // 2. Try Open Graph / Meta tags
    try {
      const preview = await fetchWithMetaTags(url);
      if (preview.title || preview.image) {
        return preview;
      }
    } catch (e) {
      console.debug('Meta tags fallback failed, trying HTML title');
    }

    // 3. Try HTML title tag
    try {
      const preview = await fetchWithHtmlTitle(url);
      if (preview.title) {
        return preview;
      }
    } catch (e) {
      console.debug('HTML title fallback failed');
    }

    // Final fallback: just return the URL
    return { title: extractDomainFromUrl(url), url };
  } catch (error) {
    console.error('Link preview error:', error);
    return { title: extractDomainFromUrl(url), url };
  }
}

async function fetchWithMicrolink(url: string): Promise<LinkPreview> {
  if (!process.env.MICROLINK_API_KEY) {
    return {};
  }

  const response = await fetch(
    `https://api.microlink.io?url=${encodeURIComponent(url)}&apiKey=${process.env.MICROLINK_API_KEY}`,
    { signal: AbortSignal.timeout(5000) }
  );

  if (!response.ok) {
    return {};
  }

  const data = (await response.json()) as any;
  return {
    title: data.data?.title,
    description: data.data?.description,
    image: data.data?.image?.url,
  };
}

async function fetchWithMetaTags(url: string): Promise<LinkPreview> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; drop_it; +https://drop-it.app)',
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    return {};
  }

  const html = await response.text();

  // Extract OG tags
  const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);

  return {
    title: titleMatch?.[1]?.substring(0, 60),
    description: descMatch?.[1]?.substring(0, 150),
    image: imageMatch?.[1],
  };
}

async function fetchWithHtmlTitle(url: string): Promise<LinkPreview> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; drop_it; +https://drop-it.app)',
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    return {};
  }

  const html = await response.text();
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);

  return {
    title: titleMatch?.[1]?.substring(0, 60),
  };
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function extractDomainFromUrl(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname.replace('www.', '');
  } catch {
    return url.substring(0, 50);
  }
}

/**
 * Generate SHA256 hash of URL for duplicate detection
 */
export function generateUrlHash(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex');
}
