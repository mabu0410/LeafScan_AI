import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { RootStackParamList, ScanHistory } from '../types';
import { useHistoryStore } from '../stores/historyStore';
import { theme } from '../theme/theme';
import { HistoryHeader } from '../components/history/HistoryHeader';
import {
  HistoryFilterChips,
  HistoryFilterValue,
} from '../components/history/HistoryFilterChips';
import { HistoryStats } from '../components/history/HistoryStats';
import { HistoryGroup } from '../components/history/HistoryGroup';
import { EmptyHistoryState } from '../components/history/EmptyHistoryState';
import { SearchBar } from '../components/history/SearchBar';

interface HistorySection {
  id: 'today' | 'yesterday' | 'older';
  title: string;
  items: ScanHistory[];
}

function parseScanMillis(scan: ScanHistory): number {
  if (scan.scanDateISO) {
    const parsed = new Date(scan.scanDateISO);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getTime();
    }
  }

  const datePart = scan.date.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const timePart = scan.date.match(/\b(\d{1,2}):(\d{2})\b/);
  if (datePart) {
    const day = Number(datePart[1]);
    const month = Number(datePart[2]) - 1;
    const year = Number(datePart[3]);
    const hour = timePart ? Number(timePart[1]) : 0;
    const minute = timePart ? Number(timePart[2]) : 0;
    const parsed = new Date(year, month, day, hour, minute);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getTime();
    }
  }

  return 0;
}

function severityLabel(severity: ScanHistory['severity'], t: (key: string) => string): string {
  if (severity === 'healthy') return t('history.severity.healthy');
  if (severity === 'moderate') return t('history.severity.moderate');
  return t('history.severity.severe');
}

export default function HistoryScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<HistoryFilterValue>('all');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const scans = useHistoryStore((state) => state.scans);
  const loadHistory = useHistoryStore((state) => state.loadHistory);

  useEffect(() => {
    loadHistory().catch(() => undefined);
  }, [loadHistory]);

  const sortedScans = useMemo(
    () => [...scans].sort((a, b) => parseScanMillis(b) - parseScanMillis(a)),
    [scans]
  );

  const filteredScans = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return sortedScans.filter((scan) => {
      const severityMatched =
        activeFilter === 'all' ? true : scan.severity === activeFilter;
      if (!severityMatched) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const pool = [
        scan.plantName,
        scan.result,
        severityLabel(scan.severity, t),
      ]
        .join(' ')
        .toLowerCase();

      return pool.includes(keyword);
    });
  }, [activeFilter, searchQuery, sortedScans, t]);

  const groupedSections = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const buckets: HistorySection[] = [
      { id: 'today', title: t('history.sections.today'), items: [] },
      { id: 'yesterday', title: t('history.sections.yesterday'), items: [] },
      { id: 'older', title: t('history.sections.older'), items: [] },
    ];

    filteredScans.forEach((scan) => {
      const time = parseScanMillis(scan);
      if (!time) {
        buckets[2].items.push(scan);
        return;
      }

      const day = new Date(time);
      day.setHours(0, 0, 0, 0);

      if (day.getTime() === today.getTime()) {
        buckets[0].items.push(scan);
        return;
      }

      if (day.getTime() === yesterday.getTime()) {
        buckets[1].items.push(scan);
        return;
      }

      buckets[2].items.push(scan);
    });

    return buckets.filter((bucket) => bucket.items.length > 0);
  }, [filteredScans, t]);

  const monthScans = useMemo(() => {
    const now = new Date();
    return scans.filter((scan) => {
      const time = parseScanMillis(scan);
      if (!time) return false;
      const date = new Date(time);
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [scans]);

  const detectedDiseases = useMemo(() => {
    return new Set(
      scans
        .filter((scan) => scan.severity !== 'healthy')
        .map((scan) => scan.result)
    ).size;
  }, [scans]);

  const healthyRate = useMemo(() => {
    if (scans.length === 0) return 0;
    const healthyCount = scans.filter((scan) => scan.severity === 'healthy').length;
    return Math.round((healthyCount / scans.length) * 100);
  }, [scans]);

  const hasAnyHistory = scans.length > 0;
  const hasVisibleResults = groupedSections.length > 0;

  const toggleSearch = () => {
    setSearchVisible((prev) => {
      const next = !prev;
      if (!next) {
        setSearchQuery('');
      }
      return next;
    });
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MainTabs');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <FlatList
          data={hasVisibleResults ? groupedSections : []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HistoryGroup
              title={item.title}
              items={item.items}
              onPressItem={(scan) =>
                navigation.navigate('DiseaseDetail', {
                  diseaseId: scan.diseaseKey || scan.id,
                })
              }
            />
          )}
          ListHeaderComponent={
            <>
              <Animated.View entering={FadeInDown.duration(380)}>
                <HistoryHeader
                  totalScans={scans.length}
                  searchVisible={searchVisible}
                  onBack={handleBack}
                  onToggleSearch={toggleSearch}
                />
              </Animated.View>

              <SearchBar
                visible={searchVisible}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onClear={() => setSearchQuery('')}
              />

              <Animated.View entering={FadeInDown.delay(40).duration(380)}>
                <HistoryFilterChips
                  activeFilter={activeFilter}
                  onSelectFilter={setActiveFilter}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(80).duration(380)}>
                <HistoryStats
                  monthScans={monthScans}
                  detectedDiseases={detectedDiseases}
                  healthyRate={healthyRate}
                />
              </Animated.View>
            </>
          }
          ListEmptyComponent={
            hasAnyHistory ? (
              <View style={styles.noResultWrap}>
                <Text style={styles.noResultTitle}>{t('history.noResult.title')}</Text>
                <Text style={styles.noResultText}>{t('history.noResult.description')}</Text>
                <Pressable
                  onPress={() => {
                    setActiveFilter('all');
                    setSearchQuery('');
                  }}
                  style={styles.resetButton}
                >
                  <Text style={styles.resetButtonText}>{t('history.noResult.reset')}</Text>
                </Pressable>
              </View>
            ) : (
              <EmptyHistoryState onPressScan={() => navigation.navigate('Scan')} />
            )
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(112, insets.bottom + 98) },
            !hasVisibleResults && styles.emptyContentContainer,
          ]}
        />
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
  contentContainer: {
    paddingTop: 6,
  },
  emptyContentContainer: {
    flexGrow: 1,
  },
  noResultWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    marginTop: -20,
  },
  noResultTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 7,
  },
  noResultText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
  },
  resetButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: theme.colors.primaryPale,
  },
  resetButtonText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
