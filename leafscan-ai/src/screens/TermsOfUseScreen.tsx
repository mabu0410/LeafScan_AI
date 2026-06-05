import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme/theme';

const TERMS_SECTIONS = ['acceptance', 'purpose', 'liability', 'account', 'intellectualProperty', 'changes', 'contact'];

export default function TermsOfUseScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('legal.terms.title')}</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>{t('legal.updated')}</Text>

        {TERMS_SECTIONS.map((section) => (
          <View key={section}>
            <Text style={styles.sectionTitle}>{t(`legal.terms.sections.${section}.title`)}</Text>
            <Text style={styles.body}>{t(`legal.terms.sections.${section}.body`)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ECE7DF',
  },
  backButton: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.bgCard, borderWidth: 1, borderColor: '#E4DFD8',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  content: { padding: 20, paddingBottom: 60 },
  updated: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginTop: 20, marginBottom: 8 },
  body: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 22 },
});
