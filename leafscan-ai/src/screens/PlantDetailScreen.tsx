import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { usePlantsStore } from '../stores/plantsStore';
import { HealthRing } from '../components/HealthRing';
import { SeverityBadge } from '../components/SeverityBadge';
import { theme } from '../theme/theme';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'PlantDetail'>;
    route: RouteProp<RootStackParamList, 'PlantDetail'>;
};

export default function PlantDetailScreen({ navigation, route }: Props) {
    const { plantId } = route.params;
    const plants = usePlantsStore(state => state.plants);
    const deletePlant = usePlantsStore(state => state.deletePlant);
    const plant = plants.find(p => p.id === plantId);

    const severityMap: Record<string, 'healthy' | 'moderate' | 'severe'> = {
        healthy: 'healthy',
        warning: 'moderate',
        critical: 'severe',
    };

    if (!plant) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: theme.colors.textSecondary }}>Không tìm thấy cây</Text>
            </View>
        );
    }

    const handleDelete = () => {
        Alert.alert(
            'Xóa cây',
            `Bạn có chắc muốn xóa ${plant.name}?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deletePlant(plantId);
                            navigation.goBack();
                        } catch (error: any) {
                            Alert.alert('Không thể xóa cây', error?.message || 'Vui lòng thử lại.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết cây</Text>
                <TouchableOpacity onPress={() => navigation.navigate('EditPlant', { plantId })} style={styles.backButton}>
                    <Ionicons name="create-outline" size={22} color={theme.colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Hero Image */}
                <Image source={{ uri: plant.image }} style={styles.heroImage} />

                {/* Info Section */}
                <View style={styles.infoSection}>
                    <View style={styles.nameRow}>
                        <View style={styles.nameCol}>
                            <Text style={styles.plantName}>{plant.name}</Text>
                            <Text style={styles.latinName}>{plant.latinName}</Text>
                        </View>
                        <HealthRing score={plant.healthScore} size={72} strokeWidth={6} />
                    </View>
                    <SeverityBadge severity={severityMap[plant.status]} size="md" />
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.statValue}>{plant.daysTracked}</Text>
                        <Text style={styles.statLabel}>Ngày theo dõi</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="scan-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.statValue}>{plant.totalScans}</Text>
                        <Text style={styles.statLabel}>Lần quét</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.statValue}>{plant.nextScan}</Text>
                        <Text style={styles.statLabel}>Quét tiếp</Text>
                    </View>
                </View>

                {/* Location */}
                <View style={styles.detailCard}>
                    <Ionicons name="location-outline" size={20} color={theme.colors.textMuted} />
                    <View>
                        <Text style={styles.detailLabel}>Vị trí</Text>
                        <Text style={styles.detailValue}>{plant.location}</Text>
                    </View>
                </View>

                {/* Notes */}
                {plant.notes && (
                    <View style={styles.detailCard}>
                        <Ionicons name="document-text-outline" size={20} color={theme.colors.textMuted} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.detailLabel}>Ghi chú</Text>
                            <Text style={styles.detailValue}>{plant.notes}</Text>
                        </View>
                    </View>
                )}

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => navigation.navigate('Scan')} style={styles.scanButton}>
                        <Ionicons name="camera" size={20} color={theme.colors.white} />
                        <Text style={styles.scanButtonText}>Quét ngay</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                        <Ionicons name="trash-outline" size={20} color={theme.colors.severe} />
                        <Text style={styles.deleteButtonText}>Xóa cây</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.bgCard,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    heroImage: {
        width: '100%',
        height: 260,
        resizeMode: 'cover',
    },
    infoSection: {
        padding: 20,
        gap: 12,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    nameCol: {
        flex: 1,
        marginRight: 12,
    },
    plantName: {
        fontSize: 26,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    latinName: {
        fontSize: 14,
        color: theme.colors.textMuted,
        fontStyle: 'italic',
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 10,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.bgCard,
        borderRadius: 16,
        padding: 14,
        alignItems: 'center',
        gap: 6,
        borderWidth: 0.5,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    statLabel: {
        fontSize: 10,
        color: theme.colors.textMuted,
        textAlign: 'center',
    },
    detailCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: theme.colors.bgCard,
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 16,
        borderRadius: 16,
        borderWidth: 0.5,
        borderColor: theme.colors.border,
    },
    detailLabel: {
        fontSize: 12,
        color: theme.colors.textMuted,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 14,
        color: theme.colors.textPrimary,
        lineHeight: 20,
    },
    actions: {
        paddingHorizontal: 20,
        gap: 12,
        marginTop: 16,
    },
    scanButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        height: 54,
        backgroundColor: theme.colors.primary,
        borderRadius: 14,
        ...theme.shadows.scanButton,
    },
    scanButtonText: {
        color: theme.colors.white,
        fontWeight: '600',
        fontSize: 16,
    },
    deleteButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        height: 48,
        backgroundColor: theme.colors.severeBg,
        borderRadius: 14,
    },
    deleteButtonText: {
        color: theme.colors.severe,
        fontWeight: '600',
        fontSize: 15,
    },
});
