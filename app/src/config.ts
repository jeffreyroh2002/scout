// Configuration for external services.
// Set EXPO_PUBLIC_UNIQLO_PROXY_URL (e.g., https://your-proxy.example.com)
// to route price fetches through a server that returns parsed prices.
export const UNIQLO_PROXY_URL = process.env.EXPO_PUBLIC_UNIQLO_PROXY_URL ?? '';
