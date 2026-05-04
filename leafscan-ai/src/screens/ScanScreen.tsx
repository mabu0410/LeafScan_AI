import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../types';
import { ScanOverlay } from '../components/ScanOverlay';
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
    const [permission, requestPermission] = useCameraPermissions();
    const accessToken = useAuthStore(state => state.accessToken);
    const loadHistory = useHistoryStore(state => state.loadHistory);
    const loadPlants = usePlantsStore(state => state.loadPlants);

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
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    return (
        <View style={styles.container}>
            <CameraView ref={cameraRef} style={styles.cameraView} facing={facing} enableTorch={torchEnabled}>
                <ScanOverlay />
            </CameraView>

            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topButton}>
                    <Ionicons name="close" size={24} color={theme.colors.white} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setTorchEnabled(v => !v)} style={styles.topButton}>
                    <Ionicons name={torchEnabled ? 'flash' : 'flash-outline'} size={24} color={theme.colors.white} />
                </TouchableOpacity>
            </View>

            <View style={styles.bottomControls}>
                {isScanning ? (
                    <View style={styles.progressContainer}>
                        <Ionicons name="scan" size={28} color={theme.colors.white} />
                        <Text style={styles.progressText}>Đang phân tích ảnh...</Text>
                    </View>
                ) : (
                    <>
                        <TouchableOpacity onPress={handlePickFromGallery} style={styles.galleryButton}>
                            <Ionicons name="images-outline" size={24} color={theme.colors.white} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleCapture} style={styles.captureButton} activeOpacity={0.8}>
                            <View style={styles.captureInner}>
                                <Ionicons name="scan" size={32} color={theme.colors.white} />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={toggleCameraFacing} style={styles.galleryButton}>
                            <Ionicons name="camera-reverse-outline" size={24} color={theme.colors.white} />
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {!isScanning && (
                <Text style={styles.hint}>Đưa lá cây vào khung hình</Text>
            )}
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    topBar: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 20,
    },
    topButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomControls: {
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 32,
        paddingHorizontal: 40,
        zIndex: 20,
    },
    galleryButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: theme.colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
    },
    captureInner: {
        width: '100%',
        height: '100%',
        borderRadius: 36,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
    },
    progressText: {
        color: theme.colors.white,
        fontSize: 14,
        fontWeight: '500',
    },
    hint: {
        position: 'absolute',
        bottom: 160,
        alignSelf: 'center',
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontWeight: '500',
        zIndex: 20,
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
