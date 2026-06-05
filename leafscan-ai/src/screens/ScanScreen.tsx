import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../types';
import { ScanHeader } from '../components/scan/ScanHeader';
import { ScanFrame } from '../components/scan/ScanFrame';
import { ScanTips } from '../components/scan/ScanTips';
import { ScanControls } from '../components/scan/ScanControls';
import { ScanState } from '../components/scan/types';
import { theme } from '../theme/theme';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { diagnoseApi, DiagnoseApiError, DiagnoseErrorCode } from '../api/diagnosis';
import { getSubscriptionStatusApi } from '../api/subscription';
import { useHistoryStore } from '../stores/historyStore';
import { usePlantsStore } from '../stores/plantsStore';
import {
  SUPPORTED_PLANTS,
  canonicalizePlantKey,
  derivePlantKeyFromPlant,
  plantKeyLabel,
} from '../utils/plantKey';

type PlantOption = {
  key: string;
  label: string;
  plantId?: string;
  source: 'garden' | 'supported';
};

const DIAGNOSIS_ERROR_STATES: Partial<Record<DiagnoseErrorCode, ScanState>> = {
  NO_LEAF_DETECTED: 'no_leaf_detected',
  IMAGE_TOO_DARK: 'too_dark',
  IMAGE_TOO_BLURRY: 'out_of_frame',
  LOW_CONFIDENCE: 'out_of_frame',
  PLANT_MISMATCH: 'out_of_frame',
  QUOTA_EXCEEDED: 'scan_failed',
  REQUEST_FAILED: 'scan_failed',
  DIAGNOSIS_FAILED: 'scan_failed',
  UNSUPPORTED_PLANT: 'scan_failed',
};

const FLOW_STATES: ScanState[] = ['aligning', 'out_of_frame', 'optimal'];

