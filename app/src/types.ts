export type Region = 'US' | 'JP' | 'KR' | 'EU';

export type Currency = 'USD' | 'JPY' | 'KRW' | 'EUR';
export type Retailer = 'UNIQLO' | 'MUJI' | 'ZARA' | 'NIKE' | 'LULULEMON';

export type PriceEntry = {
  region: Region;
  productUrl: string;
  price: number | null;
  currency: Currency;
  convertedPrice: number | null;
  error?: string;
  productName?: string;
  imageUrl?: string;
};

export type HistoryEntry = {
  productId: string;
  productName?: string;
  imageUrl?: string;
  prices: PriceEntry[];
  retailer: Retailer;
  timestamp: number;
};

export type OcrResult = {
  text: string[];
  rawText?: string;
};
