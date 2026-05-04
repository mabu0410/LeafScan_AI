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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, { FadeInDown, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { usePlantsStore } from '../stores/plantsStore';
import { PLANT_CATEGORIES } from '../constants/plants';
import { theme } from '../theme/theme';
import { ImageUploadBox } from '../components/add-plant/ImageUploadBox';
import { FormInput } from '../components/add-plant/FormInput';
import { CategoryChips } from '../components/add-plant/CategoryChips';
import { SubmitButton } from '../components/add-plant/SubmitButton';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'AddPlant'>;
};

interface AddPlantErrors {
  plantName?: string;
  category?: string;
}

export default function AddPlantScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [plantName, setPlantName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<AddPlantErrors>({});
  const [loading, setLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addPlant = usePlantsStore((state) => state.addPlant);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const isFormValid = useMemo(() => {
    return plantName.trim().length > 0 && category.trim().length > 0;
  }, [plantName, category]);

  const clearError = (field: keyof AddPlantErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: undefined };
    });
  };

  const validateForm = () => {
    const nextErrors: AddPlantErrors = {};
    if (!plantName.trim()) {
      nextErrors.plantName = 'Vui lòng nhập tên cây';
    }
    if (!category.trim()) {
      nextErrors.category = 'Vui lòng chọn danh mục';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleTakePhoto = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      Alert.alert('Chưa có quyền camera', 'Vui lòng cho phép ứng dụng truy cập camera để chụp ảnh cây.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImage(result.assets[0].uri);
    }
  };

  const handlePickLibrary = async () => {
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!mediaPermission.granted) {
      Alert.alert('Chưa có quyền thư viện', 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!validateForm()) return;

    setLoading(true);
    try {
      await addPlant({
        name: plantName.trim(),
        latin_name: scientificName.trim() || undefined,
        category: category.trim() || undefined,
        location: location.trim() || undefined,
        notes: note.trim() || undefined,
      });

      setShowSuccessToast(true);
      successTimerRef.current = setTimeout(() => {
        navigation.goBack();
      }, 900);
    } catch (error: any) {
      Alert.alert('Không thể thêm cây', error?.message || 'Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={21} color={theme.colors.textPrimary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Thêm cây mới</Text>
            <Text style={styles.headerSubtitle}>Thiết lập thông tin để bắt đầu theo dõi cây của bạn</Text>
          </View>
          <View style={styles.headerSpacer} />
        </Animated.View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(28, insets.bottom + 24) }]}
        >
          <Animated.View entering={FadeInDown.delay(60).duration(420)}>
            <ImageUploadBox
              imageUri={image}
              onTakePhoto={handleTakePhoto}
              onPickLibrary={handlePickLibrary}
              onRemoveImage={() => setImage(null)}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(420)} style={styles.formCard}>
            <FormInput
              label="Tên cây *"
              placeholder="VD: Cà chua bi"
              value={plantName}
              onChangeText={(value) => {
                setPlantName(value);
                clearError('plantName');
              }}
              maxLength={80}
              error={errors.plantName}
            />

            <FormInput
              label="Tên khoa học"
              optionalLabel="(không bắt buộc)"
              placeholder="VD: Solanum lycopersicum"
              value={scientificName}
              onChangeText={setScientificName}
              maxLength={120}
            />

            <CategoryChips
              categories={PLANT_CATEGORIES}
              selectedCategory={category}
              onSelectCategory={(selected) => {
                setCategory(selected);
                clearError('category');
              }}
              error={errors.category}
            />

            <FormInput
              label="Vị trí"
              optionalLabel="(không bắt buộc)"
              placeholder="VD: Luống A · Góc vườn phía Đông"
              value={location}
              onChangeText={setLocation}
              maxLength={100}
            />

            <FormInput
              label="Ghi chú"
              optionalLabel="(không bắt buộc)"
              placeholder="Thêm ghi chú về cách chăm sóc hoặc tình trạng hiện tại"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              maxLength={400}
            />

            <SubmitButton
              title="Thêm cây"
              loadingTitle="Đang thêm..."
              loading={loading}
              disabled={!isFormValid}
              onPress={handleSubmit}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showSuccessToast ? (
        <Animated.View
          entering={SlideInDown.springify().damping(14)}
          exiting={SlideOutDown.duration(180)}
          style={[styles.toast, { bottom: insets.bottom + 14 }]}
        >
          <Ionicons name="checkmark-circle" size={18} color="#2D7D46" />
          <Text style={styles.toastText}>Đã thêm cây vào vườn của bạn</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7DF',
    backgroundColor: theme.colors.bg,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bgCard,
    borderWidth: 1,
    borderColor: '#E5E0D9',
    ...theme.shadows.card,
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    color: theme.colors.textSecondary,
  },
  headerSpacer: {
    width: 42,
    height: 42,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E3DC',
    backgroundColor: theme.colors.bgCard,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    ...theme.shadows.card,
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
    fontSize: 13.5,
    fontWeight: '600',
    color: '#2D7D46',
  },
});