export default function ScanScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Scan'>>();
  const { t } = useTranslation();
  const cameraRef = useRef<CameraView | null>(null);
  const tempStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [statusOverride, setStatusOverride] = useState<ScanState | null>(null);
  const [flowIndex, setFlowIndex] = useState(0);

  const insets = useSafeAreaInsets();
  const accessToken = useAuthStore(state => state.accessToken);
  const { scanQuality, autoSaveScanImages } = useSettingsStore();
  const loadHistory = useHistoryStore(state => state.loadHistory);
  const plants = usePlantsStore(state => state.plants);
  const loadPlants = usePlantsStore(state => state.loadPlants);

  const routeSelectedPlantKey = canonicalizePlantKey(route.params?.selectedPlantKey);
  const routeSelectedPlantId = route.params?.plantId;

  const [selectedPlantKey, setSelectedPlantKey] = useState<string | undefined>(routeSelectedPlantKey);
  const [selectedPlantId, setSelectedPlantId] = useState<string | undefined>(routeSelectedPlantId);

  const selectedPlantLabel = selectedPlantKey
    ? plantKeyLabel(selectedPlantKey)
    : t('scan.select_plant');

  useEffect(() => {
    loadPlants().catch(() => undefined);
  }, [loadPlants]);

  useEffect(() => {
    if (accessToken) {
      getSubscriptionStatusApi(accessToken).catch(() => undefined);
    }
  }, [accessToken]);

  useEffect(() => {
    if (routeSelectedPlantKey) {
      setSelectedPlantKey(routeSelectedPlantKey);
      setSelectedPlantId(routeSelectedPlantId);
    }
  }, [routeSelectedPlantKey, routeSelectedPlantId]);

  useEffect(() => {
    if (!routeSelectedPlantId || routeSelectedPlantKey) {
      return;
    }

    const matchedPlant = plants.find(p => p.id === routeSelectedPlantId);
    const derivedKey = derivePlantKeyFromPlant(matchedPlant);
    if (derivedKey) {
      setSelectedPlantKey(derivedKey);
      setSelectedPlantId(routeSelectedPlantId);
    }
  }, [plants, routeSelectedPlantId, routeSelectedPlantKey]);

  const plantOptions = useMemo<PlantOption[]>(() => {
    const options: PlantOption[] = [];
    const seen = new Set<string>();

    for (const plant of plants) {
      const plantKey = derivePlantKeyFromPlant(plant);
      if (!plantKey || seen.has(plantKey)) {
        continue;
      }
      seen.add(plantKey);
      options.push({
        key: plantKey,
        plantId: plant.id,
        source: 'garden',
        label: `${plant.name} (${plantKeyLabel(plantKey)})`,
      });
    }

    for (const supported of SUPPORTED_PLANTS) {
      if (seen.has(supported.key)) {
        continue;
      }
      options.push({
        key: supported.key,
        source: 'supported',
        label: supported.label,
      });
    }

    return options;
  }, [plants]);

  useEffect(() => {
    return () => {
      if (tempStateTimeoutRef.current) {
        clearTimeout(tempStateTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedPlantKey) {
      setFlowIndex(0);
      return;
    }

    if (isScanning || statusOverride) {
      return;
    }

    const interval = setInterval(() => {
      setFlowIndex(prev => (prev + 1) % FLOW_STATES.length);
    }, 2300);

    return () => clearInterval(interval);
  }, [isScanning, selectedPlantKey, statusOverride]);

  const showTemporaryState = useCallback((nextState: ScanState, duration = 2600) => {
    if (tempStateTimeoutRef.current) {
      clearTimeout(tempStateTimeoutRef.current);
    }
    setStatusOverride(nextState);
    tempStateTimeoutRef.current = setTimeout(() => {
      setStatusOverride(null);
      tempStateTimeoutRef.current = null;
    }, duration);
  }, []);

  const scanState: ScanState = isScanning
    ? 'processing'
    : statusOverride ?? (selectedPlantKey ? FLOW_STATES[flowIndex] : 'plant_required');

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={theme.colors.primary} />
        <Text style={styles.permissionTitle}>{t('scan.permissionTitle')}</Text>
        <Text style={styles.permissionDescription}>{t('scan.permissionDescription')}</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>{t('scan.allowCamera')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const runDiagnosis = async (imageUri: string) => {
    if (!accessToken || isScanning) {
      return;
    }

    if (!selectedPlantKey) {
      showTemporaryState('plant_required', 2200);
      Alert.alert(
        t('scan.plantRequiredTitle'),
        t('scan.plantRequiredMessage')
      );
      setSelectorVisible(true);
      return;
    }

    setIsScanning(true);
    setStatusOverride(null);

    try {
      const disease = await diagnoseApi({
        token: accessToken,
        imageUri,
        plantId: selectedPlantId,
        selectedPlantKey,
      });

      showTemporaryState('scan_success', 820);

      // Auto-save ảnh vào gallery nếu setting bật
      if (autoSaveScanImages) {
        try {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === 'granted') {
            await MediaLibrary.saveToLibraryAsync(imageUri);
          }
        } catch {
          // Bỏ qua lỗi save — không block flow chính
        }
      }

      await Promise.all([loadHistory(), loadPlants()]);
      await new Promise(resolve => setTimeout(resolve, 260));

      navigation.navigate('Result', {
        result: {
          ...disease,
          imageUri: disease.imageUri || imageUri,
        },
      });
    } catch (error: any) {
      if (error instanceof DiagnoseApiError) {
        console.log('[ScanScreen] diagnose_error', {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        const matched = {
          title: t(`scan.errors.${error.code}.title`),
          message: t(`scan.errors.${error.code}.message`),
        };
        const nextState = DIAGNOSIS_ERROR_STATES[error.code] ?? 'scan_failed';
        showTemporaryState(nextState);
        if (error.code === 'QUOTA_EXCEEDED') {
          Alert.alert(
            t('scan.errors.QUOTA_EXCEEDED.title'),
            error.message || t('scan.errors.QUOTA_EXCEEDED.message'),
            [
              { text: t('scan.upgradeLater'), style: 'cancel' },
              { text: t('scan.upgradePlan'), onPress: () => navigation.navigate('UpgradePlan') },
            ]
          );
          return;
        }
        Alert.alert(
          matched?.title || t('scan.scan_failed'),
          error.message || matched?.message || t('scan.analyzeFailed')
        );
        return;
      }

      console.log('[ScanScreen] diagnose_unknown_error', error);
      showTemporaryState('scan_failed');
      Alert.alert(t('scan.scan_failed'), error?.message || t('scan.analyzeFailed'));
    } finally {
      setIsScanning(false);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isScanning) {
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: scanQuality === 'ultra' ? 1.0 : scanQuality === 'high' ? 0.85 : 0.7,
        skipProcessing: scanQuality === 'normal',
      });

      if (!photo?.uri) {
        showTemporaryState('scan_failed');
        Alert.alert(t('scan.scan_failed'), t('scan.captureFailed'));
        return;
      }

      await runDiagnosis(photo.uri);
    } catch (error: any) {
      showTemporaryState('scan_failed');
      Alert.alert(t('scan.scan_failed'), error?.message || t('scan.captureUnavailable'));
    }
  };

  const handlePickFromGallery = async () => {
    if (isScanning) {
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: scanQuality === 'ultra' ? 1.0 : scanQuality === 'high' ? 0.85 : 0.7,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      await runDiagnosis(result.assets[0].uri);
    } catch (error: any) {
      showTemporaryState('scan_failed');
      Alert.alert(t('scan.pickImageFailedTitle'), error?.message || t('common.tryAgain'));
    }
  };

  const toggleCameraFacing = () => {
    if (isScanning) {
      return;
    }
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleTorch = () => {
    if (isScanning) {
      return;
    }
    setTorchEnabled(v => !v);
  };

  const handleSelectPlant = (option: PlantOption) => {
    setSelectedPlantKey(option.key);
    setSelectedPlantId(option.plantId);
    setSelectorVisible(false);
    showTemporaryState('aligning', 1000);
  };

  const handleClose = () => {
    const parent = navigation.getParent();
    const parentState = parent?.getState();
    if (parent && parentState?.routeNames?.includes('Home')) {
      (parent as any).navigate('Home');
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    (navigation as any).navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.cameraView} facing={facing} enableTorch={torchEnabled} />

      <View style={styles.overlayLayer} pointerEvents="box-none">
        <ScanFrame state={scanState} topInset={insets.top} bottomInset={insets.bottom} />
        <ScanHeader
          topInset={insets.top}
          torchEnabled={torchEnabled}
          onClose={handleClose}
          onToggleFlash={toggleTorch}
          selectedPlantLabel={selectedPlantLabel}
          hasSelection={Boolean(selectedPlantKey)}
          onPressPlantSelector={() => setSelectorVisible(true)}
          disabled={isScanning}
        />
        <ScanTips state={scanState} bottomInset={insets.bottom} />
        <ScanControls
          isScanning={isScanning}
          captureDisabled={!selectedPlantKey}
          bottomInset={insets.bottom}
          onCapture={handleCapture}
          onPickFromGallery={handlePickFromGallery}
          onFlipCamera={toggleCameraFacing}
        />
      </View>

      <Modal
        visible={selectorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectorVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('scan.modal.title')}</Text>
              <TouchableOpacity onPress={() => setSelectorVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>{t('scan.modal.hint')}</Text>
            <ScrollView style={styles.modalList}>
              {plantOptions.map(option => {
                const active = selectedPlantKey === option.key;
                return (
                  <TouchableOpacity
                    key={`${option.source}-${option.key}`}
                    style={[styles.optionRow, active && styles.optionRowActive]}
                    onPress={() => handleSelectPlant(option)}
                  >
                    <View style={styles.optionRowTextWrap}>
                      <Text style={styles.optionTitle}>{option.label}</Text>
                      <Text style={styles.optionSubtitle}>
                        {option.source === 'garden' ? t('scan.modal.gardenSource') : t('scan.modal.supportedSource')}
                      </Text>
                    </View>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color={theme.colors.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121E18',
  },
  cameraView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1c1c1c',
  },
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    backgroundColor: theme.colors.bg,
    gap: 14,
  },
  permissionTitle: {
    fontSize: 20,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '700',
  },
  permissionDescription: {
    marginBottom: 4,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
  },
  permissionButton: {
    marginTop: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    paddingVertical: 10,
  },
  backButtonText: {
    color: theme.colors.textMuted,
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 10, 16, 0.64)',
  },
  modalSheet: {
    backgroundColor: '#F8F6F2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 26,
    maxHeight: '78%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 10,
    backgroundColor: '#D4D0C8',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE9E3',
  },
  modalHint: {
    marginTop: 8,
    marginBottom: 12,
    color: theme.colors.textSecondary,
    fontSize: 13.5,
    lineHeight: 20,
  },
  modalList: {
    maxHeight: 440,
  },
  optionRow: {
    minHeight: 60,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  optionRowActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#F2FBF3',
  },
  optionRowTextWrap: {
    flex: 1,
  },
  optionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  optionSubtitle: {
    marginTop: 2,
    color: theme.colors.textMuted,
    fontSize: 12,
  },
});
