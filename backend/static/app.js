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
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2>🤖 AI Farming Assistant</h2>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <select id="chat-language" style="padding: 8px; border-radius: 8px; border: 2px solid #e5e7eb;">
                            <option value="en">English</option>
                            <option value="hi">हिंदी (Hindi)</option>
                            <option value="ta">தமிழ் (Tamil)</option>
                            <option value="te">తెలుగు (Telugu)</option>
                            <option value="kn">ಕನ್ನಡ (Kannada)</option>
                            <option value="ml">മലയാളം (Malayalam)</option>
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
                    <input type="file" id="document-upload" accept="image/*" style="display: none;" onchange="uploadDocument()">
                    <button onclick="document.getElementById('document-upload').click()" style="padding: 12px 20px; border-radius: 8px; border: none; background: #10b981; color: white; cursor: pointer; font-size: 18px;" title="Upload document">
                        📄
                    </button>
                    <button onclick="startVoiceInput()" style="padding: 12px 20px; border-radius: 8px; border: none; background: #ef4444; color: white; cursor: pointer; font-size: 18px;" title="Voice input">
                        🎤
                    </button>
                    <button onclick="sendChatMessage()" class="btn-primary" style="padding: 12px 24px;">Send</button>
                </div>
                
                <div id="voice-status" style="margin-top: 10px; text-align: center; color: #666; font-size: 14px;"></div>
            `;

            // Initialize voice features
            if (typeof initializeVoiceFeatures === 'function') {
                initializeVoiceFeatures();
            }
            break;
        case 'pest':
            content.innerHTML = `
            <div class="feature-box">
                <h2>🔍 Detect Disease & Pest</h2>
                <div class="upload-section">
                    <p>Upload a clear photo of the affected plant leaf, stem, or fruit.</p>
                    <input type="file" id="pest-upload" accept="image/*" onchange="previewPestImage(event)">
                    <div id="pest-preview"></div>
                    <button onclick="analyzePest()" class="btn-primary" style="margin-top: 15px;">Analyze Health</button>
                    <div id="pest-result" class="result-box" style="display: none;"></div>
                </div>
            </div>
        `;
            break;
        case 'crop':
            content.innerHTML = `
                <h2>🌾 Crop Recommendations</h2>
                <p>Get personalized crop recommendations based on your farm conditions</p>
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Soil Type:</label>
                    <select id="soil-type" style="width: 100%; padding: 10px; margin: 10px 0; border-radius: 8px; border: 2px solid #e5e7eb;">
                        <option value="clay">Clay Soil</option>
                        <option value="sandy">Sandy Soil</option>
                        <option value="loamy" selected>Loamy Soil</option>
                        <option value="black">Black Soil</option>
                    </select>
                    
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Season:</label>
                    <select id="season" style="width: 100%; padding: 10px; margin: 10px 0; border-radius: 8px; border: 2px solid #e5e7eb;">
                        <option value="kharif">Kharif (Monsoon - June to October)</option>
                        <option value="rabi">Rabi (Winter - October to March)</option>
                        <option value="zaid">Zaid (Summer - March to June)</option>
                    </select>
                    
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Region/State:</label>
                    <input type="text" id="region" placeholder="e.g., Tamil Nadu, Maharashtra" style="width: 100%; padding: 10px; margin: 10px 0; border-radius: 8px; border: 2px solid #e5e7eb;">
                    
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Average Temperature (°C):</label>
                    <input type="number" id="temperature" placeholder="e.g., 28" min="10" max="45" style="width: 100%; padding: 10px; margin: 10px 0; border-radius: 8px; border: 2px solid #e5e7eb;">
                    <small style="color: #666;">Optional - Leave blank to use season defaults</small>
                    
                    <label style="display: block; margin-bottom: 5px; margin-top: 15px; font-weight: bold;">Soil pH (if known):</label>
                    <input type="number" id="soil-ph" placeholder="e.g., 6.5" min="4" max="9" step="0.1" style="width: 100%; padding: 10px; margin: 10px 0; border-radius: 8px; border: 2px solid #e5e7eb;">
                    <small style="color: #666;">Optional - Default is 6.5</small>
                </div>
                <button onclick="getCropRecommendations()" class="btn-primary">Get AI Recommendations</button>
                <div id="crop-result" style="margin-top: 20px;"></div>
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
        <div style="background: #e0f2fe; padding: 10px; border-radius: 8px; margin-bottom: 10px; text-align: right;">
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
            <div style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                <strong>Bot:</strong> ${response}
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
    const fileInput = document.getElementById('pest-image');
    const resultDiv = document.getElementById('pest-result');

    if (!fileInput.files || !fileInput.files[0]) {
        showToast('Please select an image first', 'error');
        return;
    }

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

        resultDiv.innerHTML = `
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e;">
                <h3>🎯 Detection Result</h3>
                <p><strong>Detected:</strong> ${result.pest}</p>
                <p><strong>Confidence:</strong> ${result.confidence.toFixed(1)}%</p>
                <p style="margin-top: 15px;"><strong>💊 Treatment:</strong> ${result.treatment}</p>
                <p style="margin-top: 10px;"><strong>🛡️ Prevention:</strong> ${result.prevention}</p>
            </div>
        `;
        showToast('✅ Analysis complete!', 'success');
    } catch (error) {
        resultDiv.innerHTML = `
            <div style="background: #fee2e2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <h4 style="color: #dc2626; margin-top: 0;">❌ ${error.message}</h4>
                <p style="color: #991b1b;">Please ensure you have uploaded a valid image of the affected crop or pest.</p>
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
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 12px; color: white; margin-bottom: 20px;">
                <h2 style="margin: 0 0 10px 0; font-size: 24px;">🎯 Recommended Crop</h2>
                <h3 style="margin: 0; font-size: 32px; font-weight: bold;">${result.crop.toUpperCase()}</h3>
                <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; margin-top: 15px;">
                    <p style="margin: 0; font-size: 18px;">Confidence: <strong>${result.confidence.toFixed(1)}%</strong></p>
                </div>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h4 style="color: #667eea; margin-top: 0;">📊 Analysis Details</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div style="background: #f0f9ff; padding: 15px; border-radius: 8px;">
                        <p style="margin: 0; color: #000000; font-size: 12px;">Soil Type</p>
                        <p style="margin: 5px 0 0 0; font-weight: bold; color: #000000;">${soilType.charAt(0).toUpperCase() + soilType.slice(1)}</p>
                    </div>
                    <div style="background: #f0fdf4; padding: 15px; border-radius: 8px;">
                        <p style="margin: 0; color: #000000; font-size: 12px;">Season</p>
                        <p style="margin: 5px 0 0 0; font-weight: bold; color: #000000;">${season.charAt(0).toUpperCase() + season.slice(1)}</p>
                    </div>
                    <div style="background: #fef3c7; padding: 15px; border-radius: 8px;">
                        <p style="margin: 0; color: #000000; font-size: 12px;">Region</p>
                        <p style="margin: 5px 0 0 0; font-weight: bold; color: #000000;">${region || 'General'}</p>
                    </div>
                    <div style="background: #fce7f3; padding: 15px; border-radius: 8px;">
                        <p style="margin: 0; color: #000000; font-size: 12px;">Climate</p>
                        <p style="margin: 5px 0 0 0; font-weight: bold; color: #000000;">${temperature}°C, ${climate.rainfall}mm</p>
                    </div>
                </div>
                
                <h4 style="color: #667eea; margin-top: 20px;">🌱 Crop Information</h4>
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="margin: 0 0 10px 0; color: #000000;"><strong>Expected Yield:</strong> ${cropInfo.yield}</p>
                    <p style="margin: 0 0 10px 0; color: #000000;"><strong>Growing Period:</strong> ${cropInfo.duration}</p>
                    <p style="margin: 0; color: #000000;"><strong>Water Requirement:</strong> ${cropInfo.water}</p>
                </div>
                
                <h4 style="color: #667eea; margin-top: 20px;">💡 Recommendations</h4>
                <ul style="margin: 10px 0; padding-left: 20px; color: #000000;">
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
            <div style="background: #fee2e2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <h4 style="color: #dc2626; margin-top: 0;">❌ Error</h4>
                <p style="color: #991b1b;">${error.message}</p>
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
    container.innerHTML = '<p>Loading posts...</p>';

    try {
        const response = await fetch(`${API_URL}/community/posts`);
        const data = await response.json();

        if (data.posts.length === 0) {
            container.innerHTML = '<p>No posts yet. Be the first to post!</p>';
            return;
        }

        container.innerHTML = data.posts.map(post => {
            const isOwnPost = currentUser && post.user_id == currentUser.id;
            const deleteBtn = isOwnPost ? `<button onclick="deletePost(${post.id})" style="background: #ef4444; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; float: right;">Delete</button>` : '';

            return `
                <div class="post-card" id="post-${post.id}">
                    ${deleteBtn}
                    <h3>${post.title}</h3>
                    <p>${post.content}</p>
                    <div class="post-meta">
                        ${post.category ? `<span>📁 ${post.category}</span> • ` : ''}
                        <span>👤 ${post.username || 'User'}</span> • 
                        <span>${new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    ${post.image_url ? `<img src="${post.image_url}" style="width: auto; max-width: 100%; height: auto; max-height: 300px; display: block; margin: 10px 0; border-radius: 8px;">` : ''}
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                        <button onclick="viewPostDetails(${post.id})" class="btn-secondary" style="padding: 8px 15px;">View Answers (${post.answers_count || 0})</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = '<p>Failed to load posts</p>';
        showToast('Failed to load posts', 'error');
    }
}

