import React, { useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../stores/authStore';
import { usePlantsStore } from '../stores/plantsStore';
import { useHistoryStore } from '../stores/historyStore';
import { DailyTipCard } from '../components/DailyTipCard';
import { PlantCard } from '../components/PlantCard';
import { HealthRing } from '../components/HealthRing';
import { theme } from '../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const user = useAuthStore(state => state.user);
    const plants = usePlantsStore(state => state.plants);
    const loadPlants = usePlantsStore(state => state.loadPlants);
    const scans = useHistoryStore(state => state.scans);
    const loadHistory = useHistoryStore(state => state.loadHistory);

    const urgentPlants = plants.filter(p => p.status === 'critical' || p.status === 'warning');
    const avgHealth = plants.length > 0
        ? Math.round(plants.reduce((sum, p) => sum + p.healthScore, 0) / plants.length)
        : 0;
    const recentScans = scans.slice(0, 3);

    useEffect(() => {
        loadPlants().catch(() => undefined);
        loadHistory().catch(() => undefined);
    }, [loadPlants, loadHistory]);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Xin chào,</Text>
                    <Text style={styles.userName}>{user?.name || 'Nông dân'} 👋</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="notifications-outline" size={22} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.avatar}
                        onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' } as any)}
                    >
                        <Ionicons name="person" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <HealthRing score={avgHealth} size={56} strokeWidth={5} />
                    <View style={styles.statText}>
                        <Text style={styles.statLabel}>Sức khỏe TB</Text>
                        <Text style={styles.statValue}>{avgHealth}%</Text>
                    </View>
                </View>
                <View style={styles.statCard}>
                    <View style={styles.statIconBox}>
                        <Ionicons name="leaf" size={24} color={theme.colors.primary} />
                    </View>
                    <View style={styles.statText}>
                        <Text style={styles.statLabel}>Số cây</Text>
                        <Text style={styles.statValue}>{plants.length}</Text>
                    </View>
                </View>
                <View style={styles.statCard}>
                    <View style={[styles.statIconBox, { backgroundColor: theme.colors.severeBg }]}>
                        <Ionicons name="warning" size={24} color={theme.colors.severe} />
                    </View>
                    <View style={styles.statText}>
                        <Text style={styles.statLabel}>Cần chú ý</Text>
                        <Text style={[styles.statValue, { color: theme.colors.severe }]}>{urgentPlants.length}</Text>
                    </View>
                </View>
            </View>

            {/* CTA Scan */}
            <TouchableOpacity
                onPress={() => navigation.navigate('Scan')}
                activeOpacity={0.85}
                style={styles.scanCTA}
            >
                <View style={styles.scanIcon}>
                    <Ionicons name="camera" size={28} color={theme.colors.white} />
                </View>
                <View style={styles.scanText}>
                    <Text style={styles.scanTitle}>Quét lá ngay</Text>
                    <Text style={styles.scanSubtitle}>Phát hiện bệnh cây trong 3 giây</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.white} />
            </TouchableOpacity>

            {/* Daily Tip */}
            <View style={styles.section}>
                <DailyTipCard />
            </View>

            {/* Urgent Plants */}
            {urgentPlants.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>⚠️ Cần xử lý</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {urgentPlants.map(plant => (
                            <View key={plant.id} style={styles.urgentCard}>
                                <PlantCard
                                    plant={plant}
                                    onPress={() => navigation.navigate('PlantDetail', { plantId: plant.id })}
                                />
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Recent Scans */}
            <View style={[styles.section, { marginBottom: 100 }]}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Lịch sử gần đây</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'History' } as any)}>
                        <Text style={styles.seeAll}>Xem tất cả</Text>
                    </TouchableOpacity>
                </View>
                {recentScans.map(item => (
                    <TouchableOpacity
                        key={item.id}
                        onPress={() => navigation.navigate('DiseaseDetail', { diseaseId: item.diseaseKey || item.id })}
                        style={styles.historyItem}
                    >
                        <Image source={{ uri: item.image }} style={styles.historyImage} />
                        <View style={styles.historyContent}>
                            <Text style={styles.historyName} numberOfLines={1}>{item.result}</Text>
                            <Text style={styles.historyPlant} numberOfLines={1}>{item.plantName}</Text>
                            <Text style={styles.historyDate}>{item.date.split('·')[0].trim()}</Text>
                        </View>
                        <View style={styles.historyRight}>
                            <Text style={styles.historyConfidence}>{item.confidence}%</Text>
                            <Text style={styles.historyConfLabel}>Độ tin cậy</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bg,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    greeting: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    userName: {
        fontSize: 24,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.bgCard,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primaryPale,
        justifyContent: 'center',
        alignItems: 'center',
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
        padding: 12,
        alignItems: 'center',
        gap: 8,
        borderWidth: 0.5,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
    },
    statIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.primaryPale,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statText: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        color: theme.colors.textMuted,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    scanCTA: {
        marginHorizontal: 20,
        backgroundColor: theme.colors.primary,
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
        ...theme.shadows.scanButton,
    },
    scanIcon: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanText: {
        flex: 1,
    },
    scanTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.white,
        marginBottom: 4,
    },
    scanSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    seeAll: {
        fontSize: 13,
        color: theme.colors.primary,
        fontWeight: '500',
    },
    urgentCard: {
        width: 160,
        marginRight: 12,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.bgCard,
        borderRadius: 16,
        padding: 12,
        marginBottom: 10,
        gap: 12,
        borderWidth: 0.5,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
    },
    historyImage: {
        width: 48,
        height: 48,
        borderRadius: 12,
        resizeMode: 'cover',
    },
    historyContent: {
        flex: 1,
    },
    historyName: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    historyPlant: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    historyDate: {
        fontSize: 10,
        color: theme.colors.textMuted,
    },
    historyRight: {
        alignItems: 'flex-end',
    },
    historyConfidence: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    historyConfLabel: {
        fontSize: 10,
        color: theme.colors.textMuted,
    },
});
