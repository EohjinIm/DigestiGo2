import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import { getTrackingSummary, clearTrackingData } from '../Services/trackingService';

const AI_SUMMARY_KEY = '@digestigo_ai_summary';

const COLORS = {
    textPrimary: '#FFFFFF',
    textSecondary: '#8E99AB',
    background: '#0A0E1A',
    surface: '#141824',
    surfaceLight: '#1C2333',
    border: '#1C2333',
    primary: '#00E676',
    accent: '#00B8D4',
    // Pie chart colors
    carbs: '#FF6B6B',      // Red
    proteins: '#4ECDC4',   // Teal
    dairy: '#FFE66D',      // Yellow
    fibre: '#95E1D3',      // Mint
};

export default function Tracker({ navigation }) {
    const [summary, setSummary] = useState({
        symptoms: [],
        dietary: { carbs: 0, proteins: 0, dairy: 0, fibre: 0 },
        triggers: [],
        totalEntries: 0,
    });
    const [refreshing, setRefreshing] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        symptoms: false,
        triggers: false,
    });
    const [aiSummary, setAiSummary] = useState('Analyzing your health data...');
    const [loadingSummary, setLoadingSummary] = useState(false);

    useEffect(() => {
        loadData();
        loadSavedSummary();
    }, []);

    const loadSavedSummary = async () => {
        try {
            const saved = await AsyncStorage.getItem(AI_SUMMARY_KEY);
            if (saved) {
                setAiSummary(saved);
            } else {
                // No saved summary, generate one
                generateAISummaryFromData();
            }
        } catch (error) {
            console.error('Error loading summary:', error);
            generateAISummaryFromData();
        }
    };

    const saveSummary = async (summary) => {
        try {
            await AsyncStorage.setItem(AI_SUMMARY_KEY, summary);
        } catch (error) {
            console.error('Error saving summary:', error);
        }
    };

    const loadData = async () => {
        const data = await getTrackingSummary();
        setSummary(data);
        // Don't auto-generate summary here anymore
    };

    const generateAISummaryFromData = async () => {
        const data = await getTrackingSummary();
        generateAISummary(data);
    };

    const generateAISummary = async (data) => {
        if (data.totalEntries === 0) {
            setAiSummary('Start tracking to see your health insights');
            return;
        }

        setLoadingSummary(true);

        try {
            // Build summary prompt
            const symptomsText = data.symptoms.length > 0
                ? data.symptoms.slice(0, 5).map(s => s.summary).join(', ')
                : 'none';

            const triggersText = data.triggers.length > 0
                ? data.triggers.slice(0, 5).map(t => t.summary).join(', ')
                : 'none';

            const dietaryTotal = data.dietary.carbs + data.dietary.proteins + data.dietary.dairy + data.dietary.fibre;
            const dietaryText = dietaryTotal > 0
                ? `${data.dietary.carbs} carbs, ${data.dietary.proteins} proteins, ${data.dietary.dairy} dairy, ${data.dietary.fibre} fibre`
                : 'none';

            const prompt = `Based on this health data, provide a brief 2-sentence summary of potential digestive concerns:
Symptoms: ${symptomsText}
Triggers: ${triggersText}
Diet: ${dietaryText}

Write a helpful, empathetic summary that identifies patterns. Keep it under 40 words.`;

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer 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',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a digestive health analyst. Provide brief, helpful summaries.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 100,
                }),
            });

            const data_response = await response.json();
            const summaryText = data_response.choices[0].message.content.trim();
            setAiSummary(summaryText);
            await saveSummary(summaryText); // Save to storage
        } catch (error) {
            console.error('Error generating summary:', error);
            const fallback = 'Your digestive health tracking is helping identify patterns.';
            setAiSummary(fallback);
            await saveSummary(fallback);
        } finally {
            setLoadingSummary(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleClearData = async () => {
        await clearTrackingData();
        await AsyncStorage.removeItem(AI_SUMMARY_KEY); // Clear saved summary
        setAiSummary('Start tracking to see your health insights');
        await loadData();
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const renderBulletList = (items, section, maxItems = 8) => {
        if (items.length === 0) {
            return <Text style={styles.emptyText}>No {section} tracked yet</Text>;
        }

        const isExpanded = expandedSections[section];
        const displayItems = isExpanded ? items : items.slice(0, maxItems);
        const hasMore = items.length > maxItems;

        return (
            <>
                {displayItems.map((item, index) => (
                    <View key={index} style={styles.bulletItem}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>{item.summary}</Text>
                    </View>
                ))}
                {hasMore && (
                    <TouchableOpacity
                        onPress={() => toggleSection(section)}
                        style={styles.expandButton}
                    >
                        <Text style={styles.expandButtonText}>
                            {isExpanded ? 'Show Less' : `Show ${items.length - maxItems} More`}
                        </Text>
                        <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={COLORS.primary}
                        />
                    </TouchableOpacity>
                )}
            </>
        );
    };

    // Proper donut chart using SVG - FULL CIRCLE
    const renderPieChart = () => {
        const total = summary.dietary.carbs + summary.dietary.proteins +
            summary.dietary.dairy + summary.dietary.fibre;

        if (total === 0) return null;

        const size = 200;
        const strokeWidth = 40;
        const radius = (size - strokeWidth) / 2;
        const cx = size / 2;
        const cy = size / 2;
        const circumference = 2 * Math.PI * radius;

        const data = [
            { value: summary.dietary.carbs, color: COLORS.carbs },
            { value: summary.dietary.proteins, color: COLORS.proteins },
            { value: summary.dietary.dairy, color: COLORS.dairy },
            { value: summary.dietary.fibre, color: COLORS.fibre },
        ].filter(d => d.value > 0);

        let offset = 0;

        return (
            <Svg width={size} height={size}>
                {data.map((segment, index) => {
                    const percentage = segment.value / total;
                    const strokeDasharray = `${percentage * circumference} ${circumference}`;
                    const strokeDashoffset = -offset;

                    offset += percentage * circumference;

                    return (
                        <Circle
                            key={index}
                            cx={cx}
                            cy={cy}
                            r={radius}
                            stroke={segment.color}
                            strokeWidth={strokeWidth}
                            fill="transparent"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            rotation="-90"
                            origin={`${cx}, ${cy}`}
                            strokeLinecap="butt"
                        />
                    );
                })}
            </Svg>
        );
    };

    const getDietaryPercentages = () => {
        const total = summary.dietary.carbs + summary.dietary.proteins +
            summary.dietary.dairy + summary.dietary.fibre;

        if (total === 0) return null;

        return {
            carbs: (summary.dietary.carbs / total) * 100,
            proteins: (summary.dietary.proteins / total) * 100,
            dairy: (summary.dietary.dairy / total) * 100,
            fibre: (summary.dietary.fibre / total) * 100,
        };
    };

    const percentages = getDietaryPercentages();

    return (
        <SafeAreaView style={styles.container}>
            {/* Floating Header */}
            <View style={styles.floatingHeader}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.iconButton}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Health Logs</Text>
                </View>

                <TouchableOpacity onPress={handleClearData} style={styles.iconButton}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                }
            >
                {/* AI Health Summary */}
                <View style={styles.statsCard}>
                    <TouchableOpacity
                        style={styles.refreshSummaryButton}
                        onPress={generateAISummaryFromData}
                        disabled={loadingSummary}
                    >
                        <Ionicons
                            name="refresh"
                            size={20}
                            color={COLORS.primary}
                        />
                    </TouchableOpacity>

                    <Ionicons name="sparkles" size={28} color={COLORS.primary} style={{ marginBottom: 12 }} />
                    <Text style={styles.summaryText}>
                        {loadingSummary ? 'Analyzing your data...' : aiSummary}
                    </Text>
                </View>

                {/* Symptoms Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="medkit" size={20} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Symptoms</Text>
                    </View>
                    <View style={styles.sectionContent}>
                        {renderBulletList(summary.symptoms, 'symptoms')}
                    </View>
                </View>

                {/* Dietary Section with Pie Chart */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="restaurant" size={20} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Dietary / Nutrition</Text>
                    </View>
                    <View style={styles.sectionContent}>
                        {!percentages ? (
                            <Text style={styles.emptyText}>No dietary data tracked yet</Text>
                        ) : (
                            <>
                                {/* Circular Pie Chart */}
                                <View style={styles.pieChartContainer}>
                                    {renderPieChart()}
                                </View>

                                {/* Legend */}
                                <View style={styles.legend}>
                                    {summary.dietary.carbs > 0 && (
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendColor, { backgroundColor: COLORS.carbs }]} />
                                            <Text style={styles.legendText}>
                                                Carbs ({summary.dietary.carbs}) - {percentages.carbs.toFixed(0)}%
                                            </Text>
                                        </View>
                                    )}
                                    {summary.dietary.proteins > 0 && (
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendColor, { backgroundColor: COLORS.proteins }]} />
                                            <Text style={styles.legendText}>
                                                Proteins ({summary.dietary.proteins}) - {percentages.proteins.toFixed(0)}%
                                            </Text>
                                        </View>
                                    )}
                                    {summary.dietary.dairy > 0 && (
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendColor, { backgroundColor: COLORS.dairy }]} />
                                            <Text style={styles.legendText}>
                                                Dairy ({summary.dietary.dairy}) - {percentages.dairy.toFixed(0)}%
                                            </Text>
                                        </View>
                                    )}
                                    {summary.dietary.fibre > 0 && (
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendColor, { backgroundColor: COLORS.fibre }]} />
                                            <Text style={styles.legendText}>
                                                Fibre ({summary.dietary.fibre}) - {percentages.fibre.toFixed(0)}%
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* Triggers Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="warning" size={20} color={COLORS.accent} />
                        <Text style={styles.sectionTitle}>Potential Triggers</Text>
                    </View>
                    <View style={styles.sectionContent}>
                        {renderBulletList(summary.triggers, 'triggers')}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    floatingHeader: {
        position: 'absolute',
        top: 30,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        zIndex: 1000,
        backgroundColor: 'transparent',
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 40,
        backgroundColor: 'rgba(28, 35, 51, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(28, 35, 51, 0.8)',
        borderRadius: 40,
        marginHorizontal: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingTop: 80,
        padding: 16,
    },
    statsCard: {
        backgroundColor: COLORS.surface,
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    refreshSummaryButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        padding: 8,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceLight,
    },
    statsNumber: {
        fontSize: 36,
        fontWeight: '800',
        color: COLORS.primary,
    },
    summaryText: {
        fontSize: 15,
        color: COLORS.textPrimary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 8,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontWeight: 'bold',
    },
    statsLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    sectionContent: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
    },
    emptyText: {
        color: COLORS.textSecondary,
        textAlign: 'center',
        paddingVertical: 20,
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    bulletItem: {
        flexDirection: 'row',
        marginBottom: 10,
        paddingLeft: 8,
    },
    bullet: {
        color: COLORS.primary,
        fontSize: 20,
        marginRight: 12,
        lineHeight: 22,
    },
    bulletText: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: 15,
        lineHeight: 22,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    expandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        paddingVertical: 8,
        gap: 6,
    },
    expandButtonText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    pieChartContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    legend: {
        marginTop: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    legendColor: {
        width: 16,
        height: 16,
        borderRadius: 4,
        marginRight: 8,
    },
    legendText: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
});