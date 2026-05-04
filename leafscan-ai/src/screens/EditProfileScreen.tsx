import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../stores/authStore';
import { updateCurrentUserApi, UpdateUserProfilePayload } from '../api/users';
import { theme } from '../theme/theme';
import { ProfileAvatarPicker } from '../components/edit-profile/ProfileAvatarPicker';
import { ProfileInput } from '../components/edit-profile/ProfileInput';
import { ReadOnlyInfoCard } from '../components/edit-profile/ReadOnlyInfoCard';
import { SaveButton } from '../components/edit-profile/SaveButton';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'EditProfile'>;
};

type EditProfileErrors = {
  name?: string;
  email?: string;
  phone?: string;
};

const MOCK_USER_DATA = {
  id: 2,
  name: 'Vũ Mạnh Bảo',
  email: 'vumanhbao0411@gmail.com',
  phone: '',
  avatar: null,
  created_at: '2026-05-04T12:19:42.813+07:00',
};

function formatJoinedDate(raw?: string) {
  if (!raw) return 'Chưa có dữ liệu';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string) {
  if (!phone.trim()) return true;
  const normalized = phone.replace(/[\s.-]/g, '');
  return /^\+?[0-9]{8,15}$/.test(normalized);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function EditProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUserProfile = useAuthStore((state) => state.setUserProfile);

  const safeUser = useMemo(() => {
    if (user) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        avatar: user.avatar || null,
        createdAt: user.createdAt || MOCK_USER_DATA.created_at,
      };
    }

    return {
      id: String(MOCK_USER_DATA.id),
      name: MOCK_USER_DATA.name,
      email: MOCK_USER_DATA.email,
      phone: MOCK_USER_DATA.phone,
      avatar: MOCK_USER_DATA.avatar,
      createdAt: MOCK_USER_DATA.created_at,
    };
  }, [user]);

  const [name, setName] = useState(safeUser.name);
  const [email, setEmail] = useState(safeUser.email);
  const [phone, setPhone] = useState(safeUser.phone);
  const [avatar, setAvatar] = useState<string | null>(safeUser.avatar);
  const [errors, setErrors] = useState<EditProfileErrors>({});
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setName(safeUser.name);
    setEmail(safeUser.email);
    setPhone(safeUser.phone);
    setAvatar(safeUser.avatar);
  }, [safeUser]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const isValid = useMemo(() => {
    return Boolean(name.trim()) && validateEmail(email.trim()) && validatePhone(phone);
  }, [email, name, phone]);

  const clearError = (field: keyof EditProfileErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const runValidation = () => {
    const nextErrors: EditProfileErrors = {};

    if (!name.trim()) {
      nextErrors.name = 'Họ tên không được bỏ trống';
    }

    if (!validateEmail(email.trim())) {
      nextErrors.email = 'Email không đúng định dạng';
    }

    if (!validatePhone(phone)) {
      nextErrors.phone = 'Số điện thoại không hợp lệ';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChangeAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Chưa có quyền thư viện', 'Vui lòng cấp quyền truy cập ảnh để đổi avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.92,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setAvatar(result.assets[0].uri);
    }
  };

  const mockUpdateProfile = async (payload: UpdateUserProfilePayload) => {
    await sleep(800);
    return {
      id: safeUser.id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone || undefined,
      avatar: payload.avatar || undefined,
      createdAt: safeUser.createdAt,
    };
  };

  const handleSave = async () => {
    if (loading) return;
    if (!runValidation()) return;

    const payload: UpdateUserProfilePayload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() ? phone.trim() : null,
      avatar: avatar || null,
    };

    setLoading(true);

    try {
      let updatedUser;
      if (accessToken) {
        try {
          updatedUser = await updateCurrentUserApi(accessToken, payload);
        } catch {
          updatedUser = await mockUpdateProfile(payload);
        }
      } else {
        updatedUser = await mockUpdateProfile(payload);
      }

      setUserProfile({
        id: String(updatedUser.id || safeUser.id),
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone || undefined,
        avatar: updatedUser.avatar || undefined,
        createdAt: updatedUser.createdAt || safeUser.createdAt,
      });

      setShowToast(true);
      toastTimerRef.current = setTimeout(() => {
        setShowToast(false);
      }, 1800);
    } catch (error: any) {
      Alert.alert('Không thể cập nhật hồ sơ', error?.message || 'Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View entering={FadeInDown.duration(360)} style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
          <View style={styles.headerRightSpace} />
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(28, insets.bottom + 24),
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.delay(40).duration(380)} style={styles.topSpace}>
            <ProfileAvatarPicker avatarUri={avatar} onPressChange={handleChangeAvatar} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(380)} style={styles.formCard}>
            <ProfileInput
              label="Họ và tên"
              value={name}
              onChangeText={(value) => {
                setName(value);
                clearError('name');
              }}
              placeholder="Nhập họ tên"
              maxLength={80}
              error={errors.name}
            />

            <ProfileInput
              label="Email"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                clearError('email');
              }}
              placeholder="Nhập email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={120}
              error={errors.email}
            />

            <ProfileInput
              label="Số điện thoại"
              optional
              value={phone}
              onChangeText={(value) => {
                setPhone(value);
                clearError('phone');
              }}
              placeholder="Nhập số điện thoại"
              keyboardType="phone-pad"
              maxLength={20}
              error={errors.phone}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(380)}>
            <ReadOnlyInfoCard
              accountId={safeUser.id}
              joinedAt={formatJoinedDate(safeUser.createdAt)}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(380)} style={styles.changePasswordWrap}>
            <Pressable
              onPress={() => navigation.navigate('ChangePassword')}
              style={({ pressed }) => [styles.changePasswordButton, pressed && styles.changePasswordPressed]}
            >
              <Ionicons name="lock-closed-outline" size={16} color={theme.colors.textPrimary} />
              <Text style={styles.changePasswordText}>Đổi mật khẩu</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(380)} style={styles.saveWrap}>
            <SaveButton onPress={handleSave} loading={loading} disabled={!isValid} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showToast ? (
        <Animated.View
          entering={SlideInDown.springify().damping(14)}
          exiting={SlideOutDown.duration(180)}
          style={[styles.toast, { bottom: insets.bottom + 12 }]}
        >
          <Ionicons name="checkmark-circle" size={18} color="#2D7D46" />
          <Text style={styles.toastText}>Đã cập nhật hồ sơ</Text>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7DF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgCard,
    borderWidth: 1,
    borderColor: '#E4DFD8',
    ...theme.shadows.card,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerRightSpace: {
    width: 42,
    height: 42,
  },
  topSpace: {
    paddingTop: 16,
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7E2DB',
    backgroundColor: theme.colors.bgCard,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
    ...theme.shadows.card,
  },
  changePasswordWrap: {
    marginTop: 14,
  },
  changePasswordButton: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3DED8',
    backgroundColor: theme.colors.bgCard,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...theme.shadows.card,
  },
  changePasswordPressed: {
    backgroundColor: '#F9F7F3',
  },
  changePasswordText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  saveWrap: {
    marginTop: 18,
  },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ECF8EF',
    borderWidth: 1,
    borderColor: '#CBE8D4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toastText: {
    color: '#2D7D46',
    fontSize: 13.5,
    fontWeight: '600',
  },
});
