import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

interface Props {
  visible: boolean;
  title: string;
  defaultName?: string;
  defaultPhone?: string;
  defaultEmail?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (input: { name: string; phone?: string; email?: string; message: string }) => Promise<void>;
}

export function MarketplaceInquiryModal({
  visible,
  title,
  defaultName,
  defaultPhone,
  defaultEmail,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState(defaultName || '');
  const [phone, setPhone] = useState(defaultPhone || '');
  const [email, setEmail] = useState(defaultEmail || '');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setName(defaultName || '');
      setPhone(defaultPhone || '');
      setEmail(defaultEmail || '');
      setMessage('');
    }
  }, [defaultEmail, defaultName, defaultPhone, visible]);

  const submit = async () => {
    if (!name.trim() || !message.trim()) return;
    await onSubmit({
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      message: message.trim(),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <View>
              <Text style={styles.title}>Yêu cầu tư vấn</Text>
              <Text style={styles.subtitle}>{title}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={21} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          <TextInput value={name} onChangeText={setName} placeholder="Tên người liên hệ" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
          <TextInput value={phone} onChangeText={setPhone} placeholder="Số điện thoại" keyboardType="phone-pad" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
          <TextInput value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Nội dung cần tư vấn"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.textArea]}
          />

          <Pressable disabled={loading || !name.trim() || !message.trim()} onPress={submit} style={[styles.submitButton, (loading || !name.trim() || !message.trim()) && styles.disabledButton]}>
            {loading ? <ActivityIndicator color={theme.colors.white} /> : <Ionicons name="send-outline" size={18} color={theme.colors.white} />}
            <Text style={styles.submitText}>{loading ? 'Đang gửi...' : 'Gửi yêu cầu'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.36)' },
  sheet: { padding: 20, paddingBottom: 30, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: theme.colors.bgCard, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 },
  title: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '900' },
  subtitle: { marginTop: 4, color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bgMuted },
  input: { minHeight: 46, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, color: theme.colors.textPrimary, backgroundColor: theme.colors.bg },
  textArea: { height: 104, paddingTop: 12 },
  submitButton: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: theme.colors.primary, marginTop: 4 },
  disabledButton: { opacity: 0.55 },
  submitText: { color: theme.colors.white, fontSize: 15, fontWeight: '900' },
});
