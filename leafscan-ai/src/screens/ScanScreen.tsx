import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { ScanOverlay } from '../components/scan/ScanOverlay';
import { ScanHeader } from '../components/scan/ScanHeader';
import { CaptureControls } from '../components/scan/CaptureControls';
import { ScanGuideText } from '../components/scan/ScanGuideText';
import { ScanStatus } from '../components/scan/ScanStatus';
import { ScanState } from '../components/scan/types';
import { theme } from '../theme/theme';
import { useAuthStore } from '../stores/authStore';
import { diagnoseApi } from '../api/diagnosis';
import { useHistoryStore } from '../stores/historyStore';
import { usePlantsStore } from '../stores/plantsStore';

export default function ScanScreen() {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const cameraRef = useRef<CameraView | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [facing, setFacing] = useState<CameraType>('back');
    const [torchEnabled, setTorchEnabled] = useState(false);
    const [scanState, setScanState] = useState<ScanState>('ready');
    const [permission, requestPermission] = useCameraPermissions();
    const insets = useSafeAreaInsets();
    const accessToken = useAuthStore(state => state.accessToken);
    const loadHistory = useHistoryStore(state => state.loadHistory);
    const loadPlants = usePlantsStore(state => state.loadPlants);

    useEffect(() => {
        if (isScanning) {
            setScanState('processing');
            return;
        }

        const phaseOrder: ScanState[] = ['aligning', 'optimal', 'ready'];
        let index = 0;
        setScanState(phaseOrder[index]);

        const interval = setInterval(() => {
            index = (index + 1) % phaseOrder.length;
            setScanState(phaseOrder[index]);
        }, 2200);

        return () => clearInterval(interval);
    }, [isScanning]);

    if (!permission) {
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Ionicons name="camera-outline" size={64} color={theme.colors.primary} />
                <Text style={styles.permissionText}>Chúng tôi cần quyền truy cập camera để quét lá cây</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
                    <Text style={styles.permissionButtonText}>Cho phép truy cập</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const runDiagnosis = async (imageUri: string) => {
        if (!accessToken || isScanning) {
            return;
        }

        setIsScanning(true);
        try {
            const disease = await diagnoseApi({
                token: accessToken,
                imageUri,
            });

            await Promise.all([
                loadHistory(),
                loadPlants(),
            ]);

            navigation.navigate('Result', { result: disease });
        } catch (error: any) {
            Alert.alert('Quét thất bại', error?.message || 'Không thể phân tích ảnh lúc này.');
        } finally {
            setIsScanning(false);
        }
    };

    const handleCapture = async () => {
        if (!cameraRef.current || isScanning) {
            return;
        }

        const photo = await cameraRef.current.takePictureAsync({
            quality: 0.8,
            skipProcessing: true,
        });

        if (!photo?.uri) {
            Alert.alert('Quét thất bại', 'Không thể chụp ảnh, vui lòng thử lại.');
            return;
        }

        await runDiagnosis(photo.uri);
    };

    const handlePickFromGallery = async () => {
        if (isScanning) {
            return;
        }

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                quality: 0.8,
                allowsEditing: false,
            });

            if (result.canceled || !result.assets?.[0]?.uri) {
                return;
            }

            await runDiagnosis(result.assets[0].uri);
        } catch (error: any) {
            Alert.alert('Không thể chọn ảnh', error?.message || 'Vui lòng thử lại.');
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

    return (
        <View style={styles.container}>
            <CameraView ref={cameraRef} style={styles.cameraView} facing={facing} enableTorch={torchEnabled} />

            <View style={styles.overlayLayer} pointerEvents="box-none">
                <ScanOverlay state={scanState} topInset={insets.top} bottomInset={insets.bottom} />

                <ScanHeader
                    topInset={insets.top}
                    torchEnabled={torchEnabled}
                    onClose={() => navigation.goBack()}
                    onToggleFlash={toggleTorch}
                    disabled={isScanning}
                />

                <ScanGuideText state={scanState} bottomInset={insets.bottom} />
                <ScanStatus state={scanState} bottomInset={insets.bottom} />
                <CaptureControls
                    isScanning={isScanning}
                    bottomInset={insets.bottom}
                    onCapture={handleCapture}
                    onPickFromGallery={handlePickFromGallery}
                    onFlipCamera={toggleCameraFacing}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bgDark,
    },
    cameraView: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#2a2a2a',
    },
    overlayLayer: {
        ...StyleSheet.absoluteFillObject,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: theme.colors.bg,
        gap: 24,
    },
    permissionText: {
        fontSize: 18,
        color: theme.colors.textPrimary,
        textAlign: 'center',
        lineHeight: 26,
        fontWeight: '500',
    },
    permissionButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    permissionButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        paddingVertical: 12,
    },
    backButtonText: {
        color: theme.colors.textMuted,
        fontSize: 16,
    },
});
