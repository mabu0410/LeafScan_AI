import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

interface SearchBarProps {
  visible: boolean;
  value: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
}

export function SearchBar({ visible, value, onChangeText, onClear }: SearchBarProps) {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutUp.duration(180)} style={styles.wrap}>
      <View style={styles.container}>
        <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          placeholder={t('history.searchPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {value ? (
          <Pressable onPress={onClear} hitSlop={8} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  container: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4E0DA',
    backgroundColor: theme.colors.bgCard,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    paddingVertical: 10,
  },
  clearButton: {
    padding: 2,
  },
});
