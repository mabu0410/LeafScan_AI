import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeTodayTip } from '../../types/home';
import { theme } from '../../theme/theme';

interface TipDetailSheetProps {
  visible: boolean;
  tip: HomeTodayTip | null;
  onClose: () => void;
}

export function TipDetailSheet({ visible, tip, onClose }: TipDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: 240 });
  }, [progress, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [360, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  return (
    <View pointerEvents={visible ? 'auto' : 'none'} style={StyleSheet.absoluteFillObject}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle, { paddingBottom: Math.max(18, insets.bottom + 12) }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{tip?.title || 'Mẹo chăm sóc'}</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={18} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaTag}>
            <Text style={styles.metaTagText}>{tip?.category || 'Chăm sóc cơ bản'}</Text>
          </View>
        </View>

        <Text style={styles.contentText}>{tip?.content || ''}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cây phù hợp</Text>
          <View style={styles.chipsWrap}>
            {(tip?.suitablePlants || []).map((plant) => (
              <View key={plant} style={styles.plantChip}>
                <Text style={styles.plantChipText}>{plant}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable onPress={onClose} style={({ pressed }) => [styles.doneButton, pressed && styles.doneButtonPressed]}>
          <Text style={styles.doneButtonText}>Đã hiểu</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: theme.colors.bgCard,
    paddingTop: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#E8E3DC',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D8D2CA',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E0DA',
    backgroundColor: '#F8F6F2',
  },
  metaRow: {
    marginBottom: 10,
  },
  metaTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E9F6EC',
  },
  metaTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  contentText: {
    fontSize: 14.5,
    lineHeight: 21,
    color: theme.colors.textSecondary,
    marginBottom: 14,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  plantChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F1F6EF',
    borderWidth: 1,
    borderColor: '#DCE8DA',
  },
  plantChipText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  doneButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  doneButtonPressed: {
    backgroundColor: '#4E7A4D',
  },
  doneButtonText: {
    color: theme.colors.white,
    fontSize: 14.5,
    fontWeight: '700',
  },
});