// View post details with answers
async function viewPostDetails(postId) {
    const container = document.getElementById('posts-container');
    container.innerHTML = '<p>Loading post...</p>';

    try {
        const response = await fetch(`${API_URL}/community/posts/${postId}`);
        const post = await response.json();

        const isOwnPost = currentUser && post.user_id == currentUser.id;
        const deleteBtn = isOwnPost ? `<button onclick="deletePost(${post.id})" style="background: #ef4444; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer;">Delete Post</button>` : '';

        const answersHtml = post.answers && post.answers.length > 0
            ? post.answers.map(answer => {
                const isOwnAnswer = currentUser && answer.user_id == currentUser.id;
                const deleteAnswerBtn = isOwnAnswer ? `<button onclick="deleteAnswer(${answer.id})" style="background: #ef4444; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; float: right; font-size: 12px;">Delete</button>` : '';

                return `
                    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 3px solid #22c55e;">
                        ${deleteAnswerBtn}
                        <p style="color: #000000; font-weight: 500;">${answer.content}</p>
                        <div style="font-size: 12px; color: #666; margin-top: 10px;">
                            👤 ${answer.username || 'User'} • ${new Date(answer.created_at).toLocaleDateString()}
                        </div>
                    </div>
                `;
            }).join('')
            : '<p style="color: #666;">No answers yet. Be the first to answer!</p>';

        container.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
                <button onclick="loadPosts()" class="btn-secondary" style="margin-bottom: 20px;">← Back to Posts</button>
                ${deleteBtn}
                <h2>${post.title}</h2>
                <div class="post-meta" style="margin-bottom: 15px;">
                    ${post.category ? `<span>📁 ${post.category}</span> • ` : ''}
                    <span>👤 ${post.username || 'User'}</span> • 
                    <span>${new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                ${post.image_url ? `<img src="${post.image_url}" style="width: auto; max-width: 100%; height: auto; max-height: 500px; display: block; margin: 20px auto; border-radius: 12px;">` : ''}
                <p style="margin: 20px 0; font-size: 1.1em; line-height: 1.6;">${post.content}</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                
                <h3>Answers (${post.answers ? post.answers.length : 0})</h3>
                ${answersHtml}
                
                ${token ? `
                    <div style="margin-top: 30px;">
                        <h4>Add Your Answer</h4>
                        <textarea id="answer-content" placeholder="Share your knowledge..." style="width: 100%; height: 100px; padding: 10px; border-radius: 8px; border: 2px solid #e5e7eb; margin: 10px 0;"></textarea>
                        <button onclick="submitAnswer(${post.id})" class="btn-primary">Submit Answer</button>
                    </div>
                ` : '<p style="color: #666; margin-top: 20px;">Sign in to add an answer</p>'}
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<p>Failed to load post</p>';
        showToast('Failed to load post', 'error');
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
        // Refresh the post details to remove the deleted answer
        // We need the post ID, but currently we are inside the answer context.
        // A simple trick is to reload the current viewPostDetails by finding the active post in DB or DOM,
        // but since viewPostDetails takes an ID, and we don't have it easily here without passing it,
        // we can just re-fetch the current post if we store the ID or just reload.
        // Better: passing postId to deleteAnswer would be ideal, but for now let's just use the global currentPostId if we track it,
        // OR simpler: just assume the user is looking at the post.
        // Getting post id from the answer element is hard without changing HTML structure.
        // Let's modify the HTML generation to pass postID too.

        // Actually, let's just reload the page or re-call viewPostDetails if we can find the id.
        // For simplicity in this quick fix, let's look for the 'Submit Answer' button onclick attribute which has the ID.
        const submitBtn = document.querySelector('button[onclick^="submitAnswer"]');
        if (submitBtn) {
            const onClickText = submitBtn.getAttribute('onclick'); // submitAnswer(123)
            const postId = onClickText.match(/\d+/)[0];
            viewPostDetails(postId);
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

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
