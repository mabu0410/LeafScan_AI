import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

interface ProfileInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  optional?: boolean;
}

export function ProfileInput({
  label,
  error,
  optional = false,
  ...textInputProps
}: ProfileInputProps) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.group}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {optional ? <Text style={styles.optionalText}>({t('common.optional')})</Text> : null}
      </View>
      <TextInput
        {...textInputProps}
        onFocus={(event) => {
          setFocused(true);
          textInputProps.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          textInputProps.onBlur?.(event);
        }}
        placeholderTextColor={theme.colors.textMuted}
        style={[
          styles.input,
          focused && styles.inputFocused,
          Boolean(error) && styles.inputError,
        ]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  optionalText: {
    marginLeft: 6,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.4,
    borderColor: '#E3DFD8',
    backgroundColor: theme.colors.white,
    paddingHorizontal: 14,
    fontSize: 14.5,
    color: theme.colors.textPrimary,
  },
  inputFocused: {
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 9,
    elevation: 2,
  },
  inputError: {
    borderColor: theme.colors.severe,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.severe,
    fontWeight: '600',
  },
});
