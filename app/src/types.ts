export type Region = 'US' | 'JP' | 'KR' | 'EU';

export type Currency = 'USD' | 'JPY' | 'KRW' | 'EUR';

export type PriceEntry = {
  region: Region;
  productUrl: string;
  price: number | null;
  currency: Currency;
  convertedPrice: number | null;
  error?: string;
  productName?: string;
};

export type OcrResult = {
  text: string[];
  rawText?: string;
};
