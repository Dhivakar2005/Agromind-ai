// Global state
let currentUser = null;
let token = localStorage.getItem('token');

// API Base URL
const API_URL = '/api/v1';

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// Initialize App: Restore Session
document.addEventListener('DOMContentLoaded', () => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
        token = storedToken;
        loadUserInfo(); // This will fetch user details and update UI
        showPage('app-page');
    } else {
        showPage('landing-page');
    }
});

// Show page
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');

    // Load data for specific pages
    if (pageId === 'app-page') {
        loadUserInfo();
    } else if (pageId === 'community-page') {
        loadPosts();
    }
}

// Handle Signup
async function handleSignup(event) {
    event.preventDefault();

    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const full_name = document.getElementById('signup-fullname').value || null;

    try {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, full_name })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Signup failed');
        }

        const data = await response.json();
        token = data.token;
        currentUser = data.user;
        localStorage.setItem('token', token);

        showToast('Account created successfully!', 'success');
        showPage('app-page');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Handle Signin
async function handleSignin(event) {
    event.preventDefault();

    const email = document.getElementById('signin-email').value;  // Already using email input
    const password = document.getElementById('signin-password').value;

    try {
        const response = await fetch(`${API_URL}/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })  // Send email, not username
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Signin failed');
        }

        const data = await response.json();
        token = data.token;
        currentUser = data.user;
        localStorage.setItem('token', token);

        showToast('Welcome back!', 'success');
        showPage('app-page');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Handle Signout
function handleSignout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    showToast('Signed out successfully', 'success');
    showPage('landing-page');
}

// Load user info
async function loadUserInfo() {
    if (!token) {
        document.getElementById('user-name').textContent = 'Guest';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            document.getElementById('user-name').textContent = user.username;
        } else {
            document.getElementById('user-name').textContent = 'Guest';
        }
    } catch (error) {
        document.getElementById('user-name').textContent = 'Guest';
    }
}

// Show feature
function showFeature(feature) {
    const content = document.getElementById('feature-content');

    if (!token) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h2>🔒 Sign In Required</h2>
                <p style="margin: 20px 0;">Please sign in to use this feature</p>
                <button onclick="showPage('signin-page')" class="btn-primary">Sign In</button>
            </div>
        `;
        return;
    }

    switch (feature) {
        case 'voice':
            content.innerHTML = `
                <div class="glass-panel" style="padding: 24px;">
                    <div class="flex calculate-header mb-4" style="justify-content: space-between; align-items: center;">
                        <h2>🤖 AI Farming Assistant</h2>
                        <div class="flex gap-2">
                            <select id="chat-language">
                                <option value="en">English</option>
                                <option value="hi">हिंदी (Hindi)</option>
                                <option value="ta">தமிழ் (Tamil)</option>
                                <option value="te">తెలుగు (Telugu)</option>
                                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                                <option value="ml">മലയാളം (Malayalam)</option>
                            </select>
                            <button id="voice-toggle" onclick="toggleVoiceOutput()" class="btn-secondary btn-icon" title="Toggle voice">
                                🔊
                            </button>
                        </div>
                    </div>
                    
                    <div id="chat-messages" class="chat-window mb-4">
                        <div class="message bot">
                            <strong>🤖 Assistant:</strong> Hello! I'm your AI farming assistant. Ask me anything about crops, pests, soil, or farming techniques!
                        </div>
                    </div>
                    
                    <div class="chat-controls flex gap-2">
                        <input type="text" id="chat-input" placeholder="Type your question..." onkeypress="if(event.key==='Enter') sendChatMessage()">
                        
                        <input type="file" id="document-upload" accept="image/*" style="display: none;" onchange="uploadDocument()">
                        <button onclick="document.getElementById('document-upload').click()" class="btn-secondary btn-icon" title="Upload document">
                            📄
                        </button>
                        
                        <button onclick="startVoiceInput()" class="btn-danger btn-icon" title="Voice input">
                            🎤
                        </button>
                        
                        <button onclick="sendChatMessage()" class="btn-primary">Send</button>
                    </div>
                    
                    <div id="voice-status" class="text-center mt-4 text-muted" style="font-size: 0.9rem;"></div>
                </div>
            `;

            // Initialize voice features
            if (typeof initializeVoiceFeatures === 'function') {
                initializeVoiceFeatures();
            }
            break;
        case 'pest':
            content.innerHTML = `
                <div class="glass-panel" style="padding: 2rem; max-width: 600px; margin: 0 auto; text-align: center;">
                    <h2>🔍 Detect Disease & Pest</h2>
                    <div class="upload-section mt-4">
                        <p class="text-muted mb-4">Upload a clear photo of the affected plant leaf, stem, or fruit.</p>
                        
                        <div style="border: 2px dashed var(--glass-border); border-radius: 12px; padding: 40px; margin-bottom: 20px; cursor: pointer;" onclick="document.getElementById('pest-upload').click()">
                            <div style="font-size: 40px; margin-bottom: 10px;">📸</div>
                            <p>Click to upload photo</p>
                        </div>
                        <input type="file" id="pest-upload" accept="image/*" onchange="previewPestImage(event)" style="display: none;">
                        
                        <div id="pest-preview" class="mb-4"></div>
                        <button onclick="analyzePestImage()" class="btn-primary w-100">Analyze Health</button>
                        <div id="pest-result" class="result-box" style="display: none;"></div>
                    </div>
                </div>
            `;
            break;
        case 'crop':
            content.innerHTML = `
                <div class="glass-panel" style="padding: 2.5rem; max-width: 800px; margin: 0 auto;">
                    <div class="text-center mb-4">
                        <h2>🌾 Crop Recommendations</h2>
                        <p class="text-muted">Get AI-powered recommendations for your specific conditions</p>
                    </div>
                    
                    <div class="grid-2">
                        <div>
                            <label>Soil Type</label>
                            <select id="soil-type">
                                <option value="clay">Clay Soil</option>
                                <option value="sandy">Sandy Soil</option>
                                <option value="loamy" selected>Loamy Soil</option>
                                <option value="black">Black Soil</option>
                            </select>
                        </div>
                        
                        <div>
                            <label>Season</label>
                            <select id="season">
                                <option value="kharif">Kharif (Monsoon)</option>
                                <option value="rabi">Rabi (Winter)</option>
                                <option value="zaid">Zaid (Summer)</option>
                            </select>
                        </div>
                        
                        <div>
                            <label>Region/State</label>
                            <input type="text" id="region" placeholder="e.g., Tamil Nadu">
                        </div>
                        
                        <div>
                            <label>Avg Temperature (°C)</label>
                            <input type="number" id="temperature" placeholder="e.g., 28" min="10" max="45">
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <label>Soil pH (Optional)</label>
                        <input type="number" id="soil-ph" placeholder="Default: 6.5" min="4" max="9" step="0.1">
                    </div>
                    
                    <button onclick="getCropRecommendations()" class="btn-primary w-100 mt-4">Get Recommendation</button>
                    <div id="crop-result" class="mt-4"></div>
                </div>
            `;
            break;
    }
}

// Chat functionality
function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');
    const question = input.value.trim();

    if (!question) return;

    // Add user message
    messages.innerHTML += `
        <div class="message user">
            <strong>You:</strong> ${question}
        </div>
    `;

    input.value = '';

    // Simulate bot response
    setTimeout(() => {
        const responses = {
            'pest': 'For pest control, I recommend using neem oil spray or introducing beneficial insects like ladybugs. Avoid chemical pesticides if possible.',
            'water': 'Drip irrigation is most efficient. Water early morning or evening to reduce evaporation. Check soil moisture before watering.',
            'fertilizer': 'Use organic compost and rotate crops. NPK ratio depends on your crop - vegetables need 10-10-10, while flowering plants need higher phosphorus.',
            'crop': 'Based on your region, consider crops like rice, wheat, or pulses. Soil testing will give you the best recommendations.',
            'default': 'That\'s a great question! For specific farming advice, consider: 1) Test your soil, 2) Check local weather patterns, 3) Consult with nearby successful farmers. What specific crop are you interested in?'
        };

        let response = responses.default;
        for (let key in responses) {
            if (question.toLowerCase().includes(key)) {
                response = responses[key];
                break;
            }
        }

        messages.innerHTML += `
            <div class="message bot">
                <strong>🤖 Bot:</strong> ${response}
            </div>
        `;
        messages.scrollTop = messages.scrollHeight;
    }, 500);
}

