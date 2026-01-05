import { convertPrices } from './CurrencyConverter';
import { fetchPrices as fetchUniqloPrices, validateProductId } from './UniqloPriceService';
import type { Currency, PriceEntry, Retailer } from '../types';

const REGIONS: Array<{ region: PriceEntry['region']; currency: Currency }> = [
  { region: 'US', currency: 'USD' },
  { region: 'JP', currency: 'JPY' },
  { region: 'KR', currency: 'KRW' },
  { region: 'EU', currency: 'EUR' },
];

export async function validateProduct(productId: string, retailer: Retailer): Promise<boolean> {
  if (retailer === 'UNIQLO') {
    return validateProductId(productId);
  }
  if (retailer === 'MUJI') {
    // MUJI SKUs are typically 13-digit numeric (EAN-like) codes.
    return /^\d{13}$/.test(productId);
  }
  // Placeholder: assume valid for other retailers for now
  return true;
}

export async function fetchPricesByRetailer(
  productId: string,
  retailer: Retailer,
  homeCurrency: Currency
): Promise<PriceEntry[]> {
  if (retailer === 'UNIQLO') {
    return convertPrices(await fetchUniqloPrices(productId), homeCurrency);
  }

  // Placeholder entries for unimplemented retailers
  return REGIONS.map(({ region, currency }) => ({
    region,
    productUrl: '',
    price: null,
    currency,
    convertedPrice: null,
    error: `${retailer} not supported yet`,
  })) as PriceEntry[];
}
