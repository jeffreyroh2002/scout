import type { Currency, PriceEntry, Region } from '../types';
import { UNIQLO_PROXY_URL } from '../config';

type RegionConfig = {
  region: Region;
  currency: Currency;
  url: (productId: string) => string;
  acceptLanguage: string;
};

const REGION_CONFIGS: RegionConfig[] = [
  {
    region: 'US',
    currency: 'USD',
    url: (id) => `https://www.uniqlo.com/us/en/products/E${id}-000/00`,
    acceptLanguage: 'en-US,en;q=0.9',
  },
  {
    region: 'JP',
    currency: 'JPY',
    url: (id) => `https://www.uniqlo.com/jp/ja/products/E${id}-000/00`,
    acceptLanguage: 'ja-JP,ja;q=0.9',
  },
  {
    region: 'KR',
    currency: 'KRW',
    url: (id) => `https://www.uniqlo.com/kr/ko/products/E${id}-000/00`,
    acceptLanguage: 'ko-KR,ko;q=0.9',
  },
  {
    region: 'EU',
    currency: 'EUR',
    url: (id) => `https://www.uniqlo.com/eu-ee/en/products/E${id}-000/00`,
    acceptLanguage: 'en-GB,en;q=0.9',
  },
];

const FALLBACK_PRICE_PATTERNS = [
  /"prices"\s*:\s*{\s*"base"\s*:\s*{\s*"currency"\s*:\s*{[^}]*}"[^}]*"value"\s*:\s*(?<price>[0-9]+(?:[.,][0-9]+)?)/i,
  /"salesPrice"\s*:\s*\{\s*"value"\s*:\s*(?<price>[0-9]+(?:[.,][0-9]+)?)/i,
  /"salesPrice"\s*:\s*(?<price>[0-9]+(?:[.,][0-9]+)?)/i,
  /"price"\s*:\s*\{\s*"value"\s*:\s*(?<price>[0-9]+(?:[.,][0-9]+)?)/i,
  /"price"\s*:\s*"?(?<price>[0-9]+(?:[.,][0-9]+)?)/i,
  /"unitPrice"\s*:\s*{[^}]*"value"\s*:\s*(?<price>[0-9]+(?:[.,][0-9]+)?)/i,
  /"listPrice"\s*:\s*(?<price>[0-9]+(?:[.,][0-9]+)?)/i,
  /"salesAmount"\s*:\s*{[^}]*"taxExcluded"\s*:\s*(?<price>[0-9]+(?:[.,][0-9]+)?)/i,
  /data-price="(?<price>[0-9]+(?:[.,][0-9]+)?)/i,
  /<meta\s+property=["']product:price:amount["']\s+content=["'](?<price>[0-9]+(?:[.,][0-9]+)?)["']/i,
  /"formattedPrice"\s*:\s*"[^"]*?(?<price>[0-9]+(?:[.,][0-9]+)?)/i,
  />(?<price>[0-9]+(?:[.,][0-9]+)?)\s?(?:USD|EUR|JPY|KRW|€|¥|₩|\$)</i,
];

export async function validateProductId(productId: string): Promise<boolean> {
  const checks = await Promise.all(
    REGION_CONFIGS.map(async (config) => {
      try {
        const response = await fetch(config.url(productId), { method: 'GET' });
        return response.ok;
      } catch (error) {
        return false;
      }
    })
  );

  return checks.some(Boolean);
}

export async function fetchPrices(productId: string): Promise<PriceEntry[]> {
  const proxied = await fetchPricesViaProxy(productId);
  if (proxied) {
    return Promise.all(
      proxied.map(async (entry) => {
        if (entry.price == null && entry.region === 'KR') {
          const config = REGION_CONFIGS.find((c) => c.region === entry.region);
          return config ? await fetchRegionDirect(productId, config) : entry;
        }
        return entry;
      })
    );
  }

  const results = await Promise.all(
    REGION_CONFIGS.map(async (config) => fetchRegionDirect(productId, config))
  );

  return results;
}

function parsePrice(html: string, productId: string, currency: Currency): number | null {
  const currencyMatch = matchPriceByCurrency(html, currency);
  if (currencyMatch != null) {
    return currencyMatch;
  }

  const preloadedPrice = parsePreloadedStatePrice(html, productId, currency);
  if (preloadedPrice != null) {
    return preloadedPrice;
  }

  const nextDataPrice = parseNextDataPrice(html, currency);
  if (nextDataPrice != null) {
    return nextDataPrice;
  }

  const symbolMatch = matchByCurrencySymbol(html, currency);
  if (symbolMatch != null) {
    return symbolMatch;
  }

  for (const pattern of FALLBACK_PRICE_PATTERNS) {
    const match = html.match(pattern);
    const priceRaw = match?.groups?.price ?? match?.[1];
    if (priceRaw) {
      const normalized = priceRaw.replace(',', '');
      const parsed = Number.parseFloat(normalized);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function parsePreloadedStatePrice(html: string, productId: string, currency: Currency): number | null {
  // Quick regex to avoid full JSON parse failures on huge payloads
  const regexMatch = html.match(
    /window\.__PRELOADED_STATE__\s*=\s*(?<json>\{[\s\S]+?\})\s*;/
  );
  if (regexMatch?.groups?.json) {
    try {
      const data = JSON.parse(regexMatch.groups.json);
      const keyedPrice = findPriceByProductId(data, productId, currency);
      if (keyedPrice != null) return keyedPrice;

      const price = findPriceInObject(data, currency);
      if (price != null) return price;
    } catch {
      // fall through to string search below
    }
  }

  // Fallback: search the raw HTML for a price value inside prices.base.value
  const priceMatch = html.match(
    /"prices"\s*:\s*\{[\s\S]*?"base"[\s\S]*?"currency"[\s\S]*?"code"[\s\S]*?"value"\s*:\s*(?<price>[0-9]+(?:[.,][0-9]+)?)/i
  );
  if (priceMatch?.groups?.price) {
    const parsed = Number.parseFloat(priceMatch.groups.price.replace(',', ''));
    if (!Number.isNaN(parsed)) return parsed;
  }

  return null;
}

function parseNextDataPrice(html: string, currency: Currency): number | null {
  const match =
    html.match(
      /<script id="__NEXT_DATA__" type="application\/json">(?<json>[\s\S]+?)<\/script>/
    ) || html.match(/__NEXT_DATA__\s*=\s*(?<json>\{[\s\S]+?\})\s*;/);
  if (!match?.groups?.json) return null;

  try {
    const data = JSON.parse(match.groups.json);
    const price = findPriceInObject(data, currency);
    return price != null ? price : null;
  } catch {
    return null;
  }
}

function findPriceInObject(value: unknown, currency?: Currency): number | null {
  const queue: unknown[] = [value];
  const candidates: number[] = [];
  const currencyAnchored: number[] = [];

  while (queue.length) {
    const current = queue.shift();

    if (current && typeof current === 'object') {
      const obj = current as Record<string, unknown>;
      for (const [key, val] of Object.entries(obj)) {
        if (/price|amount|value/i.test(key)) {
          if (typeof val === 'number' && val >= 0.5) {
            candidates.push(val);
            if (looksLikePriceObject(obj)) {
              currencyAnchored.push(val);
            }
          } else if (typeof val === 'string') {
            const numMatch = val.match(/([0-9]+(?:[.,][0-9]+)?)/);
            if (numMatch?.[1]) {
              const parsed = Number.parseFloat(numMatch[1].replace(',', ''));
              if (!Number.isNaN(parsed) && parsed >= 0.5) {
                candidates.push(parsed);
                if (looksLikePriceObject(obj)) {
                  currencyAnchored.push(parsed);
                }
              }
            }
          }
        }
        if (val && typeof val === 'object') {
          queue.push(val);
        }
      }
    }
  }

  const source = currencyAnchored.length ? currencyAnchored : candidates;
  if (source.length === 0) return null;
  const [min, max] = rangeForCurrency(currency);
  const plausible = source.filter((n) => n >= min && n <= max);
  if (plausible.length === 0) return null;
  return Math.min(...plausible);
}

function looksLikePriceObject(obj: Record<string, unknown>): boolean {
  const currency =
    typeof obj.currency === 'object' &&
    obj.currency !== null &&
    (obj.currency as Record<string, unknown>).code;

  return Boolean(currency) || 'currencyCode' in obj || 'currencySymbol' in obj;
}

function findPriceByProductId(
  state: Record<string, unknown>,
  productId: string,
  currency: Currency
): number | null {
  const key = `E${productId}-000-00`;
  const entity =
    state && typeof state === 'object' && 'entity' in state && state.entity && typeof state.entity === 'object'
      ? (state.entity as Record<string, unknown>)
      : null;

  const pdpEntity =
    entity && 'pdpEntity' in entity && entity.pdpEntity && typeof entity.pdpEntity === 'object'
      ? (entity.pdpEntity as Record<string, unknown>)
      : null;

  if (pdpEntity && key in pdpEntity) {
    const entry = pdpEntity[key];
    if (entry && typeof entry === 'object') {
      const price = findPriceInObject(entry, currency);
      if (price != null) return price;
    }
  }
  return null;
}

function rangeForCurrency(currency?: Currency): [number, number] {
  switch (currency) {
    case 'JPY':
      return [50, 300000];
    case 'KRW':
      return [500, 500000];
    case 'EUR':
    case 'USD':
    default:
      return [0.5, 10000];
  }
}

function matchPriceByCurrency(html: string, currency: Currency): number | null {
  const values: number[] = [];

  const basePattern = new RegExp(
    `"prices"\\s*:\\s*\\{[\\s\\S]*?"base"[\\s\\S]*?"currency"[\\s\\S]*?"code"\\s*:\\s*"` +
      currency +
      `"[\\s\\S]*?"value"\\s*:\\s*(?<price>[0-9]+(?:[.,][0-9]+)?)`,
    'gi'
  );
  const promoPattern = new RegExp(
    `"prices"\\s*:\\s*\\{[\\s\\S]*?"promo"[\\s\\S]*?"currency"[\\s\\S]*?"code"\\s*:\\s*"` +
      currency +
      `"[\\s\\S]*?"value"\\s*:\\s*(?<price>[0-9]+(?:[.,][0-9]+)?)`,
    'gi'
  );

  let match;
  while ((match = basePattern.exec(html)) !== null) {
    if (match.groups?.price) {
      const parsed = Number.parseFloat(match.groups.price.replace(',', ''));
      if (!Number.isNaN(parsed)) values.push(parsed);
    }
  }
  while ((match = promoPattern.exec(html)) !== null) {
    if (match.groups?.price) {
      const parsed = Number.parseFloat(match.groups.price.replace(',', ''));
      if (!Number.isNaN(parsed)) values.push(parsed);
    }
  }

  if (values.length === 0) return null;
  return Math.min(...values);
}

function matchByCurrencySymbol(html: string, currency: Currency): number | null {
  const patterns: RegExp[] = [];
  switch (currency) {
    case 'JPY':
      patterns.push(/[\u00A5\uFFE5]\s?(?<price>[0-9]{1,6}(?:[,\u00A0][0-9]{3})*)/g); // ¥ or ￥ with commas/nbsp
      break;
    case 'KRW':
      patterns.push(/[\u20A9\uFFE6]\s?(?<price>[0-9]{1,7}(?:[,\u00A0][0-9]{3})*)/g); // ₩ or ￦
      patterns.push(/(?<price>[0-9]{1,7}(?:[,\u00A0][0-9]{3})*)\s?원/g);
      break;
    case 'EUR':
      patterns.push(/€\s?(?<price>[0-9]+(?:[.,][0-9]+)?)/g);
      break;
    case 'USD':
    default:
      patterns.push(/\$\s?(?<price>[0-9]+(?:[.,][0-9]+)?)/g);
      break;
  }

  const values: number[] = [];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const priceRaw = match?.groups?.price;
      if (priceRaw) {
        const normalized = priceRaw.replace(/[, \u00A0]/g, '');
        const parsed = Number.parseFloat(normalized);
        if (!Number.isNaN(parsed)) {
          values.push(parsed);
        }
      }
    }
  }

  if (values.length === 0) return null;
  return Math.min(...values);
}

function countCurrencySymbols(html: string, currency: Currency): number {
  let pattern: RegExp;
  switch (currency) {
    case 'JPY':
      pattern = /[\u00A5\uFFE5]/g;
      break;
    case 'KRW':
      pattern = /[\u20A9\uFFE6]|원/g;
      break;
    case 'EUR':
      pattern = /€/g;
      break;
    case 'USD':
    default:
      pattern = /\$/g;
      break;
  }
  return (html.match(pattern) || []).length;
}

async function fetchPricesViaProxy(productId: string): Promise<PriceEntry[] | null> {
  if (!UNIQLO_PROXY_URL) return null;

  try {
    const results = await Promise.all(
      REGION_CONFIGS.map(async (config) => {
        const url = `${UNIQLO_PROXY_URL}/price?productId=${productId}&region=${config.region}`;
        try {
          const res = await fetch(url);
          if (!res.ok) {
            return {
              region: config.region,
              productUrl: config.url(productId),
              price: null,
              currency: config.currency,
              convertedPrice: null,
              error: `Proxy HTTP ${res.status}`,
            } as PriceEntry;
          }
          const data = (await res.json()) as { price?: number; currency?: string; error?: string };

          if (data.error) {
            return {
              region: config.region,
              productUrl: config.url(productId),
              price: null,
              currency: config.currency,
              convertedPrice: null,
              error: data.error,
            } as PriceEntry;
          }

          return {
            region: config.region,
            productUrl: config.url(productId),
            price: typeof data.price === 'number' ? data.price : null,
            currency: config.currency,
            convertedPrice: null,
            error: typeof data.price === 'number' ? undefined : 'Price missing from proxy',
          } as PriceEntry;
        } catch (error) {
          return {
            region: config.region,
            productUrl: config.url(productId),
            price: null,
            currency: config.currency,
            convertedPrice: null,
            error: error instanceof Error ? error.message : 'Proxy fetch failed',
          } as PriceEntry;
        }
      })
    );

    return results;
  } catch (error) {
    console.warn('Proxy fetch failed, falling back to client parsing', error);
    return null;
  }
}

async function fetchRegionDirect(productId: string, config: RegionConfig): Promise<PriceEntry> {
  const productUrl = config.url(productId);
  try {
    const response = await fetch(productUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': config.acceptLanguage,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const price = parsePrice(html, productId, config.currency);

    if (price == null) {
      const priceTokens = (html.match(/"prices"/g) || []).length;
      const symbolTokens = countCurrencySymbols(html, config.currency);
      return {
        region: config.region,
        productUrl,
        price: null,
        currency: config.currency,
        convertedPrice: null,
        error: `Price not found (len=${html.length}, prices=${priceTokens}, symbols=${symbolTokens})`,
      } as PriceEntry;
    }

    return {
      region: config.region,
      productUrl,
      price,
      currency: config.currency,
      convertedPrice: null,
    } as PriceEntry;
  } catch (error) {
    return {
      region: config.region,
      productUrl,
      price: null,
      currency: config.currency,
      convertedPrice: null,
      error: error instanceof Error ? error.message : 'Unable to fetch price',
    } as PriceEntry;
  }
}
