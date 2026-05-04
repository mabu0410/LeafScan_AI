import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScanHistory } from '../../types';
import { theme } from '../../theme/theme';
import { HistoryItemCard } from './HistoryItemCard';

interface HistoryGroupProps {
  title: string;
  items: ScanHistory[];
  onPressItem: (scan: ScanHistory) => void;
}

export function HistoryGroup({ title, items, onPressItem }: HistoryGroupProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.itemsWrap}>
        {items.map((scan, index) => (
          <View key={scan.id} style={styles.itemSpacing}>
            <HistoryItemCard
              item={scan}
              index={index}
              onPress={() => onPressItem(scan)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.45,
  },
  itemsWrap: {
    gap: 0,
  },
  itemSpacing: {
    marginBottom: 9,
  },
});
