import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Plant } from '../types';
import { PlantCard } from '../components/PlantCard';
import { usePlantsStore } from '../stores/plantsStore';
import { theme } from '../theme/theme';

export default function MyGardenScreen() {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const [activeCategory, setActiveCategory] = useState('all');
    const plants = usePlantsStore(state => state.plants);
    const getFilteredPlants = usePlantsStore(state => state.getFilteredPlants);
    const loadPlants = usePlantsStore(state => state.loadPlants);

    useEffect(() => {
        loadPlants().catch(() => undefined);
    }, [loadPlants]);

    const categories = useMemo(() => {
        const counts = plants.reduce<Record<string, number>>((acc, plant) => {
            const key = plant.category || 'Khác';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        return [
            { id: 'all', label: 'Tất cả', count: plants.length },
            ...Object.entries(counts).map(([label, count]) => ({ id: label, label, count })),
        ];
    }, [plants]);

    const filteredPlants = getFilteredPlants({
        category: activeCategory,
        status: 'all',
        sortBy: 'recent',
        searchQuery: '',
    });

    const renderPlant = ({ item, index }: { item: Plant; index: number }) => (
        <View style={styles.plantItem}>
            <PlantCard
                plant={item}
                onPress={() => navigation.navigate('PlantDetail', { plantId: item.id })}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.title}>Vườn của tôi</Text>
                        <Text style={styles.subtitle}>{filteredPlants.length} loài cây</Text>
                    </View>
                    <View style={styles.headerButtons}>
                        <TouchableOpacity style={styles.iconButton}>
                            <Ionicons name="filter" size={20} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton}>
                            <Ionicons name="swap-vertical" size={20} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Categories */}
                <FlatList
                    data={categories}
                    keyExtractor={item => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryList}
                    renderItem={({ item: cat }) => (
                        <TouchableOpacity
                            onPress={() => setActiveCategory(cat.id)}
                            style={[styles.categoryChip, activeCategory === cat.id && styles.categoryChipActive]}
                        >
                            <Text style={[styles.categoryText, activeCategory === cat.id && styles.categoryTextActive]}>
                                {cat.label} {cat.id === 'all' ? '' : cat.count}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Grid */}
            {filteredPlants.length > 0 ? (
                <FlatList
                    data={filteredPlants}
                    keyExtractor={item => item.id}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    contentContainerStyle={styles.gridContent}
                    renderItem={renderPlant}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="leaf" size={40} color={theme.colors.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>Không có cây nào</Text>
                    <Text style={styles.emptyText}>Không tìm thấy cây nào trong danh mục này.</Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('AddPlant')}
                        style={styles.addButton}
                    >
                        <Text style={styles.addButtonText}>Thêm cây mới</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* FAB */}
            <TouchableOpacity
                onPress={() => navigation.navigate('AddPlant')}
                style={styles.fab}
                activeOpacity={0.85}
            >
                <Ionicons name="add" size={28} color={theme.colors.white} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bg,
    },
    header: {
        backgroundColor: theme.colors.bg,
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
    headerButtons: {
        flexDirection: 'row',
        gap: 8,
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
    categoryList: {
        marginBottom: 4,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.bgMuted,
        marginRight: 8,
    },
    categoryChipActive: {
        backgroundColor: theme.colors.primary,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    categoryTextActive: {
        color: theme.colors.white,
    },
    gridContent: {
        padding: 20,
        paddingBottom: 100,
    },
    row: {
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 16,
    },
    plantItem: {
        flex: 1,
        maxWidth: '48%',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: theme.colors.bgMuted,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        opacity: 0.5,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    addButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        ...theme.shadows.scanButton,
    },
    addButtonText: {
        color: theme.colors.white,
        fontWeight: '600',
        fontSize: 15,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.scanButton,
    },
});
