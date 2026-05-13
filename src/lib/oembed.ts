import type { Platform } from "@/lib/enums";

export type OEmbedResult = {
  platform: Platform;
  url: string;
  title: string | null;
  thumbnailUrl: string | null;
  embedHtml: string | null;
  authorName: string | null;
};

const TIKTOK_HOSTS = ["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "m.tiktok.com"];
const INSTAGRAM_HOSTS = ["instagram.com", "www.instagram.com"];

export function detectPlatform(url: string): Platform {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (TIKTOK_HOSTS.includes(host)) return "TIKTOK";
    if (INSTAGRAM_HOSTS.includes(host)) return "INSTAGRAM";
    return "OTHER";
  } catch {
    return "OTHER";
  }
}

async function fetchTikTokOEmbed(url: string): Promise<OEmbedResult | null> {
  try {
    const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const res = await fetch(endpoint, {
      headers: { "User-Agent": "CaptionWriter/1.0" },
      next: { revalidate: 60 * 60 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      title?: string;
      thumbnail_url?: string;
      html?: string;
      author_name?: string;
    };
    return {
      platform: "TIKTOK",
      url,
      title: data.title ?? null,
      thumbnailUrl: data.thumbnail_url ?? null,
      embedHtml: data.html ?? null,
      authorName: data.author_name ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchInstagramOEmbed(url: string): Promise<OEmbedResult | null> {
  // Instagram's official oEmbed endpoint requires a Facebook app token, so we
  // fall back to a lightweight scrape of the public OG metadata. This gives us
  // a thumbnail and title without needing an API key.
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CaptionWriter/1.0; +https://example.com)",
      },
      next: { revalidate: 60 * 60 },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const title = matchMeta(html, "og:title") ?? matchMeta(html, "twitter:title");
    const thumbnail =
      matchMeta(html, "og:image") ?? matchMeta(html, "twitter:image");
    const author = matchMeta(html, "og:site_name");
    return {
      platform: "INSTAGRAM",
      url,
      title,
      thumbnailUrl: thumbnail,
      embedHtml: null,
      authorName: author,
    };
  } catch {
    return null;
  }
}

function matchMeta(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  return m?.[1] ?? null;
}

export async function fetchOEmbed(url: string): Promise<OEmbedResult> {
  const platform = detectPlatform(url);
  if (platform === "TIKTOK") {
    const r = await fetchTikTokOEmbed(url);
    if (r) return r;
  }
  if (platform === "INSTAGRAM") {
    const r = await fetchInstagramOEmbed(url);
    if (r) return r;
  }
  return {
    platform,
    url,
    title: null,
    thumbnailUrl: null,
    embedHtml: null,
    authorName: null,
  };
}
