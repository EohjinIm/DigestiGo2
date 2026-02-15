import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getTrackingSummary } from '../Services/trackingService';

const COLORS = {
    textPrimary: '#FFFFFF',
    textSecondary: '#8E99AB',
    textTertiary: '#505C6F',
    background: '#0A0E1A',
    surface: '#141824',
    surfaceLight: '#1C2333',
    border: '#1C2333',
    primary: '#00E676',
    accent: '#00B8D4',
};

export default function Report({ navigation }) {
    const [summary, setSummary] = useState({
        symptoms: [],
        dietary: { carbs: 0, proteins: 0, dairy: 0, fibre: 0 },
        triggers: [],
        totalEntries: 0,
    });
    const [userComments, setUserComments] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await getTrackingSummary();
        setSummary(data);
    };

    const generateHTMLReport = () => {
        const today = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const dietaryTotal = summary.dietary.carbs + summary.dietary.proteins +
            summary.dietary.dairy + summary.dietary.fibre;

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Times New Roman', Times, serif;
                    padding: 50px 60px;
                    background: white;
                    color: #000;
                    line-height: 1.5;
                    font-size: 11pt;
                }
                .letterhead {
                    border-bottom: 2px solid #000;
                    padding-bottom: 15px;
                    margin-bottom: 25px;
                }
                .letterhead h1 {
                    font-size: 18pt;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 5px;
                }
                .letterhead .meta {
                    font-size: 9pt;
                    color: #333;
                }
                .patient-info {
                    margin-bottom: 25px;
                    padding: 15px;
                    border: 1px solid #000;
                    background: #f9f9f9;
                }
                .patient-info table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .patient-info td {
                    padding: 5px 10px;
                    font-size: 10pt;
                }
                .patient-info td:first-child {
                    font-weight: bold;
                    width: 150px;
                }
                .section {
                    margin-bottom: 25px;
                    page-break-inside: avoid;
                }
                .section-header {
                    background: #000;
                    color: white;
                    padding: 8px 12px;
                    font-size: 11pt;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 10px;
                }
                .section-content {
                    padding: 10px 15px;
                    border: 1px solid #ccc;
                    min-height: 60px;
                }
                .findings-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .findings-list li {
                    padding: 6px 0;
                    border-bottom: 1px solid #e0e0e0;
                    font-size: 10pt;
                }
                .findings-list li:last-child {
                    border-bottom: none;
                }
                .findings-list li:before {
                    content: "▪";
                    margin-right: 8px;
                    font-weight: bold;
                }
                .dietary-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                .dietary-table th {
                    background: #f0f0f0;
                    border: 1px solid #999;
                    padding: 8px;
                    text-align: left;
                    font-size: 10pt;
                    font-weight: bold;
                }
                .dietary-table td {
                    border: 1px solid #ccc;
                    padding: 8px;
                    font-size: 10pt;
                }
                .dietary-table td.numeric {
                    text-align: center;
                    font-weight: bold;
                }
                .notes-section {
                    background: #fafafa;
                    border: 1px solid #999;
                    padding: 15px;
                    margin-top: 10px;
                }
                .notes-section .notes-header {
                    font-weight: bold;
                    font-size: 10pt;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                }
                .notes-section .notes-content {
                    font-size: 10pt;
                    white-space: pre-wrap;
                    line-height: 1.6;
                }
                .empty-finding {
                    font-style: italic;
                    color: #666;
                    text-align: center;
                    padding: 15px;
                    font-size: 10pt;
                }
                .footer {
                    margin-top: 40px;
                    padding-top: 15px;
                    border-top: 1px solid #000;
                    font-size: 8pt;
                    color: #333;
                    text-align: center;
                }
                .clinical-note {
                    font-size: 9pt;
                    font-style: italic;
                    color: #555;
                    margin-top: 20px;
                    padding: 10px;
                    border-left: 3px solid #000;
                    background: #f5f5f5;
                }
            </style>
        </head>
        <body>
            <div class="letterhead">
                <h1>Digestive Health Report</h1>
                <div class="meta">
                    Generated: ${today} | Digital Health Tracking System
                </div>
            </div>

            <div class="patient-info">
                <table>
                    <tr>
                        <td>Report Date:</td>
                        <td>${today}</td>
                    </tr>
                    <tr>
                        <td>Total Entries Logged:</td>
                        <td>${summary.totalEntries}</td>
                    </tr>
                    <tr>
                        <td>Reporting Period:</td>
                        <td>Cumulative tracking data</td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <div class="section-header">I. Clinical Symptoms</div>
                <div class="section-content">
                    ${summary.symptoms.length === 0
            ? '<div class="empty-finding">No symptoms recorded during tracking period.</div>'
            : `<ul class="findings-list">
                            ${summary.symptoms.map(s => `<li>${s.summary}</li>`).join('')}
                           </ul>`
        }
                </div>
            </div>

            <div class="section">
                <div class="section-header">II. Nutritional Intake Analysis</div>
                <div class="section-content">
                    ${dietaryTotal === 0
            ? '<div class="empty-finding">No dietary data recorded during tracking period.</div>'
            : `<table class="dietary-table">
                            <thead>
                                <tr>
                                    <th>Food Category</th>
                                    <th style="text-align: center;">Count</th>
                                    <th style="text-align: center;">Percentage</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Carbohydrates</td>
                                    <td class="numeric">${summary.dietary.carbs}</td>
                                    <td class="numeric">${dietaryTotal > 0 ? Math.round((summary.dietary.carbs / dietaryTotal) * 100) : 0}%</td>
                                </tr>
                                <tr>
                                    <td>Proteins</td>
                                    <td class="numeric">${summary.dietary.proteins}</td>
                                    <td class="numeric">${dietaryTotal > 0 ? Math.round((summary.dietary.proteins / dietaryTotal) * 100) : 0}%</td>
                                </tr>
                                <tr>
                                    <td>Dairy Products</td>
                                    <td class="numeric">${summary.dietary.dairy}</td>
                                    <td class="numeric">${dietaryTotal > 0 ? Math.round((summary.dietary.dairy / dietaryTotal) * 100) : 0}%</td>
                                </tr>
                                <tr>
                                    <td>Dietary Fiber</td>
                                    <td class="numeric">${summary.dietary.fibre}</td>
                                    <td class="numeric">${dietaryTotal > 0 ? Math.round((summary.dietary.fibre / dietaryTotal) * 100) : 0}%</td>
                                </tr>
                                <tr style="background: #f0f0f0; font-weight: bold;">
                                    <td>Total Entries</td>
                                    <td class="numeric">${dietaryTotal}</td>
                                    <td class="numeric">100%</td>
                                </tr>
                            </tbody>
                           </table>`
        }
                </div>
            </div>

            <div class="section">
                <div class="section-header">III. Identified Trigger Factors</div>
                <div class="section-content">
                    ${summary.triggers.length === 0
            ? '<div class="empty-finding">No trigger factors identified during tracking period.</div>'
            : `<ul class="findings-list">
                            ${summary.triggers.map(t => `<li>${t.summary}</li>`).join('')}
                           </ul>`
        }
                </div>
            </div>

            ${userComments.trim() !== ''
            ? `<div class="section">
                    <div class="section-header">IV. Patient Notes</div>
                    <div class="notes-section">
                        <div class="notes-header">Additional Information:</div>
                        <div class="notes-content">${userComments}</div>
                    </div>
                   </div>`
            : ''
        }

            <div class="clinical-note">
                <strong>Clinical Note:</strong> This report is generated from patient self-reported data via digital health tracking. 
                All findings should be evaluated in conjunction with clinical examination and professional medical assessment.
            </div>

            <div class="footer">
                <strong>CONFIDENTIAL MEDICAL DOCUMENT</strong><br>
                This report contains protected health information. Handle in accordance with HIPAA guidelines.<br>
                Generated by DigestiGo Health Tracking System | For Healthcare Provider Use
            </div>
        </body>
        </html>
        `;
    };

    const generatePDF = async () => {
        if (summary.totalEntries === 0) {
            Alert.alert(
                'No Data',
                'You need to have some tracked health data before generating a report.',
                [{ text: 'OK' }]
            );
            return;
        }

        setIsGenerating(true);
        try {
            const html = generateHTMLReport();
            const { uri } = await Print.printToFileAsync({ html });

            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Save Your Health Report',
                UTI: 'com.adobe.pdf',
            });

            Alert.alert(
                'Success!',
                'Your health report has been generated and is ready to save or share.',
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert(
                'Error',
                'Failed to generate PDF. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsGenerating(false);
        }
    };

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
                    <Text style={styles.headerTitle}>Generate Report</Text>
                </View>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Ionicons name="document-text" size={32} color={COLORS.primary} />
                    <Text style={styles.infoTitle}>Doctor-Ready Health Report</Text>
                    <Text style={styles.infoText}>
                        Generate a professional PDF report of your digestive health tracking data to share with your healthcare provider.
                    </Text>
                </View>

                {/* Preview Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{summary.symptoms.length}</Text>
                        <Text style={styles.statLabel}>Symptoms</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{summary.triggers.length}</Text>
                        <Text style={styles.statLabel}>Triggers</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>
                            {summary.dietary.carbs + summary.dietary.proteins +
                                summary.dietary.dairy + summary.dietary.fibre}
                        </Text>
                        <Text style={styles.statLabel}>Meals</Text>
                    </View>
                </View>

                {/* Comments Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Additional Comments (Optional)</Text>
                    <Text style={styles.sectionSubtitle}>
                        Add any extra information you want to share with your doctor
                    </Text>
                    <TextInput
                        style={styles.commentsInput}
                        value={userComments}
                        onChangeText={setUserComments}
                        placeholder="E.g., 'Symptoms worse in the morning', 'Started new medication on...'"
                        placeholderTextColor={COLORS.textTertiary}
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                    />
                </View>

                {/* Generate Button */}
                <TouchableOpacity
                    style={[styles.generateButton, isGenerating && styles.generatingButton]}
                    onPress={generatePDF}
                    disabled={isGenerating}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name={isGenerating ? "hourglass" : "download-outline"}
                        size={24}
                        color={COLORS.background}
                    />
                    <Text style={styles.generateButtonText}>
                        {isGenerating ? 'Generating PDF...' : 'Generate & Download PDF'}
                    </Text>
                </TouchableOpacity>

                {/* Info Note */}
                <View style={styles.noteBox}>
                    <Ionicons name="information-circle-outline" size={20} color={COLORS.accent} />
                    <Text style={styles.noteText}>
                        The report will include all your tracked symptoms, dietary data, and identified triggers in a clean, professional format.
                    </Text>
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
    infoCard: {
        backgroundColor: COLORS.surface,
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    infoTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: 12,
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statBox: {
        flex: 1,
        backgroundColor: COLORS.surface,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.primary,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 6,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 12,
    },
    commentsInput: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        color: COLORS.textPrimary,
        fontSize: 15,
        minHeight: 120,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    generateButton: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 12,
        marginBottom: 16,
    },
    generatingButton: {
        opacity: 0.6,
    },
    generateButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.background,
    },
    noteBox: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        padding: 16,
        borderRadius: 12,
        gap: 12,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.accent,
    },
    noteText: {
        flex: 1,
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 18,
    },
});