import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { usePlantsStore } from '../stores/plantsStore';
import { PLANT_CATEGORIES } from '../constants/plants';
import { AnimatedButton } from '../components/AnimatedButton';
import { theme } from '../theme/theme';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'EditPlant'>;
    route: RouteProp<RootStackParamList, 'EditPlant'>;
};

export default function EditPlantScreen({ navigation, route }: Props) {
    const { plantId } = route.params;
    const plants = usePlantsStore(state => state.plants);
    const updatePlant = usePlantsStore(state => state.updatePlant);
    const plant = plants.find(p => p.id === plantId);
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState(plant?.name || '');
    const [latinName, setLatinName] = useState(plant?.latinName || '');
    const [category, setCategory] = useState(plant?.category || '');
    const [location, setLocation] = useState(plant?.location || '');
    const [notes, setNotes] = useState(plant?.notes || '');

    const handleSave = async () => {
        setLoading(true);
        try {
            await updatePlant(plantId, {
                name,
                latin_name: latinName,
                category,
                location,
                notes,
            });
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Không thể cập nhật', error?.message || 'Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const categories = PLANT_CATEGORIES;

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chỉnh sửa</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Tên cây *</Text>
                        <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={theme.colors.textMuted} />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Tên khoa học</Text>
                        <TextInput style={styles.input} value={latinName} onChangeText={setLatinName} placeholderTextColor={theme.colors.textMuted} />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Danh mục</Text>
                        <View style={styles.chipGrid}>
                            {categories.map(cat => (
                                <TouchableOpacity key={cat.id} onPress={() => setCategory(cat.label)} style={[styles.chip, category === cat.label && styles.chipActive]}>
                                    <Text style={[styles.chipText, category === cat.label && styles.chipTextActive]}>{cat.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Vị trí</Text>
                        <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholderTextColor={theme.colors.textMuted} />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Ghi chú</Text>
                        <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} multiline numberOfLines={4} textAlignVertical="top" placeholderTextColor={theme.colors.textMuted} />
                    </View>
                </View>

                <AnimatedButton onPress={handleSave} loading={loading} size="lg" style={styles.submitButton} disabled={!name}>
                    Lưu thay đổi
                </AnimatedButton>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.bg },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    backButton: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.bgCard,
        justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border,
    },
    headerTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary },
    scrollContent: { padding: 20, paddingBottom: 40 },
    form: { gap: 20 },
    inputGroup: { gap: 6 },
    label: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
    input: {
        backgroundColor: theme.colors.white, borderWidth: 1.5, borderColor: theme.colors.border,
        borderRadius: 14, height: 50, paddingHorizontal: 16, fontSize: 15, color: theme.colors.textPrimary,
    },
    textArea: { height: 100, paddingTop: 14 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        backgroundColor: theme.colors.bgMuted, borderWidth: 1.5, borderColor: 'transparent',
    },
    chipActive: { backgroundColor: theme.colors.primaryPale, borderColor: theme.colors.primary },
    chipText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },
    chipTextActive: { color: theme.colors.primary },
    submitButton: { width: '100%', marginTop: 24 },
});
