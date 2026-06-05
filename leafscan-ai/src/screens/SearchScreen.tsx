import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { DiseaseLibraryItem, RootStackParamList } from '../types';
import { usePlantsStore } from '../stores/plantsStore';
import { listDiseasesApi } from '../api/diseases';
import { theme } from '../theme/theme';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'Search'>;
};

export default function SearchScreen({ navigation }: Props) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState(['tomato', 'leafSpot', 'fungalDisease']);
    const [matchedDiseases, setMatchedDiseases] = useState<DiseaseLibraryItem[]>([]);
    const [loadingDiseases, setLoadingDiseases] = useState(false);
    const plants = usePlantsStore(state => state.plants);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        let cancelled = false;
        const currentQuery = debouncedQuery.trim();

        if (!currentQuery) {
            setMatchedDiseases([]);
            setLoadingDiseases(false);
            return () => {
                cancelled = true;
            };
        }

        setLoadingDiseases(true);
        listDiseasesApi({ query: currentQuery, limit: 40 })
            .then((results) => {
                if (!cancelled) {
                    setMatchedDiseases(results);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setMatchedDiseases([]);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingDiseases(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [debouncedQuery]);

    const removeRecent = (item: string) => {
        setRecentSearches(prev => prev.filter(i => i !== item));
    };

    const matchedPlants = debouncedQuery
        ? plants.filter(p => p.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
        : [];

    const results = useMemo(
        () => [
            ...matchedPlants.map(p => ({ ...p, type: 'plant' as const })),
            ...matchedDiseases.map(d => ({ ...d, type: 'disease' as const })),
        ],
        [matchedDiseases, matchedPlants]
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={18} color={theme.colors.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        autoFocus
                        value={query}
                        onChangeText={setQuery}
                        placeholder={t('search.placeholder')}
                        placeholderTextColor={theme.colors.textMuted}
                    />
                    {query ? (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {/* Content */}
            {!debouncedQuery ? (
                <View style={styles.recentSection}>
                    <View style={styles.recentHeader}>
                        <Text style={styles.recentTitle}>{t('search.recentTitle')}</Text>
                        {recentSearches.length > 0 && (
                            <TouchableOpacity onPress={() => setRecentSearches([])}>
                                <Text style={styles.clearButton}>{t('common.clearAll')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={styles.chipGrid}>
                        {recentSearches.map(item => (
                            <View key={item} style={styles.recentChip}>
                                <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
                                <TouchableOpacity onPress={() => setQuery(t(`search.defaultRecent.${item}`))}>
                                    <Text style={styles.recentChipText}>{t(`search.defaultRecent.${item}`)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => removeRecent(item)}>
                                    <Ionicons name="close" size={14} color={theme.colors.textMuted} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>
            ) : loadingDiseases ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>{t('search.searching')}</Text>
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={item => `${item.type}-${item.id}`}
                    contentContainerStyle={styles.resultsList}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="leaf" size={48} color={theme.colors.textMuted} style={{ opacity: 0.5 }} />
                            <Text style={styles.emptyTitle}>{t('search.emptyTitle')}</Text>
                            <Text style={styles.emptyText}>{t('search.emptyText')}</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => item.type === 'plant'
                                ? navigation.navigate('PlantDetail', { plantId: item.id })
                                : navigation.navigate('DiseaseDetail', { diseaseId: item.id })
                            }
                            style={styles.resultCard}
                        >
                            <View style={[styles.resultIcon, item.type === 'disease' && { backgroundColor: theme.colors.severeBg }]}>
                                <Ionicons
                                    name={item.type === 'plant' ? 'leaf' : 'warning'}
                                    size={20}
                                    color={item.type === 'plant' ? theme.colors.primary : theme.colors.severe}
                                />
                            </View>
                            <View>
                                <Text style={styles.resultName}>{item.name}</Text>
                                <Text style={styles.resultSub}>
                                    {item.type === 'plant' ? (item as any).category : (item as any).plant}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16,
        backgroundColor: theme.colors.bgCard, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    backBtn: { padding: 4 },
    searchBox: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: theme.colors.bgMuted, borderRadius: 20, height: 40, paddingHorizontal: 12,
    },
    searchInput: { flex: 1, fontSize: 15, color: theme.colors.textPrimary },
    recentSection: { padding: 20 },
    recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    recentTitle: { fontSize: 14, fontWeight: '500', color: theme.colors.textSecondary },
    clearButton: { fontSize: 12, color: theme.colors.textMuted },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    recentChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: theme.colors.border,
        borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    },
    recentChipText: { fontSize: 14, color: theme.colors.textPrimary },
    resultsList: { padding: 20, gap: 10 },
    resultCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: theme.colors.bgCard, borderRadius: 16, padding: 12,
        borderWidth: 0.5, borderColor: theme.colors.border,
    },
    resultIcon: {
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: theme.colors.primaryPale, justifyContent: 'center', alignItems: 'center',
    },
    resultName: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
    resultSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
    emptyContainer: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginTop: 16 },
    emptyText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    loadingText: { fontSize: 13, color: theme.colors.textSecondary },
});
