import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Chính sách bảo mật</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Cập nhật lần cuối: Tháng 5, 2025</Text>

        <Text style={styles.sectionTitle}>1. Thu thập dữ liệu</Text>
        <Text style={styles.body}>
          Leaf_AI thu thập các thông tin sau khi bạn sử dụng ứng dụng:{'\n'}
          • Email và tên khi đăng ký tài khoản{'\n'}
          • Ảnh lá cây bạn chụp để chẩn đoán bệnh{'\n'}
          • Lịch sử quét và kết quả chẩn đoán{'\n'}
          • Thông tin cây trồng bạn thêm vào vườn
        </Text>

        <Text style={styles.sectionTitle}>2. Sử dụng dữ liệu</Text>
        <Text style={styles.body}>
          Dữ liệu của bạn được sử dụng để:{'\n'}
          • Cung cấp dịch vụ chẩn đoán bệnh cây{'\n'}
          • Cải thiện độ chính xác của mô hình AI{'\n'}
          • Gửi thông báo và mẹo chăm sóc cây{'\n'}
          • Hỗ trợ kỹ thuật khi bạn liên hệ
        </Text>

        <Text style={styles.sectionTitle}>3. Bảo mật</Text>
        <Text style={styles.body}>
          • Mật khẩu được mã hóa bằng bcrypt, không lưu dạng plaintext{'\n'}
          • Kết nối API sử dụng HTTPS{'\n'}
          • Ảnh quét được lưu trên server riêng, không chia sẻ với bên thứ ba{'\n'}
          • Bạn có thể xóa tài khoản và toàn bộ dữ liệu bất cứ lúc nào
        </Text>

        <Text style={styles.sectionTitle}>4. Chia sẻ dữ liệu</Text>
        <Text style={styles.body}>
          Leaf_AI không bán hoặc chia sẻ dữ liệu cá nhân của bạn với bên thứ ba,
          ngoại trừ:{'\n'}
          • Google Gemini API (chỉ nội dung câu hỏi chat, không gửi ảnh){'\n'}
          • Khi có yêu cầu pháp lý bắt buộc
        </Text>

        <Text style={styles.sectionTitle}>5. Liên hệ</Text>
        <Text style={styles.body}>
          Nếu có thắc mắc về chính sách bảo mật, vui lòng liên hệ:{'\n'}
          Email: leafscan.ai.support@gmail.com
        </Text>
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
