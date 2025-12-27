import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  message: string;
  detail?: string;
  onRetry: () => void;
};

export default function ErrorScreen({ message, detail, onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>We hit a snag</Text>
      <Text style={styles.message}>{message}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}

      <Pressable style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonLabel}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1720',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  message: {
    color: '#e2e8f0',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  detail: {
    color: '#9fb3c8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonLabel: {
    color: '#0f1720',
    fontSize: 16,
    fontWeight: '700',
  },
});
