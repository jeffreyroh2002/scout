import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PriceEntry } from '../types';

type Props = {
  productId: string;
  prices: PriceEntry[];
  homeCurrency: string;
  onRescan: () => void;
};

export default function ResultScreen({ productId, prices, homeCurrency, onRescan }: Props) {
  const renderRow = ({ item }: { item: PriceEntry }) => {
    const isUnavailable = Boolean(item.error && item.error.includes('HTTP 404'));

    return (
      <View style={[styles.row, isUnavailable && styles.rowUnavailable]}>
        <View style={styles.cellRegionWrap}>
          <Text style={[styles.cellRegion, isUnavailable && styles.textMuted]}>{item.region}</Text>
          {item.error ? (
            <Text style={styles.errorText}>
              {isUnavailable ? 'Not available in this region' : item.error}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.cellPrice, isUnavailable && styles.textMuted]}>
          {item.price != null ? `${item.price} ${item.currency}` : '—'}
        </Text>
        <Text style={[styles.cellPrice, isUnavailable && styles.textMuted]}>
          {item.convertedPrice != null ? `${item.convertedPrice} ${homeCurrency}` : '—'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Product {productId}</Text>
      <Text style={styles.subtitle}>Prices by region</Text>

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
