import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, ScanHistory } from '../types';
import { useHistoryStore } from '../stores/historyStore';
import { theme } from '../theme/theme';

const FILTERS = ['Tất cả', 'Khỏe mạnh', 'Cảnh báo', 'Nguy hiểm', 'Tuần này', 'Tháng này'];

export default function HistoryScreen() {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const [activeFilter, setActiveFilter] = useState('Tất cả');
    const history = useHistoryStore(state => state.scans);
    const loadHistory = useHistoryStore(state => state.loadHistory);

    useEffect(() => {
        loadHistory().catch(() => undefined);
    }, [loadHistory]);

    const filteredHistory = useMemo(() => {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(now.getDate() - 6);

        return history.filter(item => {
            if (activeFilter === 'Khỏe mạnh') return item.severity === 'healthy';
            if (activeFilter === 'Cảnh báo') return item.severity === 'moderate';
            if (activeFilter === 'Nguy hiểm') return item.severity === 'severe';

            const rawDate = item.scanDateISO ? new Date(item.scanDateISO) : null;
            if (!rawDate || Number.isNaN(rawDate.getTime())) {
                return activeFilter === 'Tất cả';
            }

            if (activeFilter === 'Tuần này') {
                return rawDate >= weekStart && rawDate <= now;
            }

            if (activeFilter === 'Tháng này') {
                return rawDate.getMonth() === now.getMonth() && rawDate.getFullYear() === now.getFullYear();
            }

            return true;
        });
    }, [activeFilter, history]);

    const healthyCount = history.filter(item => item.severity === 'healthy').length;
    const healthyRate = history.length ? Math.round((healthyCount / history.length) * 100) : 0;

    const renderItem = ({ item }: { item: ScanHistory }) => (
        <TouchableOpacity
            onPress={() => navigation.navigate('DiseaseDetail', { diseaseId: item.diseaseKey || item.id })}
            style={styles.card}
            activeOpacity={0.85}
        >
            <Image source={{ uri: item.image }} style={styles.cardImage} />
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.result}</Text>
                <Text style={styles.cardPlant} numberOfLines={1}>{item.plantName}</Text>
                    <View style={styles.cardMeta}>
                    <Text style={styles.cardDate}>{item.date.split('·')[0].trim()}</Text>
                    <View style={[styles.dot, {
                        backgroundColor: item.severity === 'healthy' ? theme.colors.healthy :
                            item.severity === 'moderate' ? theme.colors.moderate : theme.colors.severe
                    }]} />
                </View>
            </View>
            <View style={styles.cardRight}>
                <Text style={styles.confidence}>{item.confidence}%</Text>
                <Text style={styles.confidenceLabel}>Độ tin cậy</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.title}>Lịch sử quét</Text>
                        <Text style={styles.subtitle}>{history.length} lần quét</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Search')}
                        style={styles.searchButton}
                    >
                        <Ionicons name="search" size={20} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                    {FILTERS.map(filter => (
                        <TouchableOpacity
                            key={filter}
                            onPress={() => setActiveFilter(filter)}
                            style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                        >
                            <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                                {filter}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Stats */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow} contentContainerStyle={styles.statsContent}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Tháng này</Text>
                    <Text style={styles.statValue}>{history.length} lần</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Phát hiện</Text>
                    <Text style={styles.statValue}>{new Set(history.map(h => h.result)).size} bệnh</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Tỉ lệ khỏe</Text>
                    <Text style={[styles.statValue, { color: theme.colors.healthy }]}>{healthyRate}%</Text>
                </View>
            </ScrollView>

            {/* List */}
            {filteredHistory.length > 0 ? (
                <FlatList
                    data={filteredHistory}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="leaf" size={40} color={theme.colors.textMuted} style={{ opacity: 0.5 }} />
                    <Text style={styles.emptyTitle}>Chưa có lần quét nào</Text>
                    <Text style={styles.emptyText}>Hãy thử quét lá cây đầu tiên của bạn!</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Scan')} style={styles.scanButton}>
                        <Text style={styles.scanButtonText}>Quét ngay</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bg,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '500',
        color: theme.colors.textPrimary,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    searchButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.bgCard,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    filterRow: {
        marginBottom: 4,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.bgMuted,
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: theme.colors.primary,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    filterTextActive: {
        color: theme.colors.white,
    },
    statsRow: {
        marginTop: 16,
    },
    statsContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    statCard: {
        backgroundColor: theme.colors.bgCard,
        borderRadius: 16,
        padding: 16,
        minWidth: 140,
        borderWidth: 0.5,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    card: {
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
    cardImage: {
        width: 56,
        height: 56,
        borderRadius: 12,
        resizeMode: 'cover',
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    cardPlant: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 6,
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardDate: {
        fontSize: 10,
        color: theme.colors.textMuted,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    cardRight: {
        alignItems: 'flex-end',
    },
    confidence: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    confidenceLabel: {
        fontSize: 10,
        color: theme.colors.textMuted,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    scanButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        ...theme.shadows.scanButton,
    },
    scanButtonText: {
        color: theme.colors.white,
        fontWeight: '600',
    },
});
