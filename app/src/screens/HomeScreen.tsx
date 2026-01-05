import { Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import type { Retailer } from '../types';

const LOGOS: Partial<Record<Retailer, any>> = {
  UNIQLO: require('../../assets/UNIQLO.png'),
  MUJI: require('../../assets/MUJI.jpg'),
  ZARA: require('../../assets/ZARA.png'),
  NIKE: require('../../assets/NIKE.jpg'),
  // No LULULEMON logo asset yet; tile will render text-only.
};

type Props = {
  selected: Retailer;
  onSelect: (r: Retailer) => void;
  onStart: () => void;
};

const RETAILERS: Retailer[] = ['UNIQLO', 'MUJI', 'ZARA', 'NIKE', 'LULULEMON'];

export default function HomeScreen({ selected, onSelect, onStart }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.backgroundFill} />
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Choose Retailer to Scan</Text>
        <View style={styles.gridWrapper}>
          <View style={styles.grid}>
            {RETAILERS.map((r) => {
              const isSelected = r === selected;
              return (
                <Pressable
                  key={r}
                  style={({ pressed }) => [
                    styles.tile,
                    isSelected && styles.tileSelected,
                    pressed && styles.tilePressed,
                  ]}
                  onPress={() => onSelect(r)}
                >
                  {LOGOS[r] ? (
                    <Image source={LOGOS[r]} style={styles.logo} resizeMode="contain" />
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <Text style={styles.logoPlaceholderText}>{r}</Text>
                    </View>
                  )}
                  <Text style={[styles.tileLabel, isSelected && styles.tileLabelSelected]}>{r}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Pressable style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]} onPress={onStart}>
          <Text style={styles.startLabel}>Start scanning</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f1720',
    position: 'relative',
  },
  backgroundFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f1720',
  },
  container: {
    flex: 1,
    backgroundColor: '#0f1720',
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 16,
  },
  gridWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    
    textAlign: 'center',
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#c8d1dc',
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  tile: {
    width: '45%',
    height: '45%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#243447',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#162333',
  },
  tileSelected: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  tilePressed: {
    opacity: 0.9,
  },
  tileLabel: {
    color: '#dbe3ef',
    fontWeight: '800',
    fontSize: 16,
  },
  tileLabelSelected: {
    color: '#0f1720',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#243447',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  logoPlaceholderText: {
    color: '#dbe3ef',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 12,
  },
  startButton: {
    marginTop: 'auto',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonPressed: {
    opacity: 0.9,
  },
  startLabel: {
    color: '#0f1720',
    fontWeight: '800',
    fontSize: 16,
  },
});
