import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme } from '../../theme/theme';

interface FormInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  optionalLabel?: string;
  error?: string;
  multiline?: boolean;
}

export function FormInput({
  label,
  optionalLabel,
  error,
  multiline = false,
  ...inputProps
}: FormInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.group}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {optionalLabel ? <Text style={styles.optionalLabel}>{optionalLabel}</Text> : null}
      </View>

      <TextInput
        {...inputProps}
        multiline={multiline}
        onFocus={(event) => {
          setFocused(true);
          inputProps.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          inputProps.onBlur?.(event);
        }}
        placeholderTextColor={theme.colors.textMuted}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          focused && styles.focusedInput,
          error && styles.errorInput,
        ]}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 16,
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
  optionalLabel: {
    marginLeft: 6,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.4,
    borderColor: '#E2DFD9',
    backgroundColor: theme.colors.bgCard,
    paddingHorizontal: 14,
    fontSize: 14.5,
    color: theme.colors.textPrimary,
  },
  multilineInput: {
    minHeight: 108,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  focusedInput: {
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 9,
    elevation: 2,
  },
  errorInput: {
    borderColor: theme.colors.severe,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.severe,
    fontWeight: '600',
  },
});
