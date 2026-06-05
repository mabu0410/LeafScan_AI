import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { RootStackParamList, Plant } from '../types';
import { usePlantsStore } from '../stores/plantsStore';
import { theme } from '../theme/theme';
import { GardenHeader } from '../components/garden/GardenHeader';
import { GardenFilterChips, GardenFilterChipItem } from '../components/garden/GardenFilterChips';
import { EmptyGardenState } from '../components/garden/EmptyGardenState';
import { PlantCard as GardenPlantCard } from '../components/garden/PlantCard';
import { GardenSummary } from '../components/garden/GardenSummary';
import { FloatingAddButton } from '../components/garden/FloatingAddButton';

type GardenSortMode = 'recent' | 'name' | 'health';
type GardenFilterId = 'all' | 'attention' | 'Rau củ' | 'Cây ăn quả' | 'Ngũ cốc' | 'Hoa cảnh';

const ENABLE_GARDEN_MOCK_PREVIEW = false;

const GARDEN_MOCK_PLANTS: Plant[] = [
  {
    id: 'mock-1',
    name: 'Cà chua bi',
    latinName: 'Solanum lycopersicum',
    category: 'Rau củ',
    image: '',
    thumbnail: '',
    healthScore: 83,
    lastScanned: '2 giờ trước',
    location: 'Luống A',
    daysTracked: 12,
    totalScans: 9,
    status: 'healthy',
    notes: '',
  },
  {
    id: 'mock-2',
    name: 'Cam sành',
    latinName: 'Citrus nobilis',
    category: 'Cây ăn quả',
    image: '',
    thumbnail: '',
    healthScore: 46,
    lastScanned: 'Hôm qua',
    location: 'Góc vườn phía Tây',
    daysTracked: 29,
    totalScans: 14,
    status: 'warning',
    notes: '',
  },
];

export default function MyGardenScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<GardenFilterId>('all');
  const [sortMode, setSortMode] = useState<GardenSortMode>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const plants = usePlantsStore((state) => state.plants);
  const loadPlants = usePlantsStore((state) => state.loadPlants);

  const filterChips = useMemo<GardenFilterChipItem[]>(
    () => [
      { id: 'all', label: t('garden.filters.all') },
      { id: 'Rau củ', label: t('garden.filters.vegetables') },
      { id: 'Cây ăn quả', label: t('garden.filters.fruitTrees') },
      { id: 'Ngũ cốc', label: t('garden.filters.grains') },
      { id: 'Hoa cảnh', label: t('garden.filters.ornamentals') },
      { id: 'attention', label: t('garden.filters.attention') },
    ],
    [t]
  );

  const sortLabel = useMemo<Record<GardenSortMode, string>>(
    () => ({
      recent: t('garden.sort.recent'),
      name: t('garden.sort.name'),
      health: t('garden.sort.health'),
    }),
    [t]
  );

  useEffect(() => {
    loadPlants().catch(() => undefined);
  }, [loadPlants]);

  const sourcePlants = useMemo(() => {
    if (ENABLE_GARDEN_MOCK_PREVIEW && plants.length === 0) {
      return GARDEN_MOCK_PLANTS;
    }
    return plants;
  }, [plants]);

  const totalPlants = sourcePlants.length;
  const healthyPlants = sourcePlants.filter((plant) => plant.status === 'healthy').length;
  const attentionPlants = sourcePlants.filter(
    (plant) => plant.status === 'warning' || plant.status === 'critical'
  ).length;

  const filteredPlants = useMemo(() => {
    let result = [...sourcePlants];
    const keyword = searchQuery.trim().toLowerCase();

    if (activeFilter === 'attention') {
      result = result.filter((plant) => plant.status === 'warning' || plant.status === 'critical');
    } else if (activeFilter !== 'all') {
      result = result.filter((plant) => plant.category === activeFilter);
    }

    if (keyword) {
      result = result.filter((plant) => {
        const name = plant.name.toLowerCase();
        const category = (plant.category || '').toLowerCase();
        const location = (plant.location || '').toLowerCase();
        return name.includes(keyword) || category.includes(keyword) || location.includes(keyword);
      });
    }

    switch (sortMode) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'health':
        result.sort((a, b) => b.healthScore - a.healthScore);
        break;
      case 'recent':
      default:
        result.sort((a, b) => b.totalScans - a.totalScans);
        break;
    }

    return result;
  }, [activeFilter, searchQuery, sortMode, sourcePlants]);

  const subtitle =
    totalPlants === 0
      ? t('garden.emptySubtitle')
      : t('garden.trackingCount', { count: totalPlants });

  const cycleSortMode = () => {
    setSortMode((prev) => (prev === 'recent' ? 'name' : prev === 'name' ? 'health' : 'recent'));
  };

  const handlePressFilter = () => {
    Alert.alert(t('garden.activeFilterTitle'), filterChips.find((chip) => chip.id === activeFilter)?.label || t('garden.filters.all'));
  };

  const renderPlantItem = ({ item }: { item: Plant }) => (
    <View style={styles.plantRow}>
      <GardenPlantCard
        plant={item}
        onPress={() => navigation.navigate('PlantDetail', { plantId: item.id })}
      />
    </View>
  );

  const isTrulyEmpty = totalPlants === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Animated.View entering={FadeInDown.duration(420)} style={styles.headerTopSpace}>
          <GardenHeader
            title={t('garden.title')}
            subtitle={subtitle}
            searchQuery={searchQuery}
            onChangeSearch={setSearchQuery}
            onPressFilter={handlePressFilter}
            onPressSort={cycleSortMode}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(70).duration(420)}>
          <GardenFilterChips
            chips={filterChips}
            activeChipId={activeFilter}
            onSelectChip={(chipId) => setActiveFilter(chipId as GardenFilterId)}
          />
        </Animated.View>

        {!isTrulyEmpty ? (
          <Animated.View entering={FadeInDown.delay(110).duration(420)}>
            <GardenSummary
              totalPlants={totalPlants}
              healthyPlants={healthyPlants}
              attentionPlants={attentionPlants}
            />
          </Animated.View>
        ) : null}

        {!isTrulyEmpty ? (
          <View style={styles.sortHintWrap}>
            <Text style={styles.sortHint}>{t('garden.sortHint', { label: sortLabel[sortMode] })}</Text>
          </View>
        ) : null}

        {isTrulyEmpty ? (
          <EmptyGardenState onAddFirstPlant={() => navigation.navigate('AddPlant')} />
        ) : filteredPlants.length === 0 ? (
          <View style={styles.filteredEmpty}>
            <Text style={styles.filteredEmptyTitle}>{t('garden.noFilteredTitle')}</Text>
            <Text style={styles.filteredEmptyText}>{t('garden.noFilteredText')}</Text>
            <Pressable onPress={() => setSearchQuery('')} style={styles.filteredEmptyButton}>
              <Text style={styles.filteredEmptyButtonText}>{t('garden.clearSearch')}</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filteredPlants}
            keyExtractor={(item) => item.id}
            renderItem={renderPlantItem}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: Math.max(110, insets.bottom + 100),
            }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {!isTrulyEmpty ? (
          <FloatingAddButton
            onPress={() => navigation.navigate('AddPlant')}
            bottomOffset={Math.max(insets.bottom + 88, 112)}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  headerTopSpace: {
    paddingTop: 10,
  },
  sortHintWrap: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sortHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  plantRow: {
    marginBottom: 10,
  },
  filteredEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -24,
  },
  filteredEmptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  filteredEmptyText: {
    fontSize: 13.5,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  filteredEmptyButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: theme.colors.primaryPale,
  },
  filteredEmptyButtonText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});
