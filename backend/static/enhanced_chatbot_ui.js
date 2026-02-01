// Enhanced Chatbot with Voice Assistant and Multi-Language Support
// Add this to app.js to replace the existing chatbot case

case 'chat':
// Load supported languages
const languages = await loadLanguages();

content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2>🤖 AI Farming Assistant</h2>
            <div style="display: flex; gap: 10px; align-items: center;">
                <select id="chat-language" style="padding: 8px; border-radius: 8px; border: 2px solid #e5e7eb;">
                    ${Object.entries(languages).map(([code, name]) =>
    `<option value="${code}">${name}</option>`
).join('')}
                </select>
                <button id="voice-toggle" onclick="toggleVoiceOutput()" style="padding: 8px 12px; border-radius: 8px; border: none; background: #f3f4f6; cursor: pointer;" title="Toggle voice output">
                    🔊
                </button>
            </div>
        </div>
        
        <div id="chat-messages" style="height: 400px; overflow-y: auto; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px; background: #f9fafb;">
            <div class="bot-message" style="margin-bottom: 15px; text-align: left;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 16px; border-radius: 12px 12px 12px 0; display: inline-block; max-width: 80%;">
                    <strong>🤖 Assistant:</strong> Hello! I'm your AI farming assistant. Ask me anything about crops, pests, soil, or farming techniques!
                </div>
            </div>
        </div>
        
        <div style="display: flex; gap: 10px;">
            <input type="text" id="chat-input" placeholder="Type your question..." style="flex: 1; padding: 12px; border-radius: 8px; border: 2px solid #e5e7eb;" onkeypress="if(event.key==='Enter') sendChatMessage()">
            <button onclick="startVoiceInput()" style="padding: 12px 20px; border-radius: 8px; border: none; background: #ef4444; color: white; cursor: pointer; font-size: 18px;" title="Voice input">
                🎤
            </button>
            <button onclick="sendChatMessage()" class="btn-primary" style="padding: 12px 24px;">Send</button>
        </div>
        
        <div id="voice-status" style="margin-top: 10px; text-align: center; color: #666; font-size: 14px;"></div>
    `;

// Initialize voice features
initializeVoiceFeatures();
break;

// Voice and Multi-Language Functions

let voiceOutputEnabled = false;
let recognition = null;
let synthesis = window.speechSynthesis;

async function loadLanguages() {
    try {
        const response = await fetch(`${API_URL}/languages`);
        const data = await response.json();
        return data.languages || { 'en': 'English' };
    } catch (error) {
        return { 'en': 'English', 'hi': 'हिंदी', 'ta': 'தமிழ்', 'te': 'తెలుగు' };
    }
}

function initializeVoiceFeatures() {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('chat-input').value = transcript;
            document.getElementById('voice-status').textContent = '';
            sendChatMessage();
        };

        recognition.onerror = (event) => {
            document.getElementById('voice-status').textContent = '❌ Voice input error';
            console.error('Speech recognition error:', event.error);
        };

        recognition.onend = () => {
            document.getElementById('voice-status').textContent = '';
        };
    }
}

function startVoiceInput() {
    if (!recognition) {
        showToast('Voice input not supported in this browser', 'error');
        return;
    }

    const lang = document.getElementById('chat-language').value;
    recognition.lang = lang === 'en' ? 'en-US' :
        lang === 'hi' ? 'hi-IN' :
            lang === 'ta' ? 'ta-IN' :
                lang === 'te' ? 'te-IN' :
                    lang === 'kn' ? 'kn-IN' :
                        lang === 'ml' ? 'ml-IN' : 'en-US';

    document.getElementById('voice-status').textContent = '🎤 Listening...';
    recognition.start();
}

function toggleVoiceOutput() {
    voiceOutputEnabled = !voiceOutputEnabled;
    const button = document.getElementById('voice-toggle');
    button.textContent = voiceOutputEnabled ? '🔊' : '🔇';
    button.style.background = voiceOutputEnabled ? '#22c55e' : '#f3f4f6';
    showToast(voiceOutputEnabled ? 'Voice output enabled' : 'Voice output disabled', 'success');
}

function speakText(text, lang = 'en') {
    if (!voiceOutputEnabled || !synthesis) return;

    // Cancel any ongoing speech
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'en' ? 'en-US' :
        lang === 'hi' ? 'hi-IN' :
            lang === 'ta' ? 'ta-IN' :
                lang === 'te' ? 'te-IN' : 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    synthesis.speak(utterance);
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    const lang = document.getElementById('chat-language').value;

    if (!message) return;

    // Add user message to chat
    addMessageToChat(message, 'user');
    input.value = '';

    // Show typing indicator
    const typingId = addTypingIndicator();

    try {
        // Send to chatbot API with language
        const response = await fetch(`${API_URL}/chatbot/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                language: lang
            })
        });

        if (!response.ok) throw new Error('Failed to get response');

        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator(typingId);

        // Add bot response
        addMessageToChat(data.response, 'bot');

        // Speak response if voice output enabled
        speakText(data.response, lang);

    } catch (error) {
        removeTypingIndicator(typingId);
        addMessageToChat('Sorry, I encountered an error. Please try again.', 'bot');
        showToast('Failed to get response', 'error');
    }
}

function addMessageToChat(message, sender) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `${sender}-message`;
    messageDiv.style.marginBottom = '15px';
    messageDiv.style.textAlign = sender === 'user' ? 'right' : 'left';

    const bubble = document.createElement('div');
    bubble.style.display = 'inline-block';
    bubble.style.maxWidth = '80%';
    bubble.style.padding = '12px 16px';
    bubble.style.borderRadius = sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0';

    if (sender === 'user') {
        bubble.style.background = '#3b82f6';
        bubble.style.color = 'white';
        bubble.innerHTML = `<strong>You:</strong> ${message}`;
    } else {
        bubble.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        bubble.style.color = 'white';
        bubble.innerHTML = `<strong>🤖 Assistant:</strong> ${message}`;
    }

    messageDiv.appendChild(bubble);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addTypingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    const typingDiv = document.createElement('div');
    const id = 'typing-' + Date.now();
    typingDiv.id = id;
    typingDiv.style.marginBottom = '15px';
    typingDiv.innerHTML = `
        <div style="display: inline-block; background: #e5e7eb; padding: 12px 16px; border-radius: 12px 12px 12px 0;">
            <span style="color: #666;">🤖 Typing</span>
            <span class="typing-dots">...</span>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const element = document.getElementById(id);
    if (element) element.remove();
}
