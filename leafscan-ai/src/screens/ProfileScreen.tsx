import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { theme } from '../theme/theme';

const ACHIEVEMENTS = [
    { label: 'Người mới', icon: '🌱' },
    { label: 'Thợ quét', icon: '📷' },
    { label: 'Bác sĩ cây', icon: '🩺' },
    { label: 'Nông dân', icon: '👨‍🌾' },
];

const STATS = [
    { label: 'Ngày hoạt động', value: '23' },
    { label: 'Cây đã quét', value: '47' },
    { label: 'Bệnh phát hiện', value: '12' },
];

export default function ProfileScreen() {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const user = useAuthStore(state => state.user);
    const logout = useAuthStore(state => state.logout);
    const { notifications, darkMode, toggleNotifications, toggleDarkMode } = useSettingsStore();

    const handleLogout = () => {
        Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Đăng xuất', style: 'destructive', onPress: logout },
        ]);
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Ionicons name="person" size={32} color={theme.colors.primary} />
                </View>
                <Text style={styles.name}>{user?.name || 'Nông dân'}</Text>
                <Text style={styles.email}>{user?.email || 'email@example.com'}</Text>
            </View>

            {/* Achievements */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thành tích</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {ACHIEVEMENTS.map((badge, index) => (
                        <View key={badge.label} style={styles.badge}>
                            <Text style={styles.badgeIcon}>{badge.icon}</Text>
                            <Text style={styles.badgeLabel}>{badge.label}</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                {STATS.map(stat => (
                    <View key={stat.label} style={styles.statCard}>
                        <Text style={styles.statValue}>{stat.value}</Text>
                        <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                ))}
            </View>

            {/* Settings */}
            <View style={styles.settingsSection}>
                <Text style={styles.sectionTitle}>Cài đặt</Text>

                <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                        <Ionicons name="notifications-outline" size={20} color={theme.colors.textSecondary} />
                        <Text style={styles.settingLabel}>Thông báo</Text>
                    </View>
                    <Switch
                        value={notifications}
                        onValueChange={toggleNotifications}
                        trackColor={{ false: theme.colors.bgMuted, true: theme.colors.primaryLight }}
                        thumbColor={theme.colors.white}
                    />
                </View>

                <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                        <Ionicons name="moon-outline" size={20} color={theme.colors.textSecondary} />
                        <Text style={styles.settingLabel}>Chế độ tối</Text>
                    </View>
                    <Switch
                        value={darkMode}
                        onValueChange={toggleDarkMode}
                        trackColor={{ false: theme.colors.bgMuted, true: theme.colors.primaryLight }}
                        thumbColor={theme.colors.white}
                    />
                </View>

                <TouchableOpacity style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                        <Ionicons name="language-outline" size={20} color={theme.colors.textSecondary} />
                        <Text style={styles.settingLabel}>Ngôn ngữ</Text>
                    </View>
                    <View style={styles.settingRight}>
                        <Text style={styles.settingValue}>Tiếng Việt</Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                        <Ionicons name="help-circle-outline" size={20} color={theme.colors.textSecondary} />
                        <Text style={styles.settingLabel}>Trợ giúp & Phản hồi</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
            </View>

            {/* Logout */}
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Ionicons name="log-out-outline" size={20} color={theme.colors.severe} />
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bg,
        paddingTop: 60,
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.primaryPale,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    name: {
        fontSize: 22,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 12,
    },
    badge: {
        alignItems: 'center',
        backgroundColor: theme.colors.bgCard,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginRight: 10,
        borderWidth: 0.5,
        borderColor: theme.colors.border,
        minWidth: 80,
    },
    badgeIcon: {
        fontSize: 24,
        marginBottom: 6,
    },
    badgeLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 10,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.bgCard,
        borderRadius: 16,
        padding: 14,
        alignItems: 'center',
        borderWidth: 0.5,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    statLabel: {
        fontSize: 10,
        color: theme.colors.textMuted,
        marginTop: 4,
        textAlign: 'center',
    },
    settingsSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.bgCard,
        borderRadius: 14,
        padding: 16,
        marginBottom: 8,
        borderWidth: 0.5,
        borderColor: theme.colors.border,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingLabel: {
        fontSize: 15,
        color: theme.colors.textPrimary,
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    settingValue: {
        fontSize: 14,
        color: theme.colors.textMuted,
    },
    logoutButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 20,
        height: 48,
        backgroundColor: theme.colors.severeBg,
        borderRadius: 14,
    },
    logoutText: {
        color: theme.colors.severe,
        fontWeight: '600',
        fontSize: 15,
    },
});
