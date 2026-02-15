// Groq API Service
const GROQ_API_KEY = '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'; // Your Groq API key
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// System prompt for digestive health assistant
const SYSTEM_PROMPT = `You are MediApp AI, a helpful and empathetic digestive health assistant.

CRITICAL: Keep responses SHORT and conversational (2-4 sentences max). Be concise and friendly.

Your role:
1. Show empathy briefly ("That sounds uncomfortable" or "I understand")
2. Give ONE potential cause
3. Suggest ONE practical tip
4. Only mention seeing a doctor if it's serious

Example good responses:
- "That sounds uncomfortable. Pizza is often high in fat and dairy, which can slow digestion. Try smaller portions and see if that helps!"
- "I understand that's frustrating. Bloating after meals is often from eating too quickly. Try chewing slowly and avoiding carbonated drinks."
- "Spicy food can irritate your stomach lining. Consider milder foods and drink plenty of water. If it persists, see a doctor."

BAD responses (too long):
- Multiple paragraphs
- Lists of many suggestions
- Excessive disclaimers

Keep it natural, brief, and helpful. You're an AI assistant, not a doctor.`;

const sendMessageToGroq = async (messages, onChunk) => {
    try {
        // Add system prompt to the beginning of messages
        const messagesWithSystem = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages
        ];

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: messagesWithSystem,
                temperature: 0.7,
                max_tokens: 200, // Reduced to force shorter responses
                top_p: 1,
                stream: false,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Groq API request failed');
        }

        const data = await response.json();
        const fullText = data.choices[0].message.content;

        // Simulate streaming by showing text progressively
        if (onChunk) {
            let currentText = '';
            const words = fullText.split(' ');

            for (let i = 0; i < words.length; i++) {
                currentText += (i === 0 ? '' : ' ') + words[i];
                onChunk(currentText);
                await new Promise(resolve => setTimeout(resolve, 30));
            }
        }

        return fullText;
    } catch (error) {
        console.error('Groq API Error:', error);
        throw error;
    }
};

// Convert your message format to Groq's expected format
const formatMessagesForGroq = (messageHistory) => {
    return messageHistory.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text,
    }));
};

export { sendMessageToGroq, formatMessagesForGroq };