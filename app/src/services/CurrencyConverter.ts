import type { Currency, PriceEntry } from '../types';

// Static rates to keep everything on-device. Adjust as needed.
const RATES_TO_USD: Record<Currency, number> = {
  USD: 1,
  JPY: 0.0067,
  KRW: 0.00073,
  EUR: 1.08,
};

export function convertPrices(entries: PriceEntry[], target: Currency): PriceEntry[] {
  return entries.map((entry) => {
    if (entry.price == null) {
      return entry;
    }

    const usdRate = RATES_TO_USD[entry.currency];
    const targetRate = RATES_TO_USD[target];
    const convertedToUsd = entry.price * usdRate;
    const converted = convertedToUsd / targetRate;

    return { ...entry, convertedPrice: roundToTwoDecimals(converted) };
  });
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
