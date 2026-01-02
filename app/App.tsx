import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { CameraCapturedPicture } from 'expo-camera';

import CameraScreen from './src/screens/CameraScreen';
import ResultScreen from './src/screens/ResultScreen';
import ErrorScreen from './src/screens/ErrorScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { recognizeTextFromImage } from './src/services/OCRService';
import { extractProductId } from './src/services/ProductIdExtractor';
import { fetchPrices, validateProductId } from './src/services/UniqloPriceService';
import { convertPrices } from './src/services/CurrencyConverter';
import type { Currency, HistoryEntry, PriceEntry } from './src/types';
import { loadHistory, saveHistory, upsertHistory } from './src/services/HistoryService';

type ScreenState = 'camera' | 'processing' | 'result' | 'error' | 'history';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('camera');
  const [processingMessage, setProcessingMessage] = useState<string>('Running OCR…');
  const [result, setResult] = useState<{ productId: string; prices: PriceEntry[] } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('Something went wrong.');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [homeCurrency, setHomeCurrency] = useState<Currency>('USD');

  const runLookup = useCallback(
    async (productId: string) => {
      try {
        setScreen('processing');
        setProcessingMessage(`Found ${productId}. Validating…`);
        const valid = await validateProductId(productId);
        if (!valid) {
          throw new Error('Product not found. Please confirm the tag and try again.');
        }

        setProcessingMessage('Fetching prices across regions…');
        const priceEntries = await fetchPrices(productId);
        const converted = convertPrices(priceEntries, homeCurrency);

        setResult({ productId, prices: converted });
        setHistory((prev) => {
          const updated = upsertHistory(prev, {
            productId,
            productName: converted.find((p) => p.productName)?.productName,
            prices: converted,
            timestamp: Date.now(),
          });
          saveHistory(updated);
          return updated;
        });
        setScreen('result');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to process this tag. Please try again.';
        setErrorMessage(message);
        setScreen('error');
      }
    },
    [homeCurrency]
  );

  const resetToCamera = useCallback(() => {
    setResult(null);
    setErrorMessage('');
    setScreen('camera');
  }, []);

  const handleCapture = useCallback(
    async (photo: CameraCapturedPicture) => {
      try {
        setScreen('processing');
        setProcessingMessage('Running OCR on tag…');
        const ocrResult = await recognizeTextFromImage(photo.uri);

        const { productId } = extractProductId(ocrResult.text);
        if (!productId) {
          throw new Error('No Product ID found. Please re-scan the tag.');
        }

        await runLookup(productId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to process this tag. Please try again.';
        setErrorMessage(message);
        setScreen('error');
      }
    },
    [runLookup]
  );

  const handleManualLookup = useCallback(
    async (productId: string) => {
      await runLookup(productId);
    },
    [runLookup]
  );

  const handleHomeCurrencyChange = useCallback(
    (nextCurrency: Currency) => {
      setHomeCurrency(nextCurrency);
      setResult((prev) =>
        prev ? { ...prev, prices: convertPrices(prev.prices, nextCurrency) } : prev
      );
      setHistory((prev) =>
        prev.map((entry) => ({
          ...entry,
          prices: convertPrices(entry.prices, nextCurrency),
        }))
      );
    },
    []
  );

  const handleSelectHistory = useCallback(
    (entry: HistoryEntry) => {
      setResult({
        productId: entry.productId,
        prices: convertPrices(entry.prices, homeCurrency),
      });
      setScreen('result');
    },
    [homeCurrency]
  );

  useEffect(() => {
    loadHistory().then((items) => {
      const converted = items.map((entry) => ({
        ...entry,
        prices: convertPrices(entry.prices, homeCurrency),
      }));
      setHistory(converted);
    });
  }, [homeCurrency]);

  const renderContent = () => {
    switch (screen) {
      case 'processing':
        return <Processing message={processingMessage} />;
      case 'result':
        return result ? (
          <ResultScreen
            productId={result.productId}
            prices={result.prices}
            homeCurrency={homeCurrency}
            onChangeHomeCurrency={handleHomeCurrencyChange}
            onRescan={resetToCamera}
          />
        ) : null;
      case 'error':
        return <ErrorScreen message={errorMessage} onRetry={resetToCamera} />;
      case 'history':
        return (
          <HistoryScreen
            history={history}
            onSelect={(entry) => {
              handleSelectHistory(entry);
            }}
            onClose={resetToCamera}
          />
        );
      case 'camera':
      default:
        return (
          <CameraScreen
            onCapture={handleCapture}
            onManualLookup={handleManualLookup}
            history={history}
            onSelectHistory={handleSelectHistory}
            onOpenHistory={() => setScreen('history')}
            statusMessage={null}
            disabled={false}
          />
        );
    }
  };

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        {renderContent()}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function Processing({ message }: { message: string }) {
  return (
    <View style={styles.processingContainer}>
      <ActivityIndicator size="large" color="#fff" />
      <Text style={styles.processingText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  processingContainer: {
    flex: 1,
    backgroundColor: '#0f1720',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  processingText: {
    color: '#e2e8f0',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
