import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Currency, PriceEntry } from '../types';

const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  JPY: '¥',
  KRW: '₩',
};

type Props = {
  productId: string;
  prices: PriceEntry[];
  homeCurrency: Currency;
  onChangeHomeCurrency: (currency: Currency) => void;
  onRescan: () => void;
};

export default function ResultScreen({
  productId,
  prices,
  homeCurrency,
  onChangeHomeCurrency,
  onRescan,
}: Props) {
  const bestDeal = getBestDeal(prices, homeCurrency);
  const productName =
    prices.find((p) => p.productName)?.productName?.trim() || `Product ${productId}`;

  const renderRow = ({ item }: { item: PriceEntry }) => {
    const isUnavailable = Boolean(item.error && item.error.includes('HTTP 404'));
    const canOpen = Boolean(item.productUrl);
    const savings = getSavingsForRegion(item.region, prices, homeCurrency);

    return (
      <Pressable
        accessibilityRole={canOpen ? 'button' : undefined}
        accessibilityLabel={canOpen ? `Open ${item.region} product page` : undefined}
        onPress={() => {
          if (canOpen) Linking.openURL(item.productUrl!);
        }}
        disabled={!canOpen}
        style={({ pressed }) => [
          styles.row,
          isUnavailable && styles.rowUnavailable,
          pressed && canOpen && styles.rowPressed,
        ]}
      >
        <View style={styles.cellRegionWrap}>
          <Text style={[styles.cellRegion, isUnavailable && styles.textMuted]}>{item.region}</Text>
          {item.error ? (
            <Text style={styles.errorText}>
              {isUnavailable ? 'Not available in this region' : item.error}
            </Text>
          ) : savings > 0 ? (
            <Text style={styles.savingsText}>
              Save {CURRENCY_SYMBOL[homeCurrency]}
              {savings}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.cellPrice, isUnavailable && styles.textMuted]}>
          {item.price != null
            ? `${CURRENCY_SYMBOL[item.currency] ?? item.currency} ${item.price}`
            : '—'}
        </Text>
        <Text style={[styles.cellPrice, isUnavailable && styles.textMuted]}>
          {item.convertedPrice != null
            ? `${CURRENCY_SYMBOL[homeCurrency] ?? homeCurrency} ${item.convertedPrice}`
            : '—'}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{productName}</Text>
      <View style={styles.currencyRow}>
        <Text style={styles.subtitle}>Home currency</Text>
        <View style={styles.currencyChips}>
          {(['USD', 'EUR', 'JPY', 'KRW'] as Currency[]).map((c) => {
            const selected = c === homeCurrency;
            return (
              <Pressable
                key={c}
                style={({ pressed }) => [
                  styles.chip,
                  selected && styles.chipSelected,
                  pressed && styles.chipPressed,
                ]}
                onPress={() => {
                  if (!selected) {
                    onChangeHomeCurrency(c);
                  }
                }}
              >
                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                  {CURRENCY_SYMBOL[c]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {bestDeal ? (
        <View style={styles.dealBanner}>
          <Text style={styles.dealText}>
            Save {CURRENCY_SYMBOL[homeCurrency]}
            {bestDeal.savings} by buying in {bestDeal.region}
          </Text>
        </View>
      ) : null}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.headerRegion]}>Country</Text>
        <Text style={styles.headerCell}>Local</Text>
        <Text style={styles.headerCell}>Converted</Text>
      </View>

      <FlatList
        data={prices}
        keyExtractor={(item) => item.region}
        renderItem={renderRow}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
      />

      <Pressable style={styles.rescanButton} onPress={onRescan}>
        <Text style={styles.rescanButtonText}>Scan another tag</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1720',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#c8d1dc',
    fontSize: 16,
  },
  currencyRow: {
    marginTop: 4,
    marginBottom: 6,
    gap: 8,
  },
  currencyChips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#243447',
  },
  chipSelected: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipLabel: {
    color: '#dbe3ef',
    fontWeight: '600',
  },
  chipLabelSelected: {
    color: '#0f1720',
  },
  dealBanner: {
    backgroundColor: '#123245',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  dealText: {
    color: '#d0f0ff',
    fontWeight: '700',
    fontSize: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#243447',
  },
  headerCell: {
    color: '#8ea0b4',
    fontWeight: '700',
    flex: 1,
    textAlign: 'left',
  },
  headerRegion: {
    flex: 0.8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
  },
  rowUnavailable: {
    opacity: 0.5,
  },
  cellRegionWrap: {
    flex: 0.8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#1e2d3c',
  },
  cellRegion: {
    color: '#fff',
    fontWeight: '600',
  },
  cellPrice: {
    color: '#dbe3ef',
    flex: 1,
  },
  textMuted: {
    color: '#96a4b5',
  },
  errorText: {
    color: '#f97373',
    fontSize: 12,
    marginTop: 4,
  },
  savingsText: {
    color: '#6ee7b7',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  listContent: {
    flexGrow: 0,
  },
  rescanButton: {
    marginTop: 'auto',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  rescanButtonText: {
    color: '#0f1720',
    fontSize: 16,
    fontWeight: '700',
  },
});

function getBestDeal(
  prices: PriceEntry[],
  homeCurrency: Currency
): { savings: number; region: string } | null {
  const homeEntry = prices.find(
    (p) => p.convertedPrice != null && p.currency === homeCurrency && !p.error
  );
  if (!homeEntry || homeEntry.convertedPrice == null) return null;

  const candidates = prices.filter(
    (p) => p.convertedPrice != null && p.currency !== homeCurrency && !p.error
  );
  if (candidates.length === 0) return null;

  const best = candidates.reduce((min, curr) =>
    (curr.convertedPrice as number) < (min.convertedPrice as number) ? curr : min
  );

  const savings =
    Math.round((homeEntry.convertedPrice - (best.convertedPrice as number)) * 100) / 100;
  if (savings <= 0) return null;

  return { savings, region: best.region };
}

function getSavingsForRegion(
  region: string,
  prices: PriceEntry[],
  homeCurrency: Currency
): number {
  const homeEntry = prices.find(
    (p) => p.convertedPrice != null && p.currency === homeCurrency && !p.error
  );
  if (!homeEntry || homeEntry.convertedPrice == null) return 0;
  const target = prices.find((p) => p.region === region && p.convertedPrice != null && !p.error);
  if (!target || target.convertedPrice == null) return 0;
  const savings = homeEntry.convertedPrice - target.convertedPrice;
  return savings > 0 ? Math.round(savings * 100) / 100 : 0;
}
