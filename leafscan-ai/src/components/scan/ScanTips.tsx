import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScanState } from './types';

interface ScanTipsProps {
  state: ScanState;
  bottomInset: number;
}

type TipItem = {
  id: 'stable' | 'light' | 'fill';
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
};

const TIPS: TipItem[] = [
  { id: 'stable', icon: 'hand-left-outline', text: 'Giữ máy ổn định' },
  { id: 'light', icon: 'sunny-outline', text: 'Chụp đủ ánh sáng' },
  { id: 'fill', icon: 'expand-outline', text: 'Lá chiếm phần lớn khung' },
];

function highlightedTip(state: ScanState): TipItem['id'] | null {
  if (state === 'too_dark') return 'light';
  if (state === 'out_of_frame' || state === 'no_leaf_detected') return 'fill';
  if (state === 'aligning') return 'stable';
  return null;
}

export function ScanTips({ state, bottomInset }: ScanTipsProps) {
  const { height } = useWindowDimensions();
  const compact = height < 700;
  const activeId = highlightedTip(state);

  return (
    <View style={[styles.container, { bottom: bottomInset + (compact ? 112 : 140) }]}>
      {TIPS.map(tip => {
        const active = tip.id === activeId;
        return (
          <View key={tip.id} style={[styles.tipChip, active && styles.tipChipActive]}>
            <Ionicons
              name={tip.icon}
              size={13}
              color={active ? 'rgba(224, 255, 237, 0.98)' : 'rgba(209, 235, 220, 0.9)'}
            />
            <Text style={[styles.tipText, active && styles.tipTextActive]}>{tip.text}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    zIndex: 15,
  },
  tipChip: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 35, 26, 0.64)',
    borderWidth: 1,
    borderColor: 'rgba(188, 235, 208, 0.25)',
  },
  tipChipActive: {
    backgroundColor: 'rgba(41, 84, 60, 0.78)',
    borderColor: 'rgba(163, 255, 202, 0.52)',
  },
  tipText: {
    color: 'rgba(223, 244, 233, 0.93)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  tipTextActive: {
    color: 'rgba(235, 255, 244, 0.98)',
  },
});
