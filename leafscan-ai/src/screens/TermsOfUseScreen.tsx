import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';

export default function TermsOfUseScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Điều khoản sử dụng</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Cập nhật lần cuối: Tháng 5, 2025</Text>

        <Text style={styles.sectionTitle}>1. Chấp nhận điều khoản</Text>
        <Text style={styles.body}>
          Bằng việc sử dụng ứng dụng Leaf_AI, bạn đồng ý tuân thủ các điều khoản dưới đây.
          Nếu không đồng ý, vui lòng ngừng sử dụng ứng dụng.
        </Text>

        <Text style={styles.sectionTitle}>2. Mục đích sử dụng</Text>
        <Text style={styles.body}>
          Leaf_AI là công cụ hỗ trợ chẩn đoán bệnh cây trồng bằng AI.
          Kết quả chẩn đoán chỉ mang tính tham khảo và không thay thế ý kiến chuyên gia nông nghiệp.
        </Text>

        <Text style={styles.sectionTitle}>3. Giới hạn trách nhiệm</Text>
        <Text style={styles.body}>
          • Leaf_AI không chịu trách nhiệm cho thiệt hại phát sinh từ việc áp dụng
          kết quả chẩn đoán mà không tham khảo chuyên gia{'\n'}
          • Độ chính xác phụ thuộc vào chất lượng ảnh và điều kiện chụp{'\n'}
          • Ứng dụng chỉ hỗ trợ các loại cây trong bộ dữ liệu PlantVillage (38 class)
        </Text>

        <Text style={styles.sectionTitle}>4. Tài khoản người dùng</Text>
        <Text style={styles.body}>
          • Bạn chịu trách nhiệm bảo mật thông tin đăng nhập{'\n'}
          • Không sử dụng tài khoản cho mục đích vi phạm pháp luật{'\n'}
          • Leaf_AI có quyền khóa tài khoản vi phạm điều khoản
        </Text>

        <Text style={styles.sectionTitle}>5. Quyền sở hữu trí tuệ</Text>
        <Text style={styles.body}>
          Mô hình AI, giao diện, mã nguồn và nội dung của Leaf_AI thuộc quyền sở hữu
          của nhóm phát triển. Bạn không được sao chép, phân phối hoặc sử dụng cho mục đích thương mại
          mà không có sự đồng ý bằng văn bản.
        </Text>

        <Text style={styles.sectionTitle}>6. Thay đổi điều khoản</Text>
        <Text style={styles.body}>
          Leaf_AI có thể cập nhật điều khoản bất cứ lúc nào.
          Việc tiếp tục sử dụng sau khi cập nhật đồng nghĩa với việc bạn chấp nhận điều khoản mới.
        </Text>

        <Text style={styles.sectionTitle}>7. Liên hệ</Text>
        <Text style={styles.body}>
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
