import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Animated,
    Alert,
    Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SideNav from '../SideNav';
import { sendMessageToGroq, formatMessagesForGroq } from '../Services/groqAPI';
import { categorizeMessage, saveTrackingEntry, CATEGORIES } from '../Services/trackingService';

const CHAT_STORAGE_KEY = '@digestigo_chat_messages';

// ACTUAL FIRE COLOR PALETTE 🔥
const COLORS = {
    background: '#0A0E1A',
    surface: '#141824',
    surfaceLight: '#1C2333',
    primary: '#00E676',
    accent: '#00B8D4',
    textPrimary: '#FFFFFF',
    textSecondary: '#8E99AB',
    textTertiary: '#505C6F',
    userMessage: '#00E676',
    aiMessage: '#1C2333',
    border: '#1C2333',
};

const CATEGORY_INFO = {
    symptom: { label: 'Symptom', icon: 'medkit', color: '#FF6B6B' },
    dietary: { label: 'Dietary', icon: 'restaurant', color: '#4ECDC4' },
    trigger: { label: 'Trigger', icon: 'warning', color: '#FFE66D' },
    general: { label: 'Not Saved', icon: 'close-circle', color: '#8E99AB' },
};

// Simple Category Badges Component (no dropdown, just display)
const CategoryBadges = ({ categories, saved, justSaved }) => {
    const borderAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (justSaved && saved) {
            Animated.sequence([
                Animated.timing(borderAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: false,
                }),
                Animated.delay(1400),
                Animated.timing(borderAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: false,
                }),
            ]).start();
        }
    }, [justSaved]);

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(0, 230, 118, 0)', 'rgba(0, 230, 118, 1)'],
    });

    if (!categories || categories.length === 0) return null;

    return (
        <Animated.View style={[
            { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
            saved && { borderColor, borderWidth: 2, borderRadius: 12, padding: 6, borderStyle: 'dashed' }
        ]}>
            {categories.map((category, index) => {
                const info = CATEGORY_INFO[category] || CATEGORY_INFO.general;
                return (
                    <View key={index} style={styles.categoryBadge}>
                        <Ionicons name={info.icon} size={12} color={info.color} />
                        <Text style={[styles.categoryText, { color: info.color }]}>
                            {info.label}
                        </Text>
                    </View>
                );
            })}
        </Animated.View>
    );
};

// Animated Typing Dots Component
const TypingDots = () => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = (dot, delay) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, {
                        toValue: -8,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        animate(dot1, 0);
        animate(dot2, 150);
        animate(dot3, 300);
    }, []);

    return (
        <View style={styles.typingDotsContainer}>
            <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
            <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
            <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
        </View>
    );
};