// Image preview
function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 300px; border-radius: 8px;">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Pest image analysis - REAL ML MODEL
async function analyzePestImage() {
    const fileInput = document.getElementById('pest-upload');
    const resultDiv = document.getElementById('pest-result');

    if (!fileInput.files || !fileInput.files[0]) {
        showToast('Please select an image first', 'error');
        return;
    }

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<p>🔍 Analyzing image...</p>';

    try {
        // Create form data with image
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);

        // Call ML API endpoint
        const response = await fetch(`${API_URL}/ml/pest-detection`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to analyze image');
        }

        const result = await response.json();

        // Helper to format text (remove ** and make lists)
        const formatText = (text) => {
            if (!text) return 'No information available';

            // Remove redundant styling chars
            let cleanText = text.replace(/\*\*/g, '');

            // Split numbered lists if present (assumes "1. ", "2. ")
            if (cleanText.includes('1.') || cleanText.includes('1 ')) {
                // Try to split by numbers followed by dot or space
                const parts = cleanText.split(/\d+[\.\)]\s+/);
                if (parts.length > 1) {
                    return '<ul style="text-align: left; padding-left: 20px; color: var(--text-secondary);">' +
                        parts.filter(t => t.trim().length > 0)
                            .map(item => `<li style="margin-bottom: 8px;">${item.trim()}</li>`).join('') +
                        '</ul>';
                }
            }
            return `<p style="color: var(--text-secondary); text-align: left;">${cleanText}</p>`;
        };

        // Clean up redundant "Detected: " prefix
        const cleanPestName = result.pest.replace(/^Detected:\s*/i, '').replace(/detected:\s*/i, '').replace(/⚠️/g, '').trim();

        resultDiv.innerHTML = `
            <div class="result-card success" style="background: var(--gradient-primary); padding: 30px; margin-top: 20px; box-shadow: var(--shadow-glow);">
                <div class="flex" style="justify-content: space-between; align-items: center;">
                    <div style="text-align: left;">
                        <h3 style="margin: 0; opacity: 0.9; font-size: 1.2rem;">Detection Result</h3>
                        <h2 style="font-size: 2.5rem; margin: 10px 0; font-weight: 800;">${cleanPestName.toUpperCase()}</h2>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 10px 20px; border-radius: 12px; backdrop-filter: blur(4px);">
                        <strong style="font-size: 1.2rem;">${result.confidence.toFixed(1)}% Match</strong>
                    </div>
                </div>
            </div>

            <div class="glass-panel" style="padding: 24px; margin-top: 24px;">
                <h4 style="color: var(--primary); display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
                    <span style="font-size: 1.5rem;">💊</span> Treatment Plan
                </h4>
                <div style="background: rgba(30, 41, 59, 0.4); padding: 20px; border-radius: 12px; margin-bottom: 24px;">
                    ${formatText(result.treatment)}
                </div>

                <h4 style="color: var(--secondary); display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
                    <span style="font-size: 1.5rem;">🛡️</span> Prevention Guide
                </h4>
                <div style="background: rgba(30, 41, 59, 0.4); padding: 20px; border-radius: 12px;">
                    ${formatText(result.prevention)}
                </div>
            </div>
        `;
        showToast('✅ Analysis complete!', 'success');
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="result-card error">
                <h4>❌ ${error.message}</h4>
                <p>Please ensure you have uploaded a valid image of the affected crop or pest.</p>
            </div>
        `;
        showToast('Analysis failed', 'error');
    }
}

// Crop recommendations - REAL ML MODEL
async function getCropRecommendations() {
    const soilType = document.getElementById('soil-type').value;
    const season = document.getElementById('season').value;
    const region = document.getElementById('region').value;
    const customTemp = document.getElementById('temperature').value;
    const customPh = document.getElementById('soil-ph').value;
    const resultDiv = document.getElementById('crop-result');

    resultDiv.innerHTML = '<p>🌾 Analyzing soil and climate data...</p>';

    try {
        // Map soil types and seasons to NPK values
        const soilNPK = {
            'clay': { N: 80, P: 50, K: 40 },
            'sandy': { N: 60, P: 40, K: 35 },
            'loamy': { N: 90, P: 55, K: 45 },
            'black': { N: 85, P: 60, K: 50 }
        };

        const seasonClimate = {
            'kharif': { temperature: 28, humidity: 80, rainfall: 220 },
            'rabi': { temperature: 20, humidity: 65, rainfall: 80 },
            'zaid': { temperature: 32, humidity: 55, rainfall: 50 }
        };

        const npk = soilNPK[soilType] || soilNPK.loamy;
        const climate = seasonClimate[season] || seasonClimate.kharif;

        // Use custom values if provided, otherwise use defaults
        const temperature = customTemp ? parseFloat(customTemp) : climate.temperature;
        const ph = customPh ? parseFloat(customPh) : 6.5;

        // Call ML API endpoint
        const response = await fetch(`${API_URL}/ml/crop-recommendation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                N: npk.N,
                P: npk.P,
                K: npk.K,
                temperature: temperature,
                humidity: climate.humidity,
                ph: ph,
                rainfall: climate.rainfall
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get recommendations');
        }

        const result = await response.json();

        // Get crop-specific information
        const cropInfo = getCropInfo(result.crop);

        resultDiv.innerHTML = `
            <div class="result-card success" style="background: var(--gradient-primary); text-align: left; padding: 30px; box-shadow: var(--shadow-glow);">
                <div class="flex" style="justify-content: space-between; align-items: center;">
                    <div>
                        <h2 style="margin: 0; font-size: 1.5rem; opacity: 0.9;">Recommended Crop</h2>
                        <h3 style="margin: 5px 0 0 0; font-size: 3rem; font-weight: 800;">${result.crop.toUpperCase()}</h3>
                    </div>
                    <div style="text-align: right; background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 12px; backdrop-filter: blur(4px);">
                        <span style="font-size: 0.9rem; display: block;">Confidence</span>
                        <strong style="font-size: 1.5rem;">${result.confidence.toFixed(1)}%</strong>
                    </div>
                </div>
            </div>

            <div class="glass-panel" style="padding: 24px; margin-top: 24px;">
                <h4 style="color: var(--primary); margin-bottom: 20px;">📊 Analysis Details</h4>
                <div class="grid-2">
                    <div class="p-3" style="background: rgba(30, 41, 59, 0.4); border-radius: 12px;">
                        <p class="text-muted text-sm">Soil Type</p>
                        <p class="font-bold">${soilType.charAt(0).toUpperCase() + soilType.slice(1)}</p>
                    </div>
                    <div class="p-3" style="background: rgba(30, 41, 59, 0.4); border-radius: 12px;">
                        <p class="text-muted text-sm">Season</p>
                        <p class="font-bold">${season.charAt(0).toUpperCase() + season.slice(1)}</p>
                    </div>
                    <div class="p-3" style="background: rgba(30, 41, 59, 0.4); border-radius: 12px;">
                        <p class="text-muted text-sm">Region</p>
                        <p class="font-bold">${region || 'General'}</p>
                    </div>
                    <div class="p-3" style="background: rgba(30, 41, 59, 0.4); border-radius: 12px;">
                        <p class="text-muted text-sm">Climate</p>
                        <p class="font-bold">${temperature}°C, ${climate.rainfall}mm</p>
                    </div>
                </div>

                <h4 style="color: var(--primary); margin: 30px 0 20px 0;">🌱 Crop Information</h4>
                <div style="background: rgba(16, 185, 129, 0.05); padding: 20px; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.2);">
                    <div class="flex" style="justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
                        <strong>Expected Yield:</strong> 
                        <span>${cropInfo.yield}</span>
                    </div>
                    <div class="flex" style="justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
                        <strong>Growing Period:</strong>
                        <span>${cropInfo.duration}</span>
                    </div>
                    <div class="flex" style="justify-content: space-between;">
                        <strong>Water Requirement:</strong>
                        <span>${cropInfo.water}</span>
                    </div>
                </div>

                <h4 style="color: var(--primary); margin: 30px 0 20px 0;">💡 Recommendations</h4>
                <ul style="padding-left: 20px; color: var(--text-secondary); line-height: 1.8;">
                    <li>Soil nutrients (N:${npk.N}, P:${npk.P}, K:${npk.K}) are well-suited for ${result.crop}</li>
                    <li>Climate conditions (${climate.temperature}°C, ${climate.humidity}% humidity) are optimal</li>
                    <li>Consider soil testing for precise nutrient management</li>
                    <li>Consult local agricultural experts for region-specific practices</li>
                </ul>
            </div>
        `;
        showToast('✅ Recommendation ready!', 'success');
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="glass-panel" style="padding: 20px; border-left: 4px solid var(--danger); background: rgba(239, 68, 68, 0.1);">
                <h4 style="color: var(--danger); margin-top: 0;">❌ Error</h4>
                <p>${error.message}</p>
            </div>
        `;
        showToast('Failed to get recommendations', 'error');
    }
}

// Get crop-specific information
function getCropInfo(cropName) {
    const cropData = {
        'rice': { yield: '45-55 quintals/acre', duration: '120-150 days', water: 'High (1200-1500mm)' },
        'wheat': { yield: '35-45 quintals/acre', duration: '120-140 days', water: 'Medium (450-650mm)' },
        'maize': { yield: '28-35 quintals/acre', duration: '90-120 days', water: 'Medium (500-800mm)' },
        'cotton': { yield: '18-22 quintals/acre', duration: '150-180 days', water: 'Medium (700-1000mm)' },
        'chickpea': { yield: '12-15 quintals/acre', duration: '100-120 days', water: 'Low (300-400mm)' },
        'soybean': { yield: '15-20 quintals/acre', duration: '90-120 days', water: 'Medium (450-700mm)' },
        'sugarcane': { yield: '300-400 quintals/acre', duration: '12-18 months', water: 'High (1500-2500mm)' },
        'groundnut': { yield: '15-25 quintals/acre', duration: '100-150 days', water: 'Medium (500-600mm)' }
    };

    return cropData[cropName.toLowerCase()] || {
        yield: '10-20 quintals/acre',
        duration: '90-120 days',
        water: 'Medium (500-700mm)'
    };
}

// Load posts
async function loadPosts() {
    const container = document.getElementById('posts-container');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⏳</div>
            <h3>Loading discussions...</h3>
        </div>
    `;

    try {
        const response = await fetch(`${API_URL}/community/posts`);
        const data = await response.json();

        if (data.posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🌱</div>
                    <h3>No discussions yet</h3>
                    <p class="text-muted">Be the first to ask a question or share your farming journey!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.posts.map(post => {
            const isOwnPost = currentUser && post.user_id == currentUser.id;
            const deleteBtn = isOwnPost ? `<button onclick="deletePost(${post.id})" class="btn-danger btn-sm" style="padding: 4px 10px; font-size: 0.8rem;">Delete</button>` : '';
            const initial = (post.username || 'U')[0].toUpperCase();

            return `
                <div class="post-card" id="post-${post.id}" onclick="viewPostDetails(${post.id})" style="cursor: pointer;">
                    <div class="post-header">
                        <div class="post-author-info">
                            <div class="user-avatar">${initial}</div>
                            <div class="post-meta">
                                <span class="post-username">${post.username || 'User'}</span>
                                <span class="post-date">${new Date(post.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div class="flex gap-2 items-center">
                            ${post.category ? `<span class="post-tag">#${post.category}</span>` : ''}
                            ${deleteBtn}
                        </div>
                    </div>
                    
                    <div class="post-content">
                        <h3>${post.title}</h3>
                        <p class="post-snippet">${post.content.substring(0, 150)}${post.content.length > 150 ? '...' : ''}</p>
                        ${post.image_url ? `<img src="${post.image_url}" class="post-image" style="height: 200px; object-fit: cover;">` : ''}
                    </div>

                    <div class="post-footer">
                        <button class="btn-secondary btn-sm" style="border: none; background: transparent; padding-left: 0;">
                            💬 ${post.answer_count || 0} Comments
                        </button>
                        <span class="text-primary" style="font-size: 0.9rem; font-weight: 500;">Read Discussion →</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Failed to load posts</h3>
                <p class="text-muted">Please check your connection and try again.</p>
            </div>
        `;
        showToast('Failed to load posts', 'error');
    }
}

// View post details with answers
async function viewPostDetails(postId) {
    const container = document.getElementById('posts-container');
    container.innerHTML = `
         <div class="empty-state">
            <div class="empty-icon">⏳</div>
            <h3>Loading discussion...</h3>
        </div>
    `;

    try {
        const response = await fetch(`${API_URL}/community/posts/${postId}`);
        const post = await response.json();

        const isOwnPost = currentUser && post.user_id == currentUser.id;
        const deleteBtn = isOwnPost ? `<button onclick="deletePost(${post.id})" class="btn-danger">Delete Discussion</button>` : '';
        const initial = (post.username || 'U')[0].toUpperCase();

        const answersHtml = post.answers && post.answers.length > 0
            ? post.answers.map(answer => {
                const isOwnAnswer = currentUser && answer.user_id == currentUser.id;
                const deleteAnswerBtn = isOwnAnswer ? `<button onclick="deleteAnswer(${answer.id})" class="btn-danger btn-sm">Delete</button>` : '';
                const answerInitial = (answer.username || 'U')[0].toUpperCase();

                return `
                    <div class="answer-card">
                        <div class="answer-header">
                            <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.9rem;">${answerInitial}</div>
                            <div class="post-meta">
                                <span class="post-username">${answer.username || 'User'}</span>
                                <span class="post-date">${new Date(answer.created_at).toLocaleDateString()}</span>
                            </div>
                            <div style="margin-left: auto;">
                                ${deleteAnswerBtn}
                            </div>
                        </div>
                        <p style="color: var(--text-primary); line-height: 1.6;">${answer.content}</p>
                    </div>
                `;
            }).join('')
            : `
                <div class="empty-state" style="padding: 30px; border-style: dashed;">
                    <p class="text-muted">No answers yet. Be the first to start the conversation!</p>
                </div>
            `;

        container.innerHTML = `
            <div style="animation: fadeInUp 0.5s ease;">
                <div class="flex justify-between items-center mb-4">
                    <button onclick="loadPosts()" class="btn-secondary">← Back to Feed</button>
                    ${deleteBtn}
                </div>
                
                <div class="glass-panel" style="padding: 40px; margin-bottom: 2rem;">
                    <div class="post-header">
                        <div class="post-author-info">
                            <div class="user-avatar" style="width: 50px; height: 50px; font-size: 1.3rem;">${initial}</div>
                            <div>
                                <h2 style="margin: 0; font-size: 2rem; line-height: 1.2;">${post.title}</h2>
                                <div class="post-meta mt-4" style="flex-direction: row; gap: 15px;">
                                    <span class="post-username">${post.username || 'User'}</span>
                                    <span>•</span>
                                    <span class="post-date">${new Date(post.created_at).toLocaleDateString()}</span>
                                    ${post.category ? `<span>•</span> <span class="post-tag">#${post.category}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    ${post.image_url ? `<img src="${post.image_url}" class="post-image" style="width: 100%; max-height: 500px; object-fit: contain; background: rgba(0,0,0,0.2); border-radius: 12px; margin: 20px 0;">` : ''}
                    
                    <div class="post-content" style="font-size: 1.1rem; line-height: 1.8; color: var(--text-primary);">
                        ${post.content}
                    </div>
                </div>

                <div class="answer-feed">
                    <h3 style="margin-bottom: 20px;">Discussion (${post.answers ? post.answers.length : 0})</h3>
                    ${answersHtml}
                </div>
                
                ${token ? `
                    <div class="glass-panel" style="padding: 24px; margin-top: 24px; position: sticky; bottom: 20px;">
                        <h4 class="mb-2">Join the conversation</h4>
                        <div class="flex gap-2">
                             <textarea id="answer-content" placeholder="Write a helpful answer..." rows="1" style="resize: none; border-radius: 24px; padding-left: 20px;" onfocus="this.rows=4"></textarea>
                             <button onclick="submitAnswer(${post.id})" class="btn-primary btn-icon" style="width: 50px; height: 50px; border-radius: 50%;">➤</button>
                        </div>
                    </div>
                ` : '<div class="glass-panel p-4 text-center mt-4">Sign in to answer</div>'}
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<div class="empty-state"><h3>Failed to load post</h3></div>';
        showToast('Failed to load post', 'error');
    }
}

// Delete answer
// Redundant deleteAnswer removed


// Submit answer
// Submit answer
async function submitAnswer(postId) {
    const content = document.getElementById('answer-content').value.trim();

    if (!content) {
        showToast('Please enter an answer', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/community/posts/${postId}/answers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            throw new Error('Failed to submit answer');
        }

        showToast('Answer submitted!', 'success');
        viewPostDetails(postId); // Reload post to show new answer
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Delete post
async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/community/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete post');
        }

        showToast('Post deleted successfully', 'success');
        loadPosts();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Delete answer
async function deleteAnswer(answerId) {
    if (!confirm('Are you sure you want to delete this answer?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/community/answers/${answerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete answer');
        }

        showToast('Answer deleted successfully', 'success');
        // Reload current post
        const postId = document.querySelector('.post-card, [style*="background: white"]').id?.replace('post-', '') ||
            new URLSearchParams(window.location.search).get('post');
        if (postId) {
            viewPostDetails(postId);
        } else {
            loadPosts();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function showCreatePost() {
    if (!token) {
        showToast('Please sign in to create a post', 'error');
        showPage('signin-page');
        return;
    }

    const container = document.getElementById('posts-container');
    container.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
            <h2>Create New Post</h2>
            <form id="create-post-form" onsubmit="submitPost(event)">
                <input type="text" id="post-title" placeholder="Post Title" required style="width: 100%; padding: 10px; margin: 10px 0; border-radius: 8px; border: 2px solid #e5e7eb;">
                
                <textarea id="post-content" placeholder="What's your question or experience?" required style="width: 100%; height: 150px; padding: 10px; margin: 10px 0; border-radius: 8px; border: 2px solid #e5e7eb;"></textarea>
                
                <select id="post-category" style="width: 100%; padding: 10px; margin: 10px 0; border-radius: 8px; border: 2px solid #e5e7eb;">
                    <option value="">Select Category (Optional)</option>
                    <option value="crops">Crops</option>
                    <option value="pests">Pests & Diseases</option>
                    <option value="irrigation">Irrigation</option>
                    <option value="equipment">Equipment</option>
                    <option value="market">Market Prices</option>
                    <option value="general">General</option>
                </select>
                
                <input type="file" id="post-image" accept="image/*" style="margin: 10px 0;" onchange="previewImage(this, 'post-image-preview')">
                <div id="post-image-preview" style="margin: 10px 0;"></div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" class="btn-primary">Post</button>
                    <button type="button" onclick="loadPosts()" class="btn-secondary">Cancel</button>
                </div>
            </form>
        </div>
    `;
}

async function submitPost(event) {
    event.preventDefault();

    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const category = document.getElementById('post-category').value;
    const imageInput = document.getElementById('post-image');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    if (category) formData.append('category', category);
    if (imageInput.files[0]) formData.append('image', imageInput.files[0]);

    try {
        const response = await fetch(`${API_URL}/community/posts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to create post');
        }

        showToast('Post created successfully!', 'success');
        loadPosts();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    if (token) {
        loadUserInfo();
    }
});
// Voice Assistant and Multi-Language Functions
// Add these functions to the end of app.js (before the closing script tag)

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
        showToast('Voice input not supported in this browser. Use Chrome or Edge.', 'error');
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
    const lang = document.getElementById('chat-language')?.value || 'en';

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
// OCR Document Upload Function
// Add this to app.js after the voice functions

async function uploadDocument() {
    const fileInput = document.getElementById('document-upload');
    const file = fileInput.files[0];

    if (!file) return;

    const lang = document.getElementById('chat-language')?.value || 'en';

    // Show uploading message
    addMessageToChat(`📄 Uploading document: ${file.name}...`, 'user');
    const typingId = addTypingIndicator();

    try {
        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        // Upload to OCR endpoint
        const response = await fetch(`${API_URL}/ocr/extract`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('OCR failed');
        }

        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator(typingId);

        // Format the response
        let ocrResponse = `📄 **Document Scanned Successfully!**\n\n`;
        ocrResponse += `**Extracted Text:**\n${data.extracted_text}\n\n`;

        if (data.analysis) {
            ocrResponse += `**Analysis:**\n${data.analysis}\n\n`;
        }

        ocrResponse += `Confidence: ${data.confidence}% | Lines: ${data.num_lines}`;

        // Translate if not English
        if (lang !== 'en') {
            const translateResponse = await fetch(`${API_URL}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: ocrResponse,
                    target_lang: lang,
                    source_lang: 'en'
                })
            });

            if (translateResponse.ok) {
                const translateData = await translateResponse.json();
                ocrResponse = translateData.translated_text;
            }
        }

        // Add bot response
        addMessageToChat(ocrResponse, 'bot');

        // Speak if voice enabled
        speakText(ocrResponse, lang);

        // Clear file input
        fileInput.value = '';

        showToast('Document scanned successfully!', 'success');

    } catch (error) {
        removeTypingIndicator(typingId);
        addMessageToChat('Sorry, failed to process the document. Please try again.', 'bot');
        showToast('OCR failed: ' + error.message, 'error');
        fileInput.value = '';
    }
}

