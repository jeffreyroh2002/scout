import type { Currency, PriceEntry, Region } from '../types';

const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const REGION_CONFIG: Record<
  Region,
  {
    currency: Currency;
    searchUrl: (id: string) => string;
    baseUrl: string;
    acceptLanguage: string;
  }
> = {
  US: {
    currency: 'USD',
    searchUrl: (id) => `https://www.muji.com/us/en/search?q=${id}`,
    baseUrl: 'https://www.muji.com',
    acceptLanguage: 'en-US,en;q=0.9',
  },
  JP: {
    currency: 'JPY',
    searchUrl: (id) => `https://www.muji.com/jp/ja/search?q=${id}`,
    baseUrl: 'https://www.muji.com',
    acceptLanguage: 'ja-JP,ja;q=0.9',
  },
  KR: {
    currency: 'KRW',
    searchUrl: (id) => `https://www.muji.com/kr/ko/search?q=${id}`,
    baseUrl: 'https://www.muji.com',
    acceptLanguage: 'ko-KR,ko;q=0.9',
  },
  EU: {
    currency: 'EUR',
    searchUrl: (id) => `https://www.muji.com/eu/en/search?q=${id}`,
    baseUrl: 'https://www.muji.com',
    acceptLanguage: 'en-GB,en;q=0.9',
  },
};

export async function fetchPrices(productId: string): Promise<PriceEntry[]> {
  const tasks = (Object.keys(REGION_CONFIG) as Region[]).map(async (region) => {
    const cfg = REGION_CONFIG[region];
    const searchUrl = cfg.searchUrl(productId);
    try {
      // First try search to resolve slug/URL (barcode not in URL)
      const searchResult = await fetchMujiPage(searchUrl, cfg.acceptLanguage);
      if (!searchResult.ok) {
        return buildEntry(region, cfg.currency, searchUrl, null, `HTTP ${searchResult.status}`);
      }

      const productUrl = resolveProductUrl(searchResult.html, cfg.baseUrl);
      if (!productUrl) {
        return buildEntry(region, cfg.currency, searchUrl, null, 'Not sold in this region');
      }

      const productPage = await fetchMujiPage(productUrl, cfg.acceptLanguage);
      if (!productPage.ok) {
        return buildEntry(region, cfg.currency, productUrl, null, `HTTP ${productPage.status}`);
      }

      const parsed = parseMujiHtml(productPage.html, productUrl, region, cfg.currency);
      if (parsed) return parsed;
      return buildEntry(region, cfg.currency, productUrl, null, 'Price not found');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      return buildEntry(region, cfg.currency, searchUrl, null, msg);
    }
  });

  return Promise.all(tasks);
}

async function fetchMujiPage(url: string, acceptLanguage: string) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': acceptLanguage },
  });
  const html = await res.text();
  return { ok: res.ok, status: res.status, html };
}

function parseMujiHtml(
  html: string,
  productUrl: string,
  region: Region,
  currency: Currency
): PriceEntry | null {
  const price = extractPrice(html);
  const { productName, imageUrl } = extractMeta(html);
  if (price == null) return null;
  return buildEntry(region, currency, productUrl, price, undefined, productName, imageUrl);
}

function resolveProductUrl(html: string, baseUrl: string): string | null {
  // Try product detail links in search results: /products/<slug> or /store/cmdty/detail/<id>
  const linkMatch =
    html.match(/href=["'](?<path>\/products\/[^"']+)["']/) ||
    html.match(/href=["'](?<path>\/store\/cmdty\/detail\/[^"']+)["']/);
  const path = linkMatch?.groups?.path;
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${baseUrl}${path}`;
}

function buildEntry(
  region: Region,
  currency: Currency,
  productUrl: string,
  price: number | null,
  error?: string,
  productName?: string,
  imageUrl?: string
): PriceEntry {
  return {
    region,
    currency,
    price,
    convertedPrice: price,
    productUrl,
    error,
    productName,
    imageUrl,
  };
}

function extractPrice(html: string): number | null {
  const ld = html.match(/"price"\s*:\s*"?(?<p>[0-9]+(?:\.[0-9]+)?)/);
  if (ld?.groups?.p) {
    const num = parseFloat(ld.groups.p);
    if (!Number.isNaN(num)) return num;
  }

  const og = html.match(/property=["']product:price:amount["']\s+content=["'](?<p>[0-9.,]+)/);
  if (og?.groups?.p) {
    const num = parseFloat(og.groups.p.replace(/,/g, ''));
    if (!Number.isNaN(num)) return num;
  }

  const sym =
    html.match(/¥\s?([0-9]{1,6}(?:[,\u00A0][0-9]{3})*)/) ||
    html.match(/₩\s?([0-9]{1,7}(?:[,\u00A0][0-9]{3})*)/) ||
    html.match(/€\s?([0-9]+(?:[.,][0-9]+)?)/) ||
    html.match(/\$\s?([0-9]+(?:[.,][0-9]+)?)/);
  if (sym?.[1]) {
    const num = parseFloat(sym[1].replace(/[, \u00A0]/g, ''));
    if (!Number.isNaN(num)) return num;
  }
  return null;
}

function extractMeta(html: string): { productName?: string; imageUrl?: string } {
  const productName =
    html.match(/property=["']og:title["']\s+content=["']([^"']+)["']/)?.[1] ||
    html.match(/"name"\s*:\s*"([^"]+)"/)?.[1];
  const imageUrl =
    html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/)?.[1] ||
    html.match(/"image"\s*:\s*"([^"]+)"/)?.[1];
  return { productName, imageUrl };
}
