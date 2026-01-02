import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  PinchGestureHandler,
  type PinchGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { CameraCapturedPicture, CameraView, useCameraPermissions } from 'expo-camera';
import type { HistoryEntry } from '../types';

type Props = {
  onCapture?: (photo: CameraCapturedPicture) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  statusMessage?: string | null;
  onManualLookup?: (productId: string) => void;
  history?: HistoryEntry[];
  onSelectHistory?: (entry: HistoryEntry) => void;
  onOpenHistory?: () => void;
};

const INSTRUCTION = 'Take a photo of the tag';

export default function CameraScreen({
  onCapture,
  onError,
  onManualLookup,
  history = [],
  onSelectHistory,
  onOpenHistory,
  disabled = false,
  statusMessage,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.2); // start slightly zoomed to avoid ultra-wide look
  const baseZoom = useRef(zoom);
  const [debugInput, setDebugInput] = useState('');

  const clampZoom = (value: number) => Math.min(1, Math.max(0, value));

  const handlePinch = (event: PinchGestureHandlerGestureEvent) => {
    const scaled = clampZoom(baseZoom.current * event.nativeEvent.scale);
    setZoom(Number(scaled.toFixed(3)));
  };

  const handlePinchStateChange = () => {
    baseZoom.current = zoom;
  };

  useEffect(() => {
    if (permission?.status === 'undetermined') {
      requestPermission();
    }
  }, [permission?.status, requestPermission]);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setLocalStatus(null);
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: true,
      });

      if (photo) {
        setLocalStatus('Captured. Ready for OCR and price lookup.');
        onCapture?.(photo);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not capture photo. Please try again.';
      setLocalStatus(message);
      onError?.(error as Error);
    } finally {
      setIsCapturing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={styles.permissionText}>Checking camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionHeadline}>Camera access is required</Text>
        <Text style={styles.permissionText}>
          Allow camera access to scan UNIQLO tags and extract the product ID.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonLabel}>Allow camera access</Text>
        </Pressable>
        {!permission.canAskAgain && (
          <Text style={styles.permissionFootnote}>
            Enable camera access from system settings to continue.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PinchGestureHandler onGestureEvent={handlePinch} onEnded={handlePinchStateChange}>
        <View style={{ flex: 1 }}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            zoom={zoom}
            enableTorch={false}
          >
            <View style={styles.overlay} pointerEvents="box-none">
              <View style={styles.topBar} pointerEvents="none">
                <Text style={styles.instruction}>{INSTRUCTION}</Text>
                {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
                {localStatus && !statusMessage ? (
                  <Text style={styles.status}>{localStatus}</Text>
                ) : null}
              </View>

              {__DEV__ && onManualLookup ? (
                <View style={styles.debugFloating} pointerEvents="box-none">
                  <View style={styles.debugPanel}>
                    <TextInput
                      placeholder="Paste product URL or ID"
                      placeholderTextColor="rgba(255,255,255,0.6)"
                      style={styles.debugInput}
                      value={debugInput}
                      onChangeText={setDebugInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onSubmitEditing={() => {
                        const idMatch = debugInput.match(/E?(\d{6})/);
                        const id = idMatch?.[1];
                        if (id) {
                          setLocalStatus(`Manual lookup: ${id}`);
                          onManualLookup(id);
                        } else {
                          setLocalStatus('Enter a valid 6-digit ID or URL containing it.');
                        }
                      }}
                      returnKeyType="search"
                    />
                  </View>
                </View>
              ) : null}

              <View style={styles.frameContainer} pointerEvents="none">
                <View style={styles.scanFrame} />
              </View>

              <View style={styles.bottomBar}>
                {history.length > 0 && onOpenHistory ? (
                  <Pressable
                    style={({ pressed }) => [styles.historyButton, pressed && styles.historyButtonPressed]}
                    onPress={onOpenHistory}
                  >
                    <Text style={styles.historyButtonLabel}>History</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Capture photo"
                  style={({ pressed }) => [
                    styles.shutterButton,
                    pressed && styles.shutterButtonPressed,
                    (isCapturing || disabled) && styles.shutterButtonDisabled,
                  ]}
                  onPress={handleCapture}
                  disabled={isCapturing || disabled}
                >
                  {isCapturing ? (
                    <ActivityIndicator color="#111" />
                  ) : (
                    <View style={styles.shutterInner} />
                  )}
                </Pressable>
              </View>
            </View>
          </CameraView>
        </View>
      </PinchGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  topBar: {
    gap: 6,
  },
  instruction: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  status: {
    color: '#f2f2f2',
    fontSize: 14,
    textAlign: 'center',
  },
  bottomBar: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  historyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  historyButtonPressed: {
    opacity: 0.8,
  },
  historyButtonLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  frameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: '60%',
    aspectRatio: 0.4,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#00d1ff',
    backgroundColor: 'rgba(0, 209, 255, 0.06)',
    shadowColor: '#00d1ff',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  shutterButton: {
    height: 72,
    width: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  shutterButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  shutterButtonDisabled: {
    opacity: 0.6,
  },
  shutterInner: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  permissionHeadline: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionText: {
    color: '#e6e6e6',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonLabel: {
    color: '#111',
    fontSize: 16,
    fontWeight: '700',
  },
  permissionFootnote: {
    color: '#c7c7c7',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  debugPanel: {
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  debugFloating: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '78%',
    transform: [{ translateX: -0.39 * 100 + '%' as any }, { translateY: -0.5 * 100 + '%' as any }],
  },
  debugInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  debugButton: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  debugButtonDisabled: {
    opacity: 0.6,
  },
  debugButtonLabel: {
    color: '#0f1720',
    fontWeight: '700',
  },
  historyWrap: {
    marginTop: 8,
    gap: 6,
  },
  historyTitle: {
    color: '#e6e6e6',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
