import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Tracker from './Screens/Tracker';

const { width } = Dimensions.get('window');

// ACTUAL FIRE COLOR PALETTE 🔥
const COLORS = {
    // Dark backgrounds
    background: '#0A0E1A',           // Deep dark blue-black
    surface: '#141824',              // Slightly lighter surface
    surfaceLight: '#1C2333',         // Elevated surface

    // Medical green gradients
    primary: '#00E676',              // Bright medical green

    // Accent blue
    accent: '#00B8D4',               // Cyan blue

    // Text
    textPrimary: '#FFFFFF',          // Pure white
    textSecondary: '#8E99AB',        // Light gray

    // Borders and dividers
    border: '#1C2333',               // Subtle border
};

export default function SideNav({
                                    visible,
                                    onClose,
                                    navigation,
                                }) {
    const slideAnim = useRef(new Animated.Value(-width * 0.85)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Slide in
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 25,
                    stiffness: 120,
                }),
                Animated.timing(overlayAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Slide out
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: -width * 0.85,
                    useNativeDriver: true,
                    damping: 25,
                    stiffness: 120,
                }),
                Animated.timing(overlayAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    return (
        <>
            {/* Animated Overlay */}
            <Animated.View
                style={[
                    styles.overlay,
                    {
                        opacity: overlayAnim,
                        pointerEvents: visible ? 'auto' : 'none',
                    }
                ]}
                pointerEvents={visible ? 'auto' : 'none'}
            >
                <TouchableOpacity
                    style={{ flex: 1 }}
                    activeOpacity={1}
                    onPress={onClose}
                />
            </Animated.View>

            {/* Animated Sidebar */}
            <Animated.View
                style={[
                    styles.sidebar,
                    {
                        transform: [{ translateX: slideAnim }],
                    }
                ]}
            >
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.sidebarHeader}>
                        <View>
                            <Text style={styles.sidebarTitle}>Console</Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeButton}
                        >
                            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.menuContent}>
                        <TouchableOpacity
                            style={styles.menuButton}
                            onPress={() => {
                                if (navigation) {
                                    navigation.navigate('Tracker');
                                    onClose();
                                } else {
                                    console.warn('Navigation prop is not available');
                                }
                            }}
                        >
                            <Ionicons name="document-text-outline" size={22} color={COLORS.primary} />
                            <Text style={styles.menuText}>Logs</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.menuButton, { marginTop: 12 }]}
                            onPress={() => {
                                if (navigation) {
                                    navigation.navigate('Report');
                                    onClose();
                                } else {
                                    console.warn('Navigation prop is not available');
                                }
                            }}
                        >
                            <Ionicons name="document-attach-outline" size={22} color={COLORS.accent} />
                            <Text style={styles.menuText}>Generate Report</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Animated.View>
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 999,
    },
    sidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: width * 0.85,
        backgroundColor: COLORS.surface,
        zIndex: 1000,
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
    },
    sidebarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    sidebarTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    closeButton: {
        padding: 4,
    },
    menuContent: {
        flex: 1,
        paddingTop: 20,
        paddingHorizontal: 16,
    },
    menuButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: COLORS.surfaceLight,
        gap: 12,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    sidebarFooter: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        padding: 16,
    },
    footerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        gap: 12,
    },
    footerText: {
        fontSize: 15,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
});