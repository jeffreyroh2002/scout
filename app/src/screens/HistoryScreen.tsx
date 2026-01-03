import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { HistoryEntry } from '../types';

type Props = {
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClose: () => void;
};

export default function HistoryScreen({ history, onSelect, onClose }: Props) {
  const renderItem = ({ item }: { item: HistoryEntry }) => {
    const date = new Date(item.timestamp);
    const label = item.productName || `Product ${item.productId}`;
    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => onSelect(item)}
      >
        <Image
          source={
            item.imageUrl
              ? { uri: item.imageUrl }
              : require('../../assets/icon.png')
          }
          style={styles.rowImage}
        />
        <View style={styles.rowContent}>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.sub}>{item.productId}</Text>
          <Text style={styles.time}>
            {date.toLocaleDateString()}{' '}
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recent scans</Text>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeLabel}>Close</Text>
        </Pressable>
      </View>
      <FlatList
        data={history}
        keyExtractor={(item) => `${item.productId}-${item.timestamp}`}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>No history yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1720',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  closeLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    gap: 10,
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
  },
  rowContent: {
    flex: 1,
  },
  rowImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#1c2936',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sub: {
    color: '#9eb0c2',
    fontSize: 13,
  },
  time: {
    color: '#6f8297',
    fontSize: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#1e2d3c',
  },
  listContent: {
    flexGrow: 1,
  },
  empty: {
    color: '#9eb0c2',
    textAlign: 'center',
    marginTop: 24,
  },
});