export default function ChatUI({ navigation }) {
    const [messages, setMessages] = useState([
        {
            id: '1',
            text: 'Hi! I\'m your digestive health assistant. How are you feeling today? Feel free to share any stomach issues or digestive concerns you\'re experiencing.',
            isUser: false,
            timestamp: new Date(),
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [categorizations, setCategorizations] = useState({}); // messageId -> categorization
    const flatListRef = useRef(null);

    // Load messages from storage on mount
    useEffect(() => {
        loadMessages();
    }, []);

    // Save messages whenever they change
    useEffect(() => {
        saveMessages();
    }, [messages]);

    const loadMessages = async () => {
        try {
            const savedMessages = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
            if (savedMessages) {
                const parsed = JSON.parse(savedMessages);
                // Convert timestamp strings back to Date objects
                const messagesWithDates = parsed.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
                setMessages(messagesWithDates);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const saveMessages = async () => {
        try {
            await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
        } catch (error) {
            console.error('Error saving messages:', error);
        }
    };

    const clearChat = async () => {
        try {
            await AsyncStorage.removeItem(CHAT_STORAGE_KEY);
            setMessages([
                {
                    id: '1',
                    text: 'Hi! I\'m your digestive health assistant. How are you feeling today? Feel free to share any stomach issues or digestive concerns you\'re experiencing.',
                    isUser: false,
                    timestamp: new Date(),
                },
            ]);
            setCategorizations({});
        } catch (error) {
            console.error('Error clearing chat:', error);
        }
    };

    const handleManualCategoryChange = async (messageId, messageText, newCategory) => {
        console.log(`User wants to change to: ${newCategory}`);

        // Ask AI to validate if this makes sense
        try {
            const validation = await categorizeMessage(
                `VALIDATE: Does it make sense to categorize "${messageText}" as "${newCategory}"? If yes, categorize it as ${newCategory}. If no, use the original best category.`,
                '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'
            );

            console.log('Validation result:', validation);

            // Check if AI agreed with the change
            if (validation.category === newCategory) {
                // AI agrees - save with new category
                await saveTrackingEntry({
                    message: messageText,
                    isUser: true,
                    category: newCategory,
                    foodCategory: validation.foodCategory,
                    keywords: validation.keywords,
                    summary: validation.summary,
                });

                // Update categorization with animation
                setCategorizations(prev => ({
                    ...prev,
                    [messageId]: {
                        ...validation,
                        saved: true,
                        justSaved: true,
                    }
                }));

                // Remove animation after 2 seconds
                setTimeout(() => {
                    setCategorizations(prev => ({
                        ...prev,
                        [messageId]: {
                            ...prev[messageId],
                            justSaved: false,
                        }
                    }));
                }, 2000);

                console.log(`✅ Changed to ${newCategory} and saved`);
            } else {
                // AI disagreed - keep original
                console.log(`❌ AI disagreed, keeping original: ${validation.category}`);
                Alert.alert(
                    'Invalid Category',
                    `This message doesn't fit the "${newCategory}" category. Keeping as "${validation.category}".`,
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Error validating category change:', error);
        }
    };

    const sendMessage = async () => {
        if (inputText.trim() === '' || isLoading) return;

        const userMessage = {
            id: Date.now().toString(),
            text: inputText,
            isUser: true,
            timestamp: new Date(),
        };

        const userMessageText = inputText;
        setMessages((prev) => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        // Create AI message placeholder
        const aiMessageId = (Date.now() + 1).toString();
        const aiMessage = {
            id: aiMessageId,
            text: '',
            isUser: false,
            timestamp: new Date(),
            isStreaming: true,
        };
        setMessages((prev) => [...prev, aiMessage]);

        try {
            const groqMessages = formatMessagesForGroq([...messages, userMessage]);

            // Get AI response
            let aiResponseText = '';
            await sendMessageToGroq(groqMessages, (streamedText) => {
                aiResponseText = streamedText;
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === aiMessageId
                            ? { ...msg, text: streamedText, isStreaming: false }
                            : msg
                    )
                );
            });

            // Categorize user message - MULTI-CATEGORY SUPPORT
            categorizeMessage(userMessageText, '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')
                .then(async categorization => {
                    console.log('User message categorized:', categorization);

                    // Handle MULTIPLE categories
                    const categories = categorization.categories || [];
                    const shouldSave = categories.length > 0 && !categories.includes('general');

                    if (shouldSave) {
                        setCategorizations(prev => ({
                            ...prev,
                            [aiMessageId]: {
                                categories: categories,
                                summaries: categorization.summaries,
                                saved: true,
                                justSaved: true,
                            }
                        }));

                        setTimeout(() => {
                            setCategorizations(prev => ({
                                ...prev,
                                [aiMessageId]: {
                                    ...prev[aiMessageId],
                                    justSaved: false,
                                }
                            }));
                        }, 2000);

                        // Save each category
                        try {
                            for (const category of categories) {
                                const summary = categorization.summaries[category] || userMessageText.substring(0, 80);

                                await saveTrackingEntry({
                                    message: userMessageText,
                                    isUser: true,
                                    category: category,
                                    foodCategory: category === 'dietary' ? categorization.foodCategory : null,
                                    keywords: categorization.keywords,
                                    summary: summary,
                                });
                                console.log('✅ Saved:', category, summary);
                            }

                            // If trigger with extracted symptom, save symptom (if not already in categories)
                            if (categories.includes('trigger') && categorization.extractedSymptom && !categories.includes('symptom')) {
                                await saveTrackingEntry({
                                    message: userMessageText,
                                    isUser: true,
                                    category: 'symptom',
                                    foodCategory: null,
                                    keywords: [categorization.extractedSymptom],
                                    summary: `Experiencing ${categorization.extractedSymptom}`,
                                });
                                console.log('✅ Also saved extracted symptom:', categorization.extractedSymptom);
                            }
                        } catch (saveError) {
                            console.error('❌ SAVE FAILED:', saveError);
                        }
                    } else {
                        // General message - not saved
                        setCategorizations(prev => ({
                            ...prev,
                            [aiMessageId]: {
                                categories: ['general'],
                                summaries: { general: 'Not saved' },
                                saved: false,
                                justSaved: false,
                            }
                        }));
                    }
                })
                .catch(err => console.error('Tracking error:', err));

        } catch (error) {
            console.error('Error:', error);
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === aiMessageId
                        ? { ...msg, text: 'Sorry, an error occurred. Please try again.', isStreaming: false }
                        : msg
                )
            );
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessage = ({ item }) => {
        const categorization = categorizations[item.id];

        return (
            <View style={[styles.messageContainer, item.isUser && styles.userMessageContainer]}>
                {!item.isUser && (
                    <View style={styles.aiAvatarContainer}>
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.accent]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.aiAvatar}
                        >
                            <Ionicons name="flash" size={16} color={COLORS.background} />
                        </LinearGradient>
                    </View>
                )}
                <View style={[styles.messageBubble, item.isUser ? styles.userBubble : styles.aiBubble]}>
                    {item.isStreaming && item.text === '' ? (
                        <TypingDots />
                    ) : (
                        <>
                            <Text style={[styles.messageText, item.isUser && styles.userMessageText]}>
                                {item.text}
                            </Text>

                            {!item.isUser && categorization && (
                                <CategoryBadges
                                    categories={categorization.categories || []}
                                    saved={categorization.saved}
                                    justSaved={categorization.justSaved}
                                />
                            )}
                        </>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

            <SideNav
                visible={sidebarVisible}
                onClose={() => setSidebarVisible(false)}
                navigation={navigation}
            />

            <SafeAreaView style={styles.chatArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={0}
                >
                    {/* Floating Header - Positioned Absolutely */}
                    <View style={styles.floatingHeader}>
                        <TouchableOpacity
                            onPress={() => {
                                Keyboard.dismiss();
                                setSidebarVisible(true);
                            }}
                            style={styles.iconButton}
                        >
                            <Ionicons name="menu" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>

                        <View style={styles.headerCenter}>
                            <Text style={styles.headerTitle}>DigestiGo</Text>
                            <View style={styles.headerDot} />
                        </View>

                        <TouchableOpacity onPress={clearChat} style={styles.iconButton}>
                            <Ionicons name="trash-outline" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item.id}
                        style={styles.messageList}
                        contentContainerStyle={styles.messageListContent}
                        showsVerticalScrollIndicator={false}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    />

                    <View style={styles.inputContainer}>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="Message MediApp..."
                                placeholderTextColor={COLORS.textTertiary}
                                keyboardAppearance="dark"
                                multiline
                                maxLength={2000}
                                editable={!isLoading}
                            />
                            <TouchableOpacity
                                style={styles.sendButton}
                                onPress={sendMessage}
                                disabled={inputText.trim() === '' || isLoading}
                                activeOpacity={0.7}
                            >
                                <LinearGradient
                                    colors={inputText.trim() && !isLoading ? [COLORS.primary, COLORS.accent] : [COLORS.surfaceLight, COLORS.surfaceLight]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.sendGradient}
                                >
                                    <Ionicons
                                        name="arrow-up"
                                        size={20}
                                        color={inputText.trim() && !isLoading ? COLORS.background : COLORS.textTertiary}
                                    />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    chatArea: {
        flex: 1,
    },
    floatingHeader: {
        position: 'absolute',
        top: 0,
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
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
        letterSpacing: -0.3,
    },
    headerDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
    },
    messageList: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    messageListContent: {
        paddingTop: 80,
        paddingBottom: 24,
        paddingHorizontal: 16,
    },
    messageContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-start',
    },
    userMessageContainer: {
        justifyContent: 'flex-end',
    },
    aiAvatarContainer: {
        marginRight: 8,
        marginTop: 4,
    },
    aiAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageBubble: {
        maxWidth: '75%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        minHeight: 44,
        justifyContent: 'center',
    },
    userBubble: {
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        backgroundColor: COLORS.aiMessage,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
        color: 'white',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontWeight: 'bold',
    },
    userMessageText: {
        color: COLORS.background,
        fontWeight: '500',
    },
    typingDotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
    },
    inputContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: 24,
        paddingLeft: 16,
        paddingRight: 4,
        paddingVertical: 4,
        gap: 8,
    },
    input: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: 15,
        paddingVertical: 10,
        maxHeight: 100,
    },
    sendButton: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    sendGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Category Badge Styles
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    categoryText: {
        fontSize: 11,
        fontWeight: '600',
    },
});