import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Disease, DiseaseLibraryItem, RootStackParamList } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { DiseaseCard } from '../components/DiseaseCard';
import { getDiseaseDetailApi, listDiseasesApi } from '../api/diseases';
import { theme } from '../theme/theme';

type Props = {
    navigation: StackNavigationProp<RootStackParamList, 'DiseaseDetail'>;
    route: RouteProp<RootStackParamList, 'DiseaseDetail'>;
};

export default function DiseaseDetailScreen({ navigation, route }: Props) {
    const [disease, setDisease] = useState<Disease | null>(null);
    const [relatedDiseases, setRelatedDiseases] = useState<DiseaseLibraryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadDisease = async () => {
            setLoading(true);
            setError(null);
            try {
                const detail = await getDiseaseDetailApi(route.params.diseaseId);
                if (cancelled) return;
                setDisease(detail);

                const related = await listDiseasesApi({
                    severity: detail.severity,
                    limit: 12,
                });
                if (cancelled) return;
                setRelatedDiseases(related.filter(item => item.id !== route.params.diseaseId).slice(0, 3));
            } catch (err: any) {
                if (!cancelled) {
                    setError(err?.message || 'Không thể tải thông tin bệnh.');
                    setDisease(null);
                    setRelatedDiseases([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadDisease();
        return () => {
            cancelled = true;
        };
    }, [route.params.diseaseId]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết bệnh</Text>
                <TouchableOpacity style={styles.backButton}>
                    <Ionicons name="bookmark-outline" size={22} color={theme.colors.textPrimary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerState}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={styles.stateText}>Đang tải dữ liệu bệnh...</Text>
                </View>
            ) : error || !disease ? (
                <View style={styles.centerState}>
                    <Ionicons name="warning-outline" size={36} color={theme.colors.severe} />
                    <Text style={styles.stateText}>{error || 'Không tìm thấy dữ liệu bệnh.'}</Text>
                    <TouchableOpacity
                        onPress={() => navigation.replace('DiseaseDetail', { diseaseId: route.params.diseaseId })}
                        style={styles.retryButton}
                    >
                        <Text style={styles.retryText}>Thử lại</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <Image source={{ uri: disease.image }} style={styles.heroImage} />

                    <View style={styles.titleSection}>
                        <Text style={styles.diseaseName}>{disease.name}</Text>
                        <SeverityBadge severity={disease.severity} size="lg" />
                    </View>

                    <Text style={styles.description}>{disease.description}</Text>

                    <Text style={styles.sectionTitle}>Triệu chứng</Text>
                    {disease.symptoms.map((item, index) => (
                        <View key={index} style={styles.bulletRow}>
                            <View style={styles.bullet} />
                            <Text style={styles.bulletText}>{item}</Text>
                        </View>
                    ))}

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Cách điều trị</Text>
                    {(disease.treatmentPlan?.length ? disease.treatmentPlan : disease.treatment).map((item, index) => (
                        <View key={index} style={styles.stepCard}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>{index + 1}</Text>
                            </View>
                            <Text style={styles.stepText}>{item}</Text>
                        </View>
                    ))}

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Phòng ngừa</Text>
                    {disease.prevention.map((item, index) => (
                        <View key={index} style={styles.bulletRow}>
                            <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} />
                            <Text style={styles.bulletText}>{item}</Text>
                        </View>
                    ))}

                    {relatedDiseases.length > 0 && (
                        <>
                            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Bệnh tương tự</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relatedRow}>
                                {relatedDiseases.map(item => (
                                    <View key={item.id} style={styles.relatedCard}>
                                        <DiseaseCard
                                            disease={item}
                                            onPress={() => navigation.push('DiseaseDetail', { diseaseId: item.id })}
                                        />
                                    </View>
                                ))}
                            </ScrollView>
                        </>
                    )}
                </ScrollView>
            )}
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
    centerState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 24,
    },
    stateText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 8,
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    retryText: {
        color: theme.colors.white,
        fontWeight: '600',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    heroImage: {
        width: '100%',
        height: 220,
        borderRadius: 20,
        resizeMode: 'cover',
        marginBottom: 20,
    },
    titleSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    diseaseName: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        flex: 1,
        marginRight: 12,
    },
    description: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 22,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: 12,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 8,
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
        marginBottom: 8,
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
    relatedRow: {
        marginBottom: 20,
    },
    relatedCard: {
        marginRight: 12,
    },
});