// Pest Detection Functions
function previewPestImage(event) {
    const file = event.target.files[0];
    const previewDiv = document.getElementById('pest-preview');

    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            previewDiv.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 300px; border-radius: 8px; margin-top: 10px; border: 2px solid #e5e7eb;">`;
        }
        reader.readAsDataURL(file);
    } else {
        previewDiv.innerHTML = '';
    }
}

async function analyzePest() {
    const fileInput = document.getElementById('pest-upload');
    const resultDiv = document.getElementById('pest-result');
    const file = fileInput.files[0];

    if (!file) {
        showToast('Please upload an image first', 'error');
        return;
    }

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<p>🔬 Analyzing image for pests and diseases...</p>';

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`${API_URL}/ml/pest-detection`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Analysis failed');

        const data = await response.json();

        const color = data.pest.includes('Pest') || data.pest.includes('Disease') ? '#ef4444' : '#22c5e0';
        const bgColor = data.pest.includes('Pest') || data.pest.includes('Disease') ? '#fff1f2' : '#f0fdf4';
        const icon = data.pest.includes('Pest') ? '🐛' : data.pest.includes('Disease') ? '🍄' : '🌱';

        // Convert newlines to HTML breaks if needed, or handle list rendering
        const formatList = (text) => {
            return text.split('\n').map(line => `<div style="margin-bottom: 4px;">${line}</div>`).join('');
        };

        resultDiv.innerHTML = `
            <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; margin-top: 20px;">
                <!-- Header -->
                <div style="background: ${bgColor}; padding: 20px; border-bottom: 1px solid rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <h3 style="color: ${color}; margin: 0; font-size: 1.25rem; display: flex; align-items: center; gap: 8px;">
                            ${icon} ${data.pest}
                        </h3>
                        <span style="background: white; padding: 4px 12px; border-radius: 20px; font-size: 0.875rem; font-weight: 600; color: ${color}; border: 1px solid ${color};">
                            ${data.confidence}% Confidence
                        </span>
                    </div>
                </div>
                
                <!-- Report Content -->
                <div style="padding: 24px;">
                    
                    <!-- Diagnosis Section -->
                    <div style="margin-bottom: 24px;">
                        <h4 style="color: #374151; margin: 0 0 12px 0; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em;">🩺 Recommended Treatment Plan</h4>
                        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                            <div style="color: #1f2937; line-height: 1.6;">${formatList(data.treatment)}</div>
                        </div>
                    </div>

                    <!-- Prevention Section -->
                    <div>
                        <h4 style="color: #374151; margin: 0 0 12px 0; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em;">🛡️ Future Prevention Strategy</h4>
                        <div style="background: #fffbeb; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                             <div style="color: #1f2937; line-height: 1.6;">${formatList(data.prevention)}</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; text-align: center;">
                         <button onclick="document.getElementById('pest-upload').click()" style="background: transparent; border: 1px solid #d1d5db; padding: 8px 16px; border-radius: 6px; cursor: pointer; color: #6b7280; font-size: 0.875rem;">Analyze Another Photo</button>
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        resultDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}
