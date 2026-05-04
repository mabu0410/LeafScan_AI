import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { HealthRing } from '../components/HealthRing';
import { theme } from '../theme/theme';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'Result'>;
    route: RouteProp<RootStackParamList, 'Result'>;
};

const TABS = [
    { id: 'overview', label: 'Tổng quan', icon: 'information-circle-outline' as const },
    { id: 'treatment', label: 'Điều trị', icon: 'medkit-outline' as const },
    { id: 'prevention', label: 'Phòng ngừa', icon: 'shield-checkmark-outline' as const },
];

export default function ResultScreen({ navigation, route }: Props) {
    const { result: disease } = route.params;
    const [activeTab, setActiveTab] = useState<'overview' | 'treatment' | 'prevention'>('overview');
    const treatmentSteps = disease.treatmentPlan?.length ? disease.treatmentPlan : disease.treatment;

    const stageLabelMap: Record<string, string> = {
        healthy: 'Khỏe mạnh',
        early: 'Giai đoạn sớm',
        middle: 'Giai đoạn giữa',
        late: 'Giai đoạn muộn',
        unknown: 'Chưa xác định',
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Kết quả quét</Text>
                <TouchableOpacity style={styles.backButton}>
                    <Ionicons name="share-outline" size={22} color={theme.colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Disease Card */}
                <View style={styles.diseaseCard}>
                    <View style={styles.diseaseTop}>
                        <View style={styles.diseaseInfo}>
                            <Text style={styles.diseaseName}>{disease.name}</Text>
                            <SeverityBadge severity={disease.severity} size="md" />
                        </View>
                        <HealthRing score={disease.confidence} size={72} strokeWidth={6} />
                    </View>
                    <View style={styles.affectedRow}>
                        <Text style={styles.affectedLabel}>Vùng ảnh hưởng</Text>
                        <Text style={styles.affectedValue}>{disease.affectedArea}%</Text>
                    </View>
                    <View style={styles.affectedRow}>
                        <Text style={styles.affectedLabel}>Giai đoạn hiện tại</Text>
                        <Text style={styles.affectedValue}>{stageLabelMap[disease.predictedStage || 'unknown']}</Text>
                    </View>
                    <View style={styles.affectedRow}>
                        <Text style={styles.affectedLabel}>Dự báo 7 ngày</Text>
                        <Text style={styles.affectedValue}>
                            {stageLabelMap[disease.forecastStage7d || 'unknown']} ({Math.round(disease.forecastConfidence || 0)}%)
                        </Text>
                    </View>
                </View>

                {/* Image */}
                <Image source={{ uri: disease.image }} style={styles.image} />

                {/* Tabs */}
                <View style={styles.tabRow}>
                    {TABS.map(tab => (
                        <TouchableOpacity
                            key={tab.id}
                            onPress={() => setActiveTab(tab.id as 'overview' | 'treatment' | 'prevention')}
                            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                        >
                            <Ionicons name={tab.icon} size={16} color={activeTab === tab.id ? theme.colors.primary : theme.colors.textMuted} />
                            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>Mô tả</Text>
                        <Text style={styles.bodyText}>{disease.description}</Text>
                        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Triệu chứng</Text>
                        {disease.symptoms.map((s, i) => (
                            <View key={i} style={styles.bulletRow}>
                                <View style={styles.bullet} />
                                <Text style={styles.bulletText}>{s}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {activeTab === 'treatment' && (
                    <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>Phương pháp điều trị</Text>
                        {treatmentSteps.map((t, i) => (
                            <View key={i} style={styles.stepCard}>
                                <View style={styles.stepNumber}>
                                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                                </View>
                                <Text style={styles.stepText}>{t}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {activeTab === 'prevention' && (
                    <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>Biện pháp phòng ngừa</Text>
                        {disease.prevention.map((p, i) => (
                            <View key={i} style={styles.bulletRow}>
                                <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} />
                                <Text style={styles.bulletText}>{p}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {!!disease.safetyNotice && (
                    <View style={styles.noticeCard}>
                        <Ionicons name="warning-outline" size={18} color={theme.colors.severe} />
                        <Text style={styles.noticeText}>{disease.safetyNotice}</Text>
                    </View>
                )}
            </ScrollView>

            {/* Floating Chat Button */}
            <TouchableOpacity
                style={styles.chatFab}
                onPress={() => navigation.navigate('Chat', { disease })}
                activeOpacity={0.85}
            >
                <Ionicons name="chatbubbles" size={24} color={theme.colors.white} />
                <Text style={styles.chatFabText}>Hỏi AI</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.bg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.bgCard,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    diseaseCard: {
        backgroundColor: theme.colors.bgCard,
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 0.5,
        borderColor: theme.colors.border,
        ...theme.shadows.card,
    },
    diseaseTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    diseaseInfo: {
        flex: 1,
        gap: 10,
    },
    diseaseName: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    affectedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    affectedLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    affectedValue: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    image: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        resizeMode: 'cover',
        marginBottom: 16,
    },
    tabRow: {
        flexDirection: 'row',
        backgroundColor: theme.colors.bgMuted,
        borderRadius: 14,
        padding: 4,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    tabActive: {
        backgroundColor: theme.colors.bgCard,
        ...theme.shadows.card,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.textMuted,
    },
    tabTextActive: {
        color: theme.colors.primary,
    },
    tabContent: {
        gap: 12,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    bodyText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 22,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingVertical: 4,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.primary,
        marginTop: 6,
    },
    bulletText: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    stepCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.bgCard,
        borderRadius: 14,
        padding: 14,
        gap: 12,
        alignItems: 'flex-start',
        borderWidth: 0.5,
        borderColor: theme.colors.border,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.primaryPale,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumberText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    stepText: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    noticeCard: {
        marginTop: 20,
        backgroundColor: theme.colors.severeBg,
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    noticeText: {
        flex: 1,
        color: theme.colors.severe,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
    },
    chatFab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 28,
        gap: 8,
        ...theme.shadows.float,
    },
    chatFabText: {
        color: theme.colors.white,
        fontSize: 15,
        fontWeight: '600',
    },
});
