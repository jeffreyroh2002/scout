import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraCapturedPicture, CameraView, useCameraPermissions } from 'expo-camera';

type Props = {
  onCapture?: (photo: CameraCapturedPicture) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  statusMessage?: string | null;
};

const INSTRUCTION = 'Take a photo of the UNIQLO tag';

export default function CameraScreen({ onCapture, onError, disabled = false, statusMessage }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(null);

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
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back">
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.topBar} pointerEvents="none">
            <Text style={styles.instruction}>{INSTRUCTION}</Text>
            {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
            {localStatus && !statusMessage ? <Text style={styles.status}>{localStatus}</Text> : null}
          </View>

          <View style={styles.bottomBar}>
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
});
