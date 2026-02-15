import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@digestigo_tracking_data';

// Categories for tracking
export const CATEGORIES = {
    SYMPTOM: 'symptom',
    DIETARY: 'dietary',
    TRIGGER: 'trigger',
    GENERAL: 'general', // For non-health related chat
};

// Food categories for dietary tracking
export const FOOD_CATEGORIES = {
    CARBS: 'carbs',
    PROTEINS: 'proteins',
    DAIRY: 'dairy',
    FIBRE: 'fibre',
};

// AI categorization prompt
const CATEGORIZATION_PROMPT = `Analyze this message and categorize it. Return ONLY valid JSON, no markdown.

CRITICAL RULES:
1. A message can belong to MULTIPLE categories - return ALL that apply
2. Summaries must be UNIQUE and DESCRIPTIVE (max 15 words)
3. NO duplicates - make each summary distinct

Required JSON format:
{"categories":["category1","category2"],"foodCategory":null,"keywords":["word1"],"summaries":{"category1":"unique summary 1","category2":"unique summary 2"},"extractedSymptom":null}

CATEGORY LOGIC - A MESSAGE CAN BE MULTIPLE:

1. dietary: User CONSUMED food/drink
   - "I ate pizza" = dietary
   - "I drank milk" = dietary
   - Track in foodCategory: carbs/proteins/dairy/fibre

2. trigger: Food/activity CAUSES a symptom (cause-effect relationship)
   - "Pizza makes me bloated" = trigger + dietary
   - "I ate spicy food and got diarrhea" = trigger + dietary
   - "Spaghetti triggers bloating" = trigger + dietary
   - Summary: "[Food] may trigger [symptom] - watch out"
   - MUST extract symptom to extractedSymptom field

3. symptom: ONLY if describing feeling WITHOUT mentioning cause
   - "I feel bloated" = symptom only
   - "My stomach hurts" = symptom only
   - "I have diarrhea" = symptom only
   - NOT for: "Pizza made me bloated" (that's trigger+dietary)

4. general: Greetings, questions, opinions without health info

EXAMPLES:
Message: "I ate pizza and got bloated"
→ {"categories":["dietary","trigger"],"foodCategory":"carbs","keywords":["pizza","bloating"],"summaries":{"dietary":"Ate pizza","trigger":"Pizza may trigger bloating - watch out"},"extractedSymptom":"bloating"}

Message: "Spicy food gives me diarrhea"  
→ {"categories":["trigger"],"foodCategory":null,"keywords":["spicy","diarrhea"],"summaries":{"trigger":"Spicy food may trigger diarrhea - watch out"},"extractedSymptom":"diarrhea"}

Message: "I feel bloated"
→ {"categories":["symptom"],"foodCategory":null,"keywords":["bloated"],"summaries":{"symptom":"Experiencing bloating"},"extractedSymptom":null}

Message: "I ate bread"
→ {"categories":["dietary"],"foodCategory":"carbs","keywords":["bread"],"summaries":{"dietary":"Ate bread"},"extractedSymptom":null}

Message: `;

export const categorizeMessage = async (message, groqApiKey) => {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqApiKey}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a categorization assistant. Messages can have MULTIPLE categories. Return valid JSON only. Make summaries unique and descriptive. For triggers, extract symptom to extractedSymptom field.'
                    },
                    {
                        role: 'user',
                        content: CATEGORIZATION_PROMPT + message.substring(0, 500)
                    }
                ],
                temperature: 0.15,
                max_tokens: 200,
            }),
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        let content = data.choices[0].message.content.trim();

        // Remove markdown code blocks if present
        content = content.replace(/```json\n?/g, '');
        content = content.replace(/```\n?/g, '');
        content = content.replace(/`/g, '');
        content = content.trim();

        console.log('Categorization response:', content);

        // Try to parse JSON
        const result = JSON.parse(content);

        // Validate categories array
        const categories = Array.isArray(result.categories) ? result.categories : [result.category || CATEGORIES.GENERAL];

        // Build summaries object
        const summaries = result.summaries || {};

        // Fallback if no summaries provided
        if (Object.keys(summaries).length === 0) {
            categories.forEach(cat => {
                summaries[cat] = result.summary || message.substring(0, 80);
            });
        }

        // Return multi-category result
        return {
            categories: categories,
            foodCategory: result.foodCategory || null,
            keywords: Array.isArray(result.keywords) ? result.keywords.slice(0, 5) : [],
            summaries: summaries,
            extractedSymptom: result.extractedSymptom || null,
        };
    } catch (error) {
        console.error('Categorization error:', error);
        console.log('Failed message:', message.substring(0, 100));

        // Return default categorization on error
        return {
            categories: [CATEGORIES.GENERAL],
            foodCategory: null,
            keywords: [],
            summaries: { general: message.substring(0, 77) + (message.length > 77 ? '...' : '') },
            extractedSymptom: null,
        };
    }
};

export const saveTrackingEntry = async (entry) => {
    try {
        const existingData = await getTrackingData();

        // Check for duplicates - skip if same summary exists in same category
        const isDuplicate = existingData.some(existing =>
            existing.category === entry.category &&
            existing.summary === entry.summary
        );

        if (isDuplicate) {
            console.log('⏭️  Skipping duplicate:', entry.category, entry.summary);
            return null;
        }

        const newEntry = {
            id: Date.now().toString() + Math.random(),
            timestamp: new Date().toISOString(),
            ...entry,
        };

        existingData.push(newEntry);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));
        console.log('💾 Saved new entry:', entry.category, entry.summary);
        return newEntry;
    } catch (error) {
        console.error('Error saving tracking entry:', error);
        throw error;
    }
};

export const getTrackingData = async () => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting tracking data:', error);
        return [];
    }
};

export const clearTrackingData = async () => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Error clearing tracking data:', error);
    }
};

export const getTrackingSummary = async () => {
    try {
        const data = await getTrackingData();

        // Group symptoms
        const symptoms = data
            .filter(entry => entry.category === CATEGORIES.SYMPTOM)
            .map(entry => ({
                summary: entry.summary,
                keywords: entry.keywords,
                timestamp: entry.timestamp,
            }));

        // Group dietary data for pie chart
        const dietary = {
            carbs: 0,
            proteins: 0,
            dairy: 0,
            fibre: 0,
        };

        data
            .filter(entry => entry.category === CATEGORIES.DIETARY && entry.foodCategory)
            .forEach(entry => {
                if (dietary.hasOwnProperty(entry.foodCategory)) {
                    dietary[entry.foodCategory]++;
                }
            });

        // Group triggers
        const triggers = data
            .filter(entry => entry.category === CATEGORIES.TRIGGER)
            .map(entry => ({
                summary: entry.summary,
                keywords: entry.keywords,
                timestamp: entry.timestamp,
            }));

        return {
            symptoms,
            dietary,
            triggers,
            totalEntries: data.length,
        };
    } catch (error) {
        console.error('Error getting tracking summary:', error);
        return {
            symptoms: [],
            dietary: { carbs: 0, proteins: 0, dairy: 0, fibre: 0 },
            triggers: [],
            totalEntries: 0,
        };
    }
};