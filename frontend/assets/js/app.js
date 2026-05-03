// Global state
let currentUser = null;
let token = localStorage.getItem('token');

// API Base URL
const API_URL = 'http://localhost:8000/api/v1';

// Advanced Chatbot State & Data
let currentChatLang = 'en';
let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
let offlineCache = JSON.parse(localStorage.getItem('offlineCache')) || {};
let isListening = false;
let lastInputWasVoice = false; 
let recognition; 
let lastAnalysisResult = null; // Stores structured output for the Expert Advisor

// --- Global Utilities ---
const formatChatMessage = (text) => {
    if (!text) return 'No information available';

    // Replace **text** with <strong>text</strong>
    let cleanText = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Check for numbered lists (e.g., 1. or 1))
    if (/(\d+[\.\)]\s+)/.test(cleanText)) {
        const parts = cleanText.split(/\d+[\.\)]\s+/);
        if (parts.length > 1) {
            return '<ul style="text-align: left; padding-left: 20px; color: inherit; list-style-type: decimal;">' +
                parts.filter(t => t.trim().length > 0)
                    .map(item => `<li style="margin-bottom: 8px;">${item.trim()}</li>`).join('') +
                '</ul>';
        }
    }

    // Check for bullet points (e.g., - or *)
    if (/^[\-\*\s]+/.test(cleanText) || cleanText.includes('\n- ') || cleanText.includes('\n* ')) {
        const parts = cleanText.split(/\n[\-\*]\s+/);
        if (parts.length > 1) {
            return '<ul style="text-align: left; padding-left: 20px; color: inherit; list-style-type: disc;">' +
                parts.filter(t => t.trim().length > 0)
                    .map(item => `<li style="margin-bottom: 8px;">${item.trim()}</li>`).join('') +
                '</ul>';
        }
    }

    // Split into paragraphs if there are double newlines
    if (cleanText.includes('\n\n')) {
        return cleanText.split('\n\n').map(p => `<p style="margin-bottom: 12px; line-height: 1.6;">${p.trim()}</p>`).join('');
    }

    return `<p style="color: inherit; text-align: left; line-height: 1.6;">${cleanText}</p>`;
};

const CHAT_DATA = {
    en: {
        code: 'en-IN',
        voice: 'en-IN',
        title: 'AI Assistant',
        welcome: "Hello! I'm your AI farming expert. How can I help you today?",
        placeholder: 'Ask about crops, pests, or soil...',
        status: 'Online',
        offline: 'Offline Mode - Serving cached answers',
        guardMessage: "I specialize in agriculture. Please ask about crops, pests, or farming practices.",
        prompts: [
            { label: 'Pest Control', text: 'How to control pests organically?' },
            { label: 'Soil Health', text: 'How to improve soil NPK levels?' },
            { label: 'Rice Yield', text: 'Tips for better rice yield?' },
            { label: 'Weather', text: 'How does high humidity affect crops?' },
            { label: 'Irrigation', text: 'Best irrigation for clay soil?' },
            { label: 'Fertilizer', text: 'When to apply nitrogen fertilizer?' },
            { label: 'Fruit Trees', text: 'How to plant an apple tree?' },
            { label: 'Orchards', text: 'Best practices for orchard management.' }
        ],
        keywords: ['crop', 'plant', 'farm', 'soil', 'pest', 'disease', 'fertilizer', 'irrigation', 'seed', 'harvest', 'yield', 'rice', 'wheat', 'maize', 'potato', 'tomato', 'npk', 'organic', 'pesticide', 'weather', 'rain', 'season'],
   knowledgeBase: {
    'How to control pests organically?':
        "Organic pest control works best through prevention and natural methods. 1) Regularly inspect crops to identify pests early. 2) Spray Neem oil (5 ml per liter of water) or Neem seed kernel extract every 7–10 days. 3) Encourage beneficial insects like ladybugs and lacewings. 4) Use yellow sticky traps and pheromone traps to reduce pest populations. 5) Remove heavily infected plant parts and maintain field sanitation.",

    'How to improve soil NPK levels?':
        "Improving soil NPK levels requires balanced nutrient management. 1) Conduct a soil test before fertilizer application. 2) Add organic manure or compost to improve soil fertility. 3) Use Nitrogen fertilizers like Urea, Phosphorus fertilizers like DAP/SSP, and Potassium fertilizers like MOP based on soil recommendations. 4) Grow green manure crops such as Dhaincha or Sunhemp. 5) Maintain soil pH between 6.5 and 7.5 for better nutrient availability.",

    'Tips for better rice yield?':
        "Higher rice yield depends on good crop management practices. 1) Use high-yielding and disease-resistant rice varieties. 2) Follow proper spacing using the SRI method if possible. 3) Apply balanced fertilizers based on soil testing. 4) Maintain proper water levels, especially during tillering and flowering stages. 5) Control weeds, pests, and diseases at early stages. 6) Harvest at the correct maturity stage to avoid grain loss.",

    'How does high humidity affect crops?':
        "High humidity increases the risk of fungal and bacterial diseases in crops. 1) Diseases like blast, blight, mildew, and rot spread rapidly in humid conditions. 2) Ensure proper spacing and pruning for better air circulation. 3) Avoid excessive irrigation and overuse of nitrogen fertilizers. 4) Spray recommended fungicides or bio-fungicides when disease symptoms appear. 5) Monitor fields regularly during cloudy and rainy weather.",

    'Best irrigation for clay soil?':
        "Clay soil holds water for a long time, so irrigation must be carefully managed. 1) Drip irrigation is the best method because it supplies water slowly and reduces waterlogging. 2) Irrigate deeply but less frequently. 3) Avoid flood irrigation to prevent root damage and poor aeration. 4) Add organic matter to improve soil structure and drainage. 5) Ensure proper field drainage during heavy rains.",

    'When to apply nitrogen fertilizer?':
        "Nitrogen fertilizer should be applied in split doses for better crop uptake and reduced nutrient loss. 1) Apply the first dose as basal during planting or sowing. 2) Apply the second dose during active vegetative growth or tillering stage. 3) Apply the final dose before flowering or grain formation. 4) Avoid applying nitrogen before heavy rainfall to reduce leaching losses. 5) Irrigate lightly after fertilizer application if moisture is low.",

    'How to plant an apple tree?':
        "Apple trees grow best in cool climates with well-drained soil. 1) Select healthy grafted saplings from a reliable nursery. 2) Dig pits of about 2 x 2 x 2 feet and mix topsoil with compost or farmyard manure. 3) Plant during dormant season, usually January to February. 4) Maintain spacing of about 15–20 feet between trees. 5) Water immediately after planting and provide support to young plants. 6) Prune regularly to develop a strong framework.",

    'Best practices for orchard management.':
        "Successful orchard management requires proper care of trees, soil, water, and pests. 1) Prune trees regularly to improve sunlight penetration and airflow. 2) Use drip irrigation for efficient water management. 3) Apply organic manure and balanced fertilizers based on soil testing. 4) Keep the orchard free from weeds and fallen diseased fruits. 5) Monitor pests and diseases regularly and use integrated pest management practices. 6) Mulching helps conserve moisture and improve soil health."
}
    },
    hi: {
        code: 'hi-IN',
        voice: 'hi-IN',
        title: 'एआई सहायक',
        welcome: 'नमस्ते! मैं आपका एआई खेती विशेषज्ञ हूं। आज मैं आपकी कैसे मदद कर सकता हूं?',
        placeholder: 'फसलों, कीटों या मिट्टी के बारे में पूछें...',
        status: 'ऑनलाइन',
        offline: 'ऑफलाइन मोड - सहेजे गए उत्तर दिखा रहा है',
        guardMessage: "मैं कृषि में विशेषज्ञ हूं। कृपया फसलों, कीटों या खेती के तरीकों के बारे में पूछें।",
        prompts: [
            { label: 'कीट नियंत्रण', text: 'जैविक रूप से कीटों को कैसे नियंत्रित करें?' },
            { label: 'मिट्टी स्वास्थ्य', text: 'मिट्टी के एनपीके स्तर में कैसे सुधार करें?' },
            { label: 'चावल की पैदावार', text: 'चावल की बेहतर पैदावार के लिए टिप्स?' },
            { label: 'मौसम', text: 'उच्च आर्द्रता फसलों को कैसे प्रभावित करती है?' },
            { label: 'सिंचाई', text: 'मिट्टी के लिए सबसे अच्छी सिंचाई?' },
            { label: 'उर्वरक', text: 'नाइट्रोजन उर्वरक कब लगाएं?' },
            { label: 'फल के पेड़', text: 'सेब का पेड़ कैसे लगाएं?' },
            { label: 'बागों', text: 'बाग प्रबंधन के लिए सर्वोत्तम तरीके।' }
        ],
        keywords: ['फसल', 'पौधा', 'खेत', 'मिट्टी', 'कीट', 'रोग', 'खाद', 'सिंचाई', 'बीज', 'कटाई', 'पैदावार', 'चावल', 'गेहूं', 'मक्का', 'आलू', 'टमाटर', 'कीटनाशक', 'मौसम', 'बारिश'],
        knowledgeBase: {
    'जैविक रूप से कीटों को कैसे नियंत्रित करें?':
        "जैविक कीट नियंत्रण के लिए प्राकृतिक और सुरक्षित तरीकों का उपयोग सबसे प्रभावी होता है। 1) खेत की नियमित निगरानी करके कीटों की जल्दी पहचान करें। 2) नीम तेल (5 मिली प्रति लीटर पानी) या नीम खली का छिड़काव 7–10 दिन के अंतराल पर करें। 3) लेडीबग, ट्राइकोग्रामा और मकड़ियों जैसे लाभकारी कीटों को संरक्षण दें। 4) पीले चिपचिपे ट्रैप और फेरोमोन ट्रैप का उपयोग करें। 5) संक्रमित पौधों या पत्तियों को हटाकर खेत की सफाई बनाए रखें।",

    'मिट्टी के एनपीके स्तर में कैसे सुधार करें?':
        "मिट्टी में एनपीके स्तर सुधारने के लिए संतुलित पोषण प्रबंधन आवश्यक है। 1) उर्वरक डालने से पहले मिट्टी परीक्षण करवाएं। 2) गोबर की सड़ी खाद, कम्पोस्ट या वर्मी कम्पोस्ट का उपयोग करें। 3) नाइट्रोजन के लिए यूरिया, फास्फोरस के लिए डीएपी/एसएसपी और पोटाश के लिए एमओपी का संतुलित प्रयोग करें। 4) ढैंचा या सनहेम्प जैसी हरी खाद वाली फसलें उगाएं। 5) मिट्टी का पीएच स्तर 6.5 से 7.5 के बीच बनाए रखें।",

    'चावल की बेहतर पैदावार के लिए टिप्स?':
        "धान की अधिक पैदावार के लिए उचित खेती प्रबंधन जरूरी है। 1) उच्च गुणवत्ता और रोगरोधी बीजों का चयन करें। 2) संभव हो तो SRI विधि अपनाएं। 3) मिट्टी परीक्षण के आधार पर संतुलित उर्वरकों का उपयोग करें। 4) कल्ले निकलने और फूल आने के समय पर्याप्त पानी बनाए रखें। 5) खरपतवार, कीट और रोगों का समय पर नियंत्रण करें। 6) सही समय पर कटाई करके उत्पादन हानि से बचें।",

    'उच्च आर्द्रता फसलों को कैसे प्रभावित करती है?':
        "अधिक आर्द्रता फसलों में फफूंद और बैक्टीरिया जनित रोगों को बढ़ाती है। 1) ब्लास्ट, ब्लाइट, मिल्ड्यू और सड़न जैसी बीमारियां तेजी से फैलती हैं। 2) पौधों के बीच उचित दूरी रखें ताकि हवा का संचार बना रहे। 3) अधिक सिंचाई और नाइट्रोजन उर्वरकों के अत्यधिक प्रयोग से बचें। 4) आवश्यकता पड़ने पर जैविक या अनुशंसित फफूंदनाशी का छिड़काव करें। 5) बारिश और बादल वाले मौसम में खेत की नियमित निगरानी करें।",

    'मिट्टी के लिए सबसे अच्छी सिंचाई?':
        "चिकनी मिट्टी में पानी लंबे समय तक रुकता है, इसलिए सिंचाई सावधानी से करनी चाहिए। 1) ड्रिप सिंचाई सबसे उपयुक्त मानी जाती है क्योंकि यह धीरे-धीरे पानी देती है। 2) कम बार लेकिन गहरी सिंचाई करें। 3) अधिक पानी भराव से बचें ताकि जड़ों को पर्याप्त ऑक्सीजन मिल सके। 4) मिट्टी में जैविक पदार्थ मिलाकर उसकी संरचना और जल निकासी सुधारें। 5) भारी वर्षा के दौरान खेत में उचित जल निकासी की व्यवस्था रखें।",

    'नाइट्रोजन उर्वरक कब लगाएं?':
        "नाइट्रोजन उर्वरक को भागों में देने से पौधों द्वारा उसका बेहतर उपयोग होता है। 1) पहली मात्रा बुवाई या रोपाई के समय दें। 2) दूसरी मात्रा सक्रिय वृद्धि या कल्ले फूटने के समय दें। 3) तीसरी मात्रा फूल या दाना बनने से पहले दें। 4) भारी बारिश से पहले नाइट्रोजन का प्रयोग न करें ताकि पोषक तत्व बह न जाएं। 5) उर्वरक डालने के बाद आवश्यकता अनुसार हल्की सिंचाई करें।",

    'सेब का पेड़ कैसे लगाएं?':
        "सेब के पौधे ठंडी जलवायु और अच्छी जल निकासी वाली मिट्टी में अच्छे बढ़ते हैं। 1) विश्वसनीय नर्सरी से स्वस्थ कलमी पौधे खरीदें। 2) 2 x 2 x 2 फीट का गड्ढा खोदकर उसमें ऊपरी मिट्टी और जैविक खाद मिलाएं। 3) पौधों की रोपाई जनवरी–फरवरी के दौरान करें। 4) पौधों के बीच लगभग 15–20 फीट की दूरी रखें। 5) रोपाई के तुरंत बाद सिंचाई करें और पौधों को सहारा दें। 6) मजबूत शाखा संरचना के लिए नियमित छंटाई करें।",

    'बाग प्रबंधन के लिए सर्वोत्तम तरीके।':
        "अच्छे बाग प्रबंधन के लिए पौधों, मिट्टी, पानी और कीटों का सही प्रबंधन जरूरी है। 1) धूप और हवा के बेहतर संचार के लिए नियमित छंटाई करें। 2) पानी की बचत और समान नमी के लिए ड्रिप सिंचाई अपनाएं। 3) मिट्टी परीक्षण के आधार पर जैविक खाद और संतुलित उर्वरकों का प्रयोग करें। 4) गिरे हुए संक्रमित फल और खरपतवारों को हटाकर सफाई बनाए रखें। 5) कीट और रोगों की नियमित निगरानी करें तथा एकीकृत कीट प्रबंधन अपनाएं। 6) मल्चिंग करने से नमी बनी रहती है और मिट्टी की गुणवत्ता सुधरती है।"
}
    },
    ta: {
        code: 'ta-IN',
        voice: 'ta-IN',
        title: 'AI உதவியாளர்',
        welcome: 'வணக்கம்! நான் உங்கள் விவசாய நிபுணர். இன்று உங்களுக்கு எப்படி உதவ முடியும்?',
        placeholder: 'பயிர்கள், பூச்சிகள் அல்லது மண் பற்றி கேளுங்கள்...',
        status: 'ஆன்லைன்',
        offline: 'ஆஃப்லைன் பயன்முறை - சேமிக்கப்பட்ட பதில்கள்',
        guardMessage: "நான் விவசாயத்தில் நிபுணத்துவம் பெற்றவன். பயிர்கள், பூச்சிகள் அல்லது விவசாய முறைகள் பற்றி கேளுங்கள்.",
        prompts: [
            { label: 'பூச்சி கட்டுப்பாடு', text: 'இயற்கை முறையில் பூச்சிகளை கட்டுப்படுத்துவது எப்படி?' },
            { label: 'மண் ஆரோக்கியம்', text: 'மண்ணின் NPK அளவை மேம்படுத்துவது எப்படி?' },
            { label: 'நெல் மகசூல்', text: 'நெல் விளைச்சலை அதிகரிக்க குறிப்புகள்?' },
            { label: 'வானிலை', text: 'அதிக ஈரப்பதம் பயிர்களை எவ்வாறு பாதிக்கும்?' },
            { label: 'பாசனம்', text: 'களிமண் நிலத்திற்கு சிறந்த பாசனம் எது?' },
            { label: 'உரம்', text: 'நைட்ரஜன் உரத்தை எப்போது இட வேண்டும்?' },
            { label: 'பழ மரங்கள்', text: 'ஆப்பிள் மரம் நடுவது எப்படி?' },
            { label: 'தோட்டங்கள்', text: 'பழத்தோட்ட மேலாண்மைக்கான சிறந்த நடைமுறைகள்.' }
        ],
        keywords: ['பயிர்', 'செடி', 'விவசாயம்', 'மண்', 'பூச்சி', 'நோய்', 'உரம்', 'பாசனம்', 'விதை', 'அறுவடை', 'விளைச்சல்', 'நெல்', 'கோதுமை', 'சோளம்', 'உருளை', 'தக்காளி', 'வானிலை', 'மழை'],
        knowledgeBase: {
    'இயற்கை முறையில் பூச்சிகளை கட்டுப்படுத்துவது எப்படி?':
        "இயற்கை முறையில் பூச்சிகளை கட்டுப்படுத்த முன்னெச்சரிக்கை மற்றும் உயிரியல் முறைகள் மிகவும் பயனுள்ளதாகும். 1) வயல்களை அடிக்கடி கண்காணித்து பூச்சிகளை ஆரம்பத்திலேயே கண்டறியவும். 2) வேப்ப எண்ணெய் (ஒரு லிட்டர் நீருக்கு 5 மில்லி) அல்லது வேப்பச்சாறு 7–10 நாட்களுக்கு ஒருமுறை தெளிக்கவும். 3) பொறிவண்டு, சிலந்தி போன்ற பயனுள்ள பூச்சிகளை பாதுகாக்கவும். 4) மஞ்சள் ஒட்டும் பொறிகள் மற்றும் பெரோமோன் பொறிகளை பயன்படுத்தவும். 5) பாதிக்கப்பட்ட இலைகள் மற்றும் செடிகளை அகற்றி வயலை சுத்தமாக வைத்திருக்கவும்.",

    'மண்ணின் NPK அளவை மேம்படுத்துவது எப்படி?':
        "மண்ணின் NPK அளவை மேம்படுத்த சமநிலையான ஊட்டச்சத்து மேலாண்மை அவசியம். 1) உரமிடுவதற்கு முன் மண் பரிசோதனை செய்யவும். 2) தொழு உரம், கம்போஸ்ட் அல்லது மண்புழு உரம் பயன்படுத்தவும். 3) நைட்ரஜனுக்கு யூரியா, பாஸ்பரஸுக்கு DAP/SSP மற்றும் பொட்டாசியத்திற்கு MOP ஆகியவற்றை சரியான அளவில் பயன்படுத்தவும். 4) தக்கைப்பூண்டு அல்லது சணப்பு போன்ற பசுந்தாள் உரப் பயிர்களை வளர்க்கவும். 5) மண்ணின் pH அளவை 6.5 முதல் 7.5 வரை பராமரிக்கவும்.",

    'நெல் விளைச்சலை அதிகரிக்க குறிப்புகள்?':
        "நெல் விளைச்சலை அதிகரிக்க சரியான பயிர் மேலாண்மை அவசியம். 1) அதிக மகசூல் மற்றும் நோய் எதிர்ப்பு திறன் கொண்ட விதைகளை தேர்வு செய்யவும். 2) சாத்தியமானால் SRI முறையை பின்பற்றவும். 3) மண் பரிசோதனை அடிப்படையில் சமநிலையான உரங்களை பயன்படுத்தவும். 4) தூர் கட்டும் மற்றும் பூக்கும் காலங்களில் போதுமான நீர் அளவை பராமரிக்கவும். 5) களைகள், பூச்சிகள் மற்றும் நோய்களை ஆரம்பத்திலேயே கட்டுப்படுத்தவும். 6) சரியான நேரத்தில் அறுவடை செய்து மகசூல் இழப்பை தவிர்க்கவும்.",

    'அதிக ஈரப்பதம் பயிர்களை எவ்வாறு பாதிக்கும்?':
        "அதிக ஈரப்பதம் பயிர்களில் பூஞ்சை மற்றும் பாக்டீரியா நோய்களை அதிகரிக்கிறது. 1) பிளாஸ்ட், பிளைட், மில்டியூ மற்றும் அழுகல் போன்ற நோய்கள் வேகமாக பரவுகின்றன. 2) காற்றோட்டம் கிடைக்க செடிகளுக்கு சரியான இடைவெளி வைக்கவும். 3) அதிகப்படியான நீர்ப்பாசனம் மற்றும் நைட்ரஜன் உர பயன்பாட்டை தவிர்க்கவும். 4) தேவையானபோது உயிரியல் அல்லது பரிந்துரைக்கப்பட்ட பூஞ்சைக் கொல்லிகளை தெளிக்கவும். 5) மழைக்காலம் மற்றும் மேகமூட்டமான நாட்களில் வயல்களை அடிக்கடி கண்காணிக்கவும்.",

    'களிமண் நிலத்திற்கு சிறந்த பாசனம் எது?':
        "களிமண் நீரை நீண்ட நேரம் தக்கவைத்துக்கொள்ளும், எனவே பாசனத்தை கவனமாக நிர்வகிக்க வேண்டும். 1) சொட்டு நீர் பாசனம் சிறந்த முறையாகும், ஏனெனில் அது மெதுவாக நீரை வழங்குகிறது. 2) குறைந்த தடவைகள் ஆனால் ஆழமான பாசனம் செய்யவும். 3) நீர் தேக்கம் ஏற்படாமல் பார்த்துக்கொள்ளவும். 4) கரிமப்பொருட்களை சேர்த்து மண்ணின் அமைப்பையும் வடிகாலும் மேம்படுத்தவும். 5) கனமழை காலங்களில் நல்ல வடிகால் வசதி ஏற்படுத்தவும்.",

    'நைட்ரஜன் உரத்தை எப்போது இட வேண்டும்?':
        "நைட்ரஜன் உரத்தை பிரித்து இடுவது பயிர்களுக்கு அதிக பயன் அளிக்கும். 1) முதல் பகுதியை விதைப்பு அல்லது நடவு நேரத்தில் இடவும். 2) இரண்டாவது பகுதியை செயலில் வளர்ச்சி அல்லது தூர் கட்டும் பருவத்தில் இடவும். 3) மூன்றாவது பகுதியை பூக்கும் அல்லது கதிர் உருவாகும் முன் இடவும். 4) கனமழைக்கு முன் நைட்ரஜன் உரம் இடுவதை தவிர்க்கவும். 5) உரமிட்ட பிறகு தேவையானால் லேசான நீர்ப்பாசனம் செய்யவும்.",

    'ஆப்பிள் மரம் நடுவது எப்படி?':
        "ஆப்பிள் மரங்கள் குளிரான காலநிலை மற்றும் நல்ல வடிகால் கொண்ட மண்ணில் சிறப்பாக வளரும். 1) நம்பகமான நர்சரியில் இருந்து ஆரோக்கியமான ஒட்டு நாற்றுகளை வாங்கவும். 2) 2 x 2 x 2 அடி அளவில் குழி தோண்டி மேல்மண் மற்றும் இயற்கை உரத்தை கலக்கவும். 3) ஜனவரி–பிப்ரவரி மாதங்களில் நடவு செய்யவும். 4) மரங்களுக்கு இடையே 15–20 அடி இடைவெளி வைக்கவும். 5) நடவு செய்த உடனே நீர் பாய்ச்சவும் மற்றும் செடிகளுக்கு ஆதரவு கொடுக்கவும். 6) நல்ல கிளை வளர்ச்சிக்காக வழக்கமான கத்தரித்தல் செய்யவும்.",

    'பழத்தோட்ட மேலாண்மைக்கான சிறந்த நடைமுறைகள்.':
        "சிறந்த பழத்தோட்ட மேலாண்மைக்கு மரங்கள், மண், நீர் மற்றும் பூச்சிகளை சரியாக பராமரிக்க வேண்டும். 1) சூரியஒளி மற்றும் காற்றோட்டம் கிடைக்க மரங்களை வழக்கமாக கத்தரிக்கவும். 2) நீர் சேமிப்பிற்கும் சீரான ஈரப்பதத்திற்கும் சொட்டு நீர் பாசனம் பயன்படுத்தவும். 3) மண் பரிசோதனை அடிப்படையில் இயற்கை உரம் மற்றும் சமநிலையான உரங்களை இடவும். 4) களைகள் மற்றும் பாதிக்கப்பட்ட பழங்களை அகற்றி தோட்டத்தை சுத்தமாக வைத்திருக்கவும். 5) பூச்சி மற்றும் நோய்களை அடிக்கடி கண்காணித்து ஒருங்கிணைந்த பூச்சி மேலாண்மை முறைகளை பின்பற்றவும். 6) மூடாக்கு இடுவது மண்ணின் ஈரப்பதத்தையும் தரத்தையும் மேம்படுத்தும்."
}
    }
};

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.warn('Toast element not found. Message:', message);
        return;
    }
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// Initialize App: Restore Session
document.addEventListener('DOMContentLoaded', () => {
    // ALWAYS recovery session info regardless of page
    loadUserInfo();

    // Detect current page from URL
    const path = window.location.pathname;
    const pageName = path.split('/').pop() || 'index.html';

    if (pageName === 'crop_recommendation.html') {
        showFeature('crop');
    } else if (pageName === 'disease_detection.html') {
        document.title = "Disease Detection - Agromind AI";
        showFeature('pest');
    } else if (pageName === 'community.html') {
        loadPosts();
    }

    // Handle Deep Linking (e.g. index.html#signin-page)
    const hash = window.location.hash.substring(1);
    if (hash && (pageName === 'index.html' || pageName === '')) {
        showPage(hash);
    }
});

// Show page
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    const pageElement = document.getElementById(pageId);
    if (pageElement) {
        pageElement.classList.add('active');
        // Update URL hash without reload
        if (pageId === 'home-page') {
            window.location.hash = '';
        } else {
            window.location.hash = pageId;
        }
    } else {
        // If page doesn't exist here (e.g. signin-page on a subpage), redirect to home
        if (pageId === 'signin-page' || pageId === 'signup-page' || pageId === 'home-page') {
            window.location.href = `index.html#${pageId}`;
            return;
        }
    }

    // Update navbar active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (pageId === 'home-page' && item.textContent.trim() === 'Home') {
            item.classList.add('active');
        }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Load data for specific pages
    if (pageId === 'crop-page') {
        showFeature('crop');
    } else if (pageId === 'pest-page') {
        showFeature('pest');
    } else if (pageId === 'community-page') {
        loadPosts();
    } else if (pageId === 'home-page') {
        loadUserInfo();
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
        showPage('home-page');
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

        // Refresh the current feature if we are on a tool page, otherwise go to home
        const path = window.location.pathname;
        const pageName = path.split('/').pop() || 'index.html';

        if (pageName === 'crop_recommendation.html') {
            showFeature('crop');
        } else if (pageName === 'disease_detection.html') {
            showFeature('pest');

        } else if (pageName === 'community.html') {
            loadPosts();
        } else {
            showPage('home-page');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Handle Signout
function handleSignout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');

    // Clear Chatbot history and cache
    chatHistory = [];
    offlineCache = {};
    localStorage.removeItem('chatHistory');
    localStorage.removeItem('offlineCache');

    // Close dropdown
    const dropdown = document.getElementById('signout-btn');
    if (dropdown) dropdown.classList.remove('show');
    showToast('Signed out successfully', 'success');
    showPage('home-page');
    // Hide assistant if open
    const aiWin = document.getElementById('ai-assistant-window');
    if (aiWin) aiWin.classList.remove('show');
}

// Close signout dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('signout-btn');
    const profile = document.getElementById('user-profile-nav');
    if (dropdown && profile && !profile.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

// Load user info
async function loadUserInfo() {
    const navUsername = document.getElementById('nav-username');
    const dashboardUsername = document.getElementById('user-name');
    const signinBtn = document.getElementById('signin-btn');
    const userProfileNav = document.getElementById('user-profile-nav');

    const mobileUserNav = document.getElementById('mobile-user-nav');

    if (!token) {
        if (signinBtn) signinBtn.style.display = 'block';
        if (userProfileNav) userProfileNav.style.display = 'none';
        if (navUsername) navUsername.textContent = 'User';
        if (dashboardUsername) dashboardUsername.textContent = 'Guest';
        if (mobileUserNav) mobileUserNav.innerHTML = `<button onclick="showPage('signin-page'); toggleMobileMenu()" class="btn-primary w-100">Sign In / Join</button>`;
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            if (signinBtn) signinBtn.style.display = 'none';
            if (userProfileNav) userProfileNav.style.display = 'flex';
            if (navUsername) navUsername.textContent = user.username;
            if (dashboardUsername) dashboardUsername.textContent = user.username;
            
            // Set avatar initial on the desktop greeting pill
            const greetingPill = document.getElementById('nav-greeting-pill');
            if (greetingPill) greetingPill.setAttribute('data-initial', user.username.charAt(0).toUpperCase());

            // Set avatar initial on mobile avatar circle (in navbar)
            const mobileAvatarBtn = document.getElementById('mobile-avatar-btn');
            const mobileAvatarInitial = document.getElementById('mobile-avatar-initial');
            if (mobileAvatarBtn) mobileAvatarBtn.style.display = 'flex';
            if (mobileAvatarInitial) mobileAvatarInitial.textContent = user.username.charAt(0).toUpperCase();

            if (mobileUserNav) {
                mobileUserNav.innerHTML = `
                    <button onclick="handleSignout(); toggleMobileMenu()" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 14px 16px; border-radius: 12px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: background 0.2s; font-family: inherit;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sign Out
                    </button>
                `;
            }
        } else {
            if (signinBtn) signinBtn.style.display = 'block';
            if (userProfileNav) userProfileNav.style.display = 'none';
        }
    } catch (error) {
        if (signinBtn) signinBtn.style.display = 'block';
        if (userProfileNav) userProfileNav.style.display = 'none';
    }
}

// Toggle AI Assistant Window
function toggleAIAssistant() {
    const aiWindow = document.getElementById('ai-assistant-window');
    if (!aiWindow) return;
    
    const isShowing = aiWindow.classList.toggle('show');

    if (isShowing) {
        showFeature('assistant');
        updateChatbotStatus();
        // Small delay to ensure inner content is rendered before scrolling
        setTimeout(() => {
            const container = document.getElementById('chat-messages');
            if (container) container.scrollTop = container.scrollHeight;
        }, 100);
    }
}

async function updateChatbotStatus() {
    const statusText = document.getElementById('chat-status');
    const dot = document.querySelector('.status-dot');
    if (!statusText || !dot) return;

    try {
        const response = await fetch(`${API_URL}/chatbot/status`);
        const data = await response.json();
        
        if (data.loaded) {
            statusText.innerText = data.backend || 'Online';
            statusText.style.color = 'var(--primary)';
            dot.style.background = 'var(--primary)';
            dot.style.boxShadow = '0 0 10px var(--primary-glow)';
        } else {
            statusText.innerText = 'Offline Mode';
            statusText.style.color = '#ef4444';
            dot.style.background = '#ef4444';
        }
    } catch (e) {
        console.error("Status fetch failed", e);
    }
}

// Handle AI Button from Hero Section
function handleHeroAIPrompt() {
    if (token) {
        toggleAIAssistant();
    } else {
        showPage('signin-page');
        showToast('Please sign in to use the AI Assistant', 'info');
    }
}

// Show feature
function showFeature(feature) {
    let contentId = 'feature-content';
    if (feature === 'crop') contentId = 'crop-content';
    if (feature === 'pest') contentId = 'pest-content';

    const assistantWindow = document.getElementById('ai-assistant-window');

    if (feature === 'assistant' && !token) {
        assistantWindow.innerHTML = `
            <div class="auth-disclaimer-card reveal reveal-up active" style="padding: 40px 30px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 20px;">
                <div class="disclaimer-icon" style="font-size: 3.5rem; filter: drop-shadow(0 0 15px var(--primary));">🔒</div>
                <h2 style="font-family: 'Syne', sans-serif; font-size: 1.8rem; margin: 0;">Access Restricted</h2>
                <p style="color: var(--text-secondary); line-height: 1.6; margin: 0;">Please sign in to Agromind AI to unlock our advanced agricultural features and community insights.</p>
                <div class="disclaimer-actions" style="display: flex; flex-direction: column; gap: 12px; width: 100%; margin-top: 10px;">
                    <button onclick="window.location.href='index.html#signin-page'" class="btn-send-premium" style="width: 100%; height: 50px; font-size: 1rem;">Sign In to Continue</button>
                    <button onclick="toggleAIAssistant()" class="btn-secondary" style="background: none; border: 1px solid var(--glass-border); color: var(--text-tertiary); padding: 10px; border-radius: 12px;">Maybe Later</button>
                </div>
            </div>
        `;
        assistantWindow.classList.add('show');
        return;
    }

    const content = document.getElementById(contentId);

    if (!token && (feature === 'crop' || feature === 'pest' || feature === 'community')) {
        if (!content) return;
        const errorHtml = `
            <div class="auth-disclaimer-card reveal reveal-up active">
                <div class="disclaimer-icon">🔒</div>
                <h2>Login Required</h2>
                <p>Please sign in to access our advanced AI agricultural tools and community features.</p>
                <div class="disclaimer-actions">
                    <button onclick="window.location.href='index.html#signin-page'" class="btn-primary">Sign In Now</button>
                    <a href="index.html" class="btn-secondary">Back to Home</a>
                </div>
            </div>
        `;
        content.innerHTML = errorHtml;
        return;
    }

    switch (feature) {
        case 'assistant':
            const lang = CHAT_DATA[currentChatLang];
            assistantWindow.innerHTML = `
                <div class="glass-panel" style="padding: 24px; height: 100%; display: flex; flex-direction: column; background: transparent;">
                    <div class="chat-header-premium">
                        <div class="chat-header-info">
                            <h2 id="chat-title">${lang.title}</h2>
                            <div class="chat-status-indicator">
                                <span class="status-dot"></span>
                                <span id="chat-status">${navigator.onLine ? lang.status : lang.offline}</span>
                            </div>
                        </div>
                        <div class="chat-header-actions">
                            <div class="lang-selector-premium">
                                <button onclick="setChatLang('en')" class="lang-btn ${currentChatLang === 'en' ? 'active' : ''}">En</button>
                                <button onclick="setChatLang('hi')" class="lang-btn ${currentChatLang === 'hi' ? 'active' : ''}">हि</button>
                                <button onclick="setChatLang('ta')" class="lang-btn ${currentChatLang === 'ta' ? 'active' : ''}">த</button>
                            </div>
                            <button onclick="clearChatHistory()" class="btn-icon" title="Clear Conversation">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                            </button>
                            <button onclick="toggleAIAssistant()" class="btn-icon" title="Close">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                        </div>
                    </div>
                    
                    <div id="quick-prompts" class="quick-prompts-container mb-4">
                        ${lang.prompts.map(p => `<button onclick="handleQuickPrompt('${p.text}')" class="btn-chip">${p.label}</button>`).join('')}
                    </div>

                    <div id="chat-messages" class="chat-window mb-4" style="flex: 1; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column; gap: 15px;">
                        <!-- Messages -->
                    </div>

                    <div class="chat-input-container">
                        <div class="chat-input-row-premium">
                            <input type="text" id="chat-input" placeholder="${lang.placeholder}" onkeypress="if(event.key === 'Enter') sendChatMessage()">
                            <div class="chat-tools-group">
                                <button id="mic-btn" onclick="toggleVoiceInput()" class="btn-chat-tool" title="Voice Input">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                                </button>
                            </div>
                            <button onclick="sendChatMessage()" class="btn-send-premium">Send</button>
                        </div>
                    </div>
                </div>
            `;
            loadChatHistory();
            break;
        case 'voice':
            // Redirecting old voice calls to assistant if needed, but for now we keep it separate or merged.
            // Let's assume the floating assistant IS the voice assistant now.
            toggleAIAssistant();
            break;
        case 'pest':
            content.innerHTML = `
                <div class="pest-detection-wrapper" style="animation: fadeInUp 0.6s ease-out;">
                    <div class="glass-panel" style="padding: 3.5rem 2.5rem; text-align: center; border-radius: 40px; max-width: 900px; margin: 0 auto; border: 1px solid var(--glass-border); background: var(--glass-surface);">
                        <div style="margin-bottom: 2rem; display: flex; align-items: center; justify-content: center; gap: 15px; flex-wrap: wrap;">
                            <h2 style="font-family: 'Syne', sans-serif; font-size: 1.8rem; margin: 0; letter-spacing: -0.01em;">Plant Health <span style="color: var(--primary);">Diagnostic</span></h2>
                        </div>
                        
                        <div class="upload-section">
                            <div id="pest-upload-frame" class="pest-upload-frame-enhanced" onclick="document.getElementById('pest-upload').click()">
                                <div class="upload-glow-effect"></div>
                                <div id="scanner-shell" class="scanner-shell" style="display: none; width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 5;">
                                    <div class="scanner-line-active"></div>
                                </div>
                                <div class="pest-upload-icon" style="font-size: 4rem; margin-bottom: 15px; filter: drop-shadow(0 0 10px var(--primary-glow));">📸</div>
                                <div class="pest-upload-text" style="font-weight: 800; font-size: 1.4rem; color: #fff;">Initialize Visual Scan</div>
                                <div class="pest-upload-subtext" style="color: var(--text-secondary); font-size: 0.95rem;">Drag photo here or click to browse</div>
                                <div style="margin-top: 15px; font-size: 0.75rem; color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6;">Supports JPG, PNG (Max 10MB)</div>
                            </div>
                            <input type="file" id="pest-upload" accept="image/*" onchange="previewPestImage(event)" style="display: none;">
                            
                            <div id="pest-preview" class="mb-4" style="margin-top: 30px; animation: scaleIn 0.4s ease-out;"></div>

                            <button id="analyze-btn" onclick="analyzePestImage()" class="btn-primary" style="margin-top: 20px; display: none; width: 100%; height: 60px; font-size: 1.1rem; font-weight: 800; letter-spacing: 0.1em; border-radius: 14px;">
                                RUN DIAGNOSTIC
                            </button>
                            
                            <div id="pest-result" class="result-box" style="display: none; margin-top: 40px;"></div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 4rem; text-align: center; opacity: 0.6;">
                        <p style="font-size: 0.9rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto; line-height: 1.6;">
                            <strong>DeepMind Pro Tip:</strong> For clinical-grade accuracy, capture the image in direct sunlight without flash. Our engine performs best on clear, high-contrast textures of plant foliage.
                        </p>
                    </div>
                </div>
            `;
            break;
        case 'crop':
            content.innerHTML = `
                <div style="width: 100%;">
                    
                    <!-- ── AI Suggester Toggle ── -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                        <h2 style="margin: 0;">Crop Browse</h2>
                        <button onclick="toggleAIRecoPanel()" class="btn-primary" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600;">
                            AI Crop Suggester
                            <svg id="ai-reco-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.3s;"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                    </div>

                    <!-- ── AI Recommendation Panel (existing feature) ── -->
                    <div id="ai-reco-panel" class="glass-panel" style="padding: 2.5rem; margin-bottom: 3rem; display: none;">
                        <div class="text-center mb-4">
                            <h2>Crop Recommendations</h2>
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

                    <!-- ──────── CROP LISTING & BROWSING ──────── -->
                    <div class="crop-listing-wrapper" id="crop-listing-section">

                        <!-- Search & Filter Bar -->
                        <div style="display: flex; gap: 12px; margin-bottom: 1.5rem;">
                            <div class="crop-search-bar" style="flex: 1; margin: 0;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                <input type="text" id="crop-search-input" placeholder="Search crops — Rice, Tomato, Groundnut..." oninput="renderCropGrid()">
                            </div>
                            <button id="crop-filter-toggle-btn" onclick="toggleCropFilterPanel()" class="btn-secondary" style="display: flex; align-items: center; justify-content: center; width: 48px; border-radius: 14px; padding: 0;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                            </button>
                        </div>

                        <!-- Collapsible Filters -->
                        <div id="crop-filter-panel" style="margin-bottom: 1.5rem; display: none; background: rgba(0, 0, 0, 0.2); border: 1px solid var(--glass-border); padding: 1.5rem; border-radius: 16px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                                <span style="font-size: 0.85rem; color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">Filters</span>
                                <button class="crop-clear-filters" onclick="clearCropFilters()">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    Clear all
                                </button>
                            </div>
                            <div class="crop-filter-group">
                                <div class="crop-filter-group-label">Season</div>
                                <div class="crop-filter-chips">
                                    <span class="crop-chip" data-filter-type="season" data-filter-val="kharif" onclick="toggleCropChip(this)">Kharif</span>
                                    <span class="crop-chip" data-filter-type="season" data-filter-val="rabi" onclick="toggleCropChip(this)">Rabi</span>
                                    <span class="crop-chip" data-filter-type="season" data-filter-val="zaid" onclick="toggleCropChip(this)">Zaid</span>
                                </div>
                            </div>
                            <div class="crop-filter-group">
                                <div class="crop-filter-group-label">Water Requirement</div>
                                <div class="crop-filter-chips">
                                    <span class="crop-chip" data-filter-type="water" data-filter-val="low" onclick="toggleCropChip(this)">Low</span>
                                    <span class="crop-chip" data-filter-type="water" data-filter-val="medium" onclick="toggleCropChip(this)">Medium</span>
                                    <span class="crop-chip" data-filter-type="water" data-filter-val="high" onclick="toggleCropChip(this)">High</span>
                                </div>
                            </div>
                            <div class="crop-filter-group">
                                <div class="crop-filter-group-label">Crop Type</div>
                                <div class="crop-filter-chips">
                                    <span class="crop-chip" data-filter-type="type" data-filter-val="cereals" onclick="toggleCropChip(this)">Cereals</span>
                                    <span class="crop-chip" data-filter-type="type" data-filter-val="pulses" onclick="toggleCropChip(this)">Pulses</span>
                                    <span class="crop-chip" data-filter-type="type" data-filter-val="vegetables" onclick="toggleCropChip(this)">Vegetables</span>
                                    <span class="crop-chip" data-filter-type="type" data-filter-val="fruits" onclick="toggleCropChip(this)">Fruits</span>
                                    <span class="crop-chip" data-filter-type="type" data-filter-val="oilseeds" onclick="toggleCropChip(this)">Oilseeds</span>
                                    <span class="crop-chip" data-filter-type="type" data-filter-val="millets" onclick="toggleCropChip(this)">Millets</span>
                                </div>
                            </div>
                        </div>

                        <!-- Popular Crops -->
                        <div style="margin-bottom: 2rem;">
                            <div class="crop-section-header">
                                <h3>Popular Crops</h3>
                                <span class="section-badge">Top Picks</span>
                            </div>
                            <div class="popular-crops-scroll" id="popular-crops-row"></div>
                        </div>

                        <!-- Seasonal Suggestions -->
                        <div id="seasonal-suggestion-section" style="margin-bottom: 2rem;"></div>

                        <!-- Browse All Crops -->
                        <div>
                            <div class="crop-section-header">
                                <h3>Browse All Crops</h3>
                            </div>
                            <p class="crop-results-count" id="crop-results-count"></p>
                            <div class="crop-browse-grid" id="crop-browse-grid"></div>
                        </div>
                    </div>
                </div>
            `;
            _initCropListing();
            break;
    }
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

// analyzePestImage moved to the bottom of the file to handle both pest and disease detection


// Crop recommendations - REAL ML MODEL
async function getCropRecommendations() {
    const soilType = document.getElementById('soil-type').value;
    const season = document.getElementById('season').value;
    const region = document.getElementById('region').value;
    const customTemp = document.getElementById('temperature').value;
    const customPh = document.getElementById('soil-ph').value;
    const resultDiv = document.getElementById('crop-result');

    if (!resultDiv) {
        console.error('Crop result container not found!');
        showToast('UI Error: Result container missing', 'error');
        return;
    }

    resultDiv.innerHTML = '<p>Analyzing soil and climate data...</p>';

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
                <h4 style="color: var(--primary); margin-bottom: 20px;">Analysis Details</h4>
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

                <h4 style="color: var(--primary); margin: 30px 0 20px 0;">Crop Information</h4>
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

                <h4 style="color: var(--primary); margin: 30px 0 20px 0;">Recommendations</h4>
                <ul style="padding-left: 20px; color: var(--text-secondary); line-height: 1.8;">
                    <li>Soil nutrients (N:${npk.N}, P:${npk.P}, K:${npk.K}) are well-suited for ${result.crop}</li>
                    <li>Climate conditions (${climate.temperature}°C, ${climate.humidity}% humidity) are optimal</li>
                    <li>Consider soil testing for precise nutrient management</li>
                    <li>Consult local agricultural experts for region-specific practices</li>
                </ul>
            </div>
        `;
        showToast('Recommendation ready!', 'success');
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="glass-panel" style="padding: 20px; border-left: 4px solid var(--danger); background: rgba(239, 68, 68, 0.1);">
                <h4 style="color: var(--danger); margin-top: 0;">Error</h4>
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
            <p>Loading discussions...</p>
        </div>
    `;

    try {
        const response = await fetch(`${API_URL}/community/posts`);
        const data = await response.json();

        if (data.posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                    <h3 style="font-size: 2rem; margin-bottom: 10px;">No discussions yet</h3>
                    <p class="text-muted">Be the first to share your farming insights!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.posts.map(post => {
            const isOwnPost = currentUser && post.user_id == currentUser.id;
            const deleteBtn = isOwnPost ? `<button onclick="deletePost(${post.id})" class="btn-secondary btn-sm" style="padding: 6px 12px; font-size: 0.75rem; background: rgba(239, 68, 68, 0.1); color: var(--danger); border-color: rgba(239, 68, 68, 0.2);">Delete</button>` : '';
            const initial = (post.username || 'U')[0].toUpperCase();

            return `
                <div class="post-card" id="post-${post.id}" onclick="viewPostDetails(${post.id})">
                    ${post.image_url ? `
                        <div class="post-image-container">
                            <img src="${post.image_url}" class="post-image" alt="Post attachment">
                        </div>
                    ` : `
                        <div class="post-image-container" style="background: rgba(16, 185, 129, 0.06); display: flex; align-items: center; justify-content: center; color: var(--primary); opacity: 0.4; flex-shrink: 0;">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                    `}

                    <div class="post-main-content" style="flex: 1; display: flex; flex-direction: column; gap: 6px; overflow: hidden; min-width: 0;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                            <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                                <div class="user-avatar" style="width: 26px; height: 26px; font-size: 0.7rem; flex-shrink: 0;">${initial}</div>
                                <span style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${post.username || 'User'}</span>
                                <span style="font-size: 0.75rem; color: var(--text-tertiary); white-space: nowrap;">${new Date(post.created_at).toLocaleDateString()}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;" onclick="event.stopPropagation()">
                                ${post.category ? `<span class="post-tag">${post.category.toUpperCase()}</span>` : ''}
                                ${isOwnPost ? `<button onclick="deletePost(event, ${post.id})" class="btn-secondary btn-sm" style="padding: 4px 10px; font-size: 0.75rem; background: rgba(239, 68, 68, 0.1); color: var(--danger); border-color: rgba(239, 68, 68, 0.2);">Delete</button>` : ''}
                            </div>
                        </div>

                        <div class="post-content" style="flex: 1;">
                            <h3>${post.title}</h3>
                            <p>${post.content}</p>
                        </div>

                        <div class="post-footer">
                            <div class="action-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                                <span>${post.answer_count || 0} Replies</span>
                            </div>
                            <div class="read-more">
                                <span>Read Discussion</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">âš ï¸</div>
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
                const deleteAnswerBtn = isOwnAnswer ? `<button onclick="deleteAnswer(${answer.id}, ${post.id}, event)" class="btn-secondary btn-sm" style="padding: 4px 10px; font-size: 0.75rem; background: rgba(239, 68, 68, 0.1); color: var(--danger); border-color: rgba(239, 68, 68, 0.2);">Delete</button>` : '';
                const answerInitial = (answer.username || 'U')[0].toUpperCase();

                return `
                    <div class="answer-card">
                        <div class="answer-header">
                            <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.9rem;">${answerInitial}</div>
                            <div class="post-meta">
                                <span class="post-username">${answer.username || 'User'}</span>
                                <span class="post-date">${new Date(answer.created_at).toLocaleDateString()}</span>
                            </div>
                            <div style="margin-left: auto; display: flex; align-items: center; gap: 10px;">
                                ${deleteAnswerBtn}
                            </div>
                        </div>
                        <p style="color: var(--text-primary); line-height: 1.6; margin: 0;">${answer.content}</p>
                        
                        <div class="answer-actions">
                            <button class="reaction-btn like" onclick="reactToAnswer(${answer.id}, 'like', event, ${post.id})">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                                <span>${answer.likes || 0}</span>
                            </button>
                            <button class="reaction-btn dislike" onclick="reactToAnswer(${answer.id}, 'dislike', event, ${post.id})">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10zM17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>
                                <span>${answer.dislikes || 0}</span>
                            </button>
                        </div>
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
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 80px;">
                     <button onclick="loadPosts()" class="btn-secondary" style="display: flex; align-items: center; gap: 8px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        Back to Feed
                     </button>
                    ${deleteBtn}
                </div>
                
                <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--glass-border); border-radius: 24px; padding: 30px; cursor: default; margin-bottom: 2rem;">
                    <div class="post-header">
                        <div class="user-avatar">${initial}</div>
                        <div class="post-meta" style="flex: 1;">
                            <h4>${post.username || 'User'}</h4>
                            <span class="post-date">${new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                        ${post.category ? `<span class="post-tag">${post.category.toUpperCase()}</span>` : ''}
                    </div>

                    <div>
                        <h2 style="font-size: 2rem; margin-bottom: 15px; font-family: 'Syne', sans-serif; line-height: 1.3;">${post.title}</h2>
                        ${post.image_url ? `<img src="${post.image_url}" alt="Post attachment" style="width: 100%; max-height: 500px; object-fit: cover; border-radius: 16px; margin-bottom: 20px; border: 1px solid var(--glass-border);">` : ''}
                        <p style="font-size: 1.05rem; line-height: 1.7; color: var(--text-secondary);">${post.content}</p>
                    </div>
                </div>

                <div class="answer-section" style="margin-top: 100px;">
                    <h3 style="margin: 0 0 30px; font-family: 'Syne', sans-serif; font-size: 1.8rem;">Discussions (${post.answers ? post.answers.length : 0})</h3>
                    <div class="answer-list">
                        ${answersHtml}
                    </div>
                </div>
                
                ${token ? `
                    <div class="glass-panel" style="padding: 24px; margin-top: 80px; border-radius: 20px;">
                        <h4 style="margin-bottom: 15px;">Join the discussion</h4>
                        <textarea id="answer-content" placeholder="Share your insights..." rows="3" style="width: 100%; resize: none; border-radius: 12px; padding: 15px; background: rgba(0,0,0,0.2); margin-bottom: 24px; display: block; border: 1px solid var(--glass-border); color: white;"></textarea>
                        <div style="display: flex; justify-content: flex-end;">
                            <button onclick="submitAnswer(${post.id})" class="btn-primary" style="padding: 12px 30px; flex-shrink: 0;">Post Reply</button>
                        </div>
                    </div>
                ` : '<div class="glass-panel p-6 text-center" style="padding: 30px; text-align: center; margin-top: 80px;">Please sign in to join the discussion</div>'}
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<div class="empty-state"><h3>Failed to load post</h3></div>';
        showToast('Failed to load post', 'error');
    }
}

// React to an answer (like / dislike)
async function reactToAnswer(answerId, action, event, postId) {
    if (event) event.stopPropagation();
    if (!token) {
        showToast('Please sign in to react', 'error');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/community/answers/${answerId}/${action}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to react');
        const data = await response.json();
        // Instant visual feedback and full refresh to sync state
        showToast(action === 'like' ? 'Liked!' : 'Disliked!', 'success');
        viewPostDetails(_currentDetailPostId || postId);
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

        showToast('Answer posted!', 'success');
        viewPostDetails(postId); // Reload post to show new answer
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Delete post
async function deletePost(event, postId) {
    event.stopPropagation();
    if (!confirm('Delete this post?')) return;

    try {
        const response = await fetch(`${API_URL}/community/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to delete post');
        showToast('Post deleted', 'success');
        loadPosts();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Delete answer
let _currentDetailPostId = null;

async function deleteAnswer(answerId, postId, event) {
    if (event) event.stopPropagation();
    if (postId) _currentDetailPostId = postId;
    if (!confirm('Delete this reply?')) return;

    try {
        const response = await fetch(`${API_URL}/community/answers/${answerId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to delete reply');
        showToast('Reply deleted', 'success');
        if (_currentDetailPostId) {
            viewPostDetails(_currentDetailPostId);
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
        <div class="reveal reveal-up active" style="max-width: 800px; margin: 0 auto; padding-bottom: 60px;">
             <!-- Back Button & Header -->
             <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px; gap: 20px;">
                 <button onclick="loadPosts()" class="btn-secondary" style="display: flex; align-items: center; gap: 10px; padding: 10px 20px; border-radius: 12px; font-weight: 600;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                    Back to Feed
                 </button>
                 <div style="text-align: right;">
                    <span style="font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--primary); letter-spacing: 0.15em; display: block; margin-bottom: 4px;">Community</span>
                    <h2 style="margin: 0; font-family: 'Syne', sans-serif; font-size: 1.5rem; letter-spacing: -0.02em;">Digital Agora</h2>
                 </div>
            </div>

            <!-- Main Form Card -->
            <div class="glass-panel" style="padding: 3rem; border-radius: 35px; border: 1px solid var(--glass-border); background: var(--glass-surface); box-shadow: var(--shadow-glow);">
                <div style="margin-bottom: 40px; text-align: center;">
                    <div style="width: 60px; height: 60px; background: rgba(16, 185, 129, 0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; border: 1px solid rgba(16, 185, 129, 0.2);">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <h2 style="font-size: 2.2rem; margin: 0; font-family: 'Syne', sans-serif; letter-spacing: -0.01em;">Create New <span style="color: var(--primary);">Discussion</span></h2>
                    <p style="color: var(--text-secondary); margin-top: 10px; font-size: 1rem;">Share your wisdom or ask the community for help.</p>
                </div>
                
                <form id="create-post-form" onsubmit="submitPost(event)" style="display: flex; flex-direction: column; gap: 25px;">
                    <div class="form-group-premium">
                        <label style="display: block; margin-bottom: 10px; color: var(--text-tertiary); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Discussion Title</label>
                        <div style="position: relative;">
                            <input type="text" id="post-title" placeholder="Give your post a clear title" required 
                                   style="width: 100%; padding: 18px 20px; border-radius: 16px; background: rgba(0,0,0,0.25); border: 1px solid var(--glass-border); color: white; font-size: 1.1rem; transition: all 0.3s ease;">
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr; gap: 25px;">
                        <div class="form-group-premium">
                            <label style="display: block; margin-bottom: 10px; color: var(--text-tertiary); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Category</label>
                            <div style="position: relative;">
                                <select id="post-category" style="width: 100%; padding: 18px 20px; border-radius: 16px; background: rgba(0,0,0,0.25); border: 1px solid var(--glass-border); color: white; font-size: 1rem; appearance: none; cursor: pointer;">
                                    <option value="general">General Discussion</option>
                                    <option value="crops">Crops & Yield</option>
                                    <option value="pests">Pest & Disease Management</option>
                                    <option value="soil">Soil & Fertilizer</option>
                                    <option value="market">Market & Pricing</option>
                                </select>
                                <div style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); pointer-events: none; opacity: 0.5;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="form-group-premium">
                        <label style="display: block; margin-bottom: 10px; color: var(--text-tertiary); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Content</label>
                        <textarea id="post-content" placeholder="Share your question, experience, or findings with fellow farmers..." required 
                                  style="width: 100%; height: 220px; padding: 20px; border-radius: 18px; background: rgba(0,0,0,0.25); border: 1px solid var(--glass-border); color: white; resize: vertical; line-height: 1.7; font-size: 1.05rem;"></textarea>
                    </div>
                    
                    <div class="form-group-premium">
                        <label style="display: block; margin-bottom: 12px; color: var(--text-tertiary); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Media</label>
                        <div style="display: flex; flex-direction: column; gap: 15px;">
                            <input type="file" id="post-image" accept="image/*" onchange="previewImage(this, 'post-image-preview')" style="display: none;">
                            <button type="button" onclick="document.getElementById('post-image').click()" class="btn-secondary" style="width: fit-content; padding: 14px 28px; display: flex; align-items: center; gap: 10px; border-radius: 14px; font-weight: 700; font-size: 0.9rem;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                Add Visual Context
                            </button>
                            <div id="post-image-preview" style="margin-top: 10px; animation: scaleIn 0.3s ease-out;"></div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; margin-top: 20px;">
                        <button type="submit" class="btn-primary" style="padding: 20px; border-radius: 18px; font-size: 1.1rem; font-weight: 800; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: center; gap: 10px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            Post Discussion
                        </button>
                        <button type="button" onclick="loadPosts()" class="btn-secondary" style="padding: 20px; border-radius: 18px; font-weight: 700; font-size: 1.1rem;">Cancel</button>
                    </div>
                </form>
            </div>
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
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!response.ok) throw new Error('Failed to create post');
        showToast('Post created successfully!', 'success');
        loadPosts();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Disease Detection Functions
function previewPestImage(event) {
    const file = event.target.files[0];
    const previewDiv = document.getElementById('pest-preview');
    const uploadFrame = document.getElementById('pest-upload-frame');
    const analyzeBtn = document.getElementById('analyze-btn');

    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            previewDiv.innerHTML = `
                <div class="scanner-shell" id="preview-scanner-shell" style="cursor: pointer; position: relative;" onclick="document.getElementById('pest-upload').click()" title="Click to change photo">
                    <div class="scanner-line" id="preview-scanner-line"></div>
                    <img src="${e.target.result}" style="max-width: 100%; max-height: 400px; display: block; border-radius: 12px; border: 1px solid var(--glass-border);">
                    <div style="position: absolute; bottom: 15px; right: 15px; background: var(--primary); color: #061109; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4);">REPLACE IMAGE</div>
                </div>
            `;
            if (uploadFrame) uploadFrame.style.display = 'none';
            if (analyzeBtn) analyzeBtn.style.display = 'block';
        }
        reader.readAsDataURL(file);
    } else {
        previewDiv.innerHTML = '';
        if (uploadFrame) uploadFrame.style.display = 'block';
        if (analyzeBtn) analyzeBtn.style.display = 'none';
    }
}

// Pest & Disease image analysis - INTEGRATED ML MODELS
async function analyzePestImage() {
    const fileInput = document.getElementById('pest-upload');
    const resultDiv = document.getElementById('pest-result');
    const progressDiv = document.getElementById('diagnostic-progress');
    const scannerShell = document.getElementById('preview-scanner-shell');
    const analyzeBtn = document.getElementById('analyze-btn');

    if (!fileInput.files[0]) return;
    
    // Start Scanner UI
    if (scannerShell) scannerShell.classList.add('scanning');
    if (analyzeBtn) analyzeBtn.disabled = true;
    if (resultDiv) resultDiv.style.display = 'none';

    try {
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        formData.append('language', 'en');

        const response = await fetch(`${API_URL}/ml/detect`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Diagnostic Engine encountered an error');

        const result = await response.json();

        // Stop Scanner
        if (scannerShell) scannerShell.classList.remove('scanning');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.style.display = 'none'; // Hide after result
        }

        const primaryDetection = result.detections[0] || {};
        const isHealthy = primaryDetection.is_healthy;
        
        // Strip markdown stars from disease name
        const diseaseName = (primaryDetection.disease || 'Unknown').replace(/\*/g, '');
        
        // Correctly pull confidence/severity score from the detection object
        const combinedConf = primaryDetection.confidence || primaryDetection.severity_percentage || 0;
        const recommendationTex = primaryDetection.recommendation || '';

        // Severity & Confidence logic
        const severity = combinedConf > 70 ? 'High' : (combinedConf > 30 ? 'Moderate' : 'Low');
        let statusColor = isHealthy ? '#10b981' : (severity === 'High' ? '#ef4444' : (severity === 'Moderate' ? '#f59e0b' : '#3b82f6'));
        let statusLabel = isHealthy ? 'Healthy Condition' : `${severity} Severity Detection`;
        
        let html = `
            <div class="result-card-premium reveal active" style="text-align: left; animation: scaleIn 0.3s ease-out; padding: 2.5rem; border-radius: 30px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--glass-border);">
                <!-- Header: Title & Status -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; gap: 20px;">
                    <div style="flex: 1;">
                        <span style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.15em; display: block; margin-bottom: 5px;">Diagnostic Result</span>
                        <h2 style="margin: 0; font-family: 'Syne', sans-serif; font-size: 2rem; color: #fff; line-height: 1.1;">${isHealthy ? 'Plant is Healthy!' : diseaseName}</h2>
                    </div>
                    <div style="text-align: right; flex-shrink: 0;">
                        <div style="background: ${isHealthy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)'}; padding: 8px 16px; border-radius: 12px; border: 1px solid ${statusColor}44;">
                            <span style="display: block; font-size: 0.65rem; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700; margin-bottom: 2px;">Severity</span>
                            <span style="color: ${statusColor}; font-weight: 800; font-size: 1rem;">${statusLabel}</span>
                        </div>
                    </div>
                </div>

                <!-- Severity / Health Progress Bar -->
                <div style="margin-bottom: 30px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.85rem; font-weight: 700;">
                        <span style="color: var(--text-secondary);">${isHealthy ? 'Health Condition Score' : 'Infection Severity Score'}</span>
                        <span style="color: ${statusColor};">${combinedConf.toFixed(1)}%</span>
                    </div>
                    <div class="confidence-track" style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
                        <div class="confidence-bar" style="width: ${combinedConf}%; height: 100%; background: linear-gradient(90deg, ${statusColor}aa, ${statusColor}); border-radius: 20px; box-shadow: 0 0 15px ${statusColor}44;"></div>
                    </div>
                </div>

                <!-- Brief Description -->
                <div style="padding: 20px; border-radius: 18px; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); margin-bottom: 30px;">
                     <p style="margin: 0; color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6;">
                        ${isHealthy 
                            ? 'Our AI vision models have analyzed the leaf texture, color distribution, and structural integrity. No significant pathogens or nutrient deficiencies were detected.' 
                            : (primaryDetection.description || `The diagnostic engine has identified signs of ${diseaseName}. This condition can impact yield if left untreated.`)}
                     </p>
                </div>
                
                <!-- Actionable Points -->
                <div style="padding: 24px; border-radius: 22px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.04), rgba(16, 185, 129, 0.01)); border: 1px solid rgba(16, 185, 129, 0.15);">
                     <h4 style="color: var(--primary); font-size: 1.1rem; margin-top: 0; margin-bottom: 20px; font-family: 'Syne', sans-serif; display: flex; align-items: center; gap: 10px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        Prevention & Treatment Plan
                     </h4>
                     <div style="color: var(--text-primary);">
                        ${formatChatMessage(recommendationTex)}
                     </div>
                </div>

                <div style="margin-top: 35px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                     <button class="btn-secondary" onclick="document.getElementById('pest-upload').click()" style="border-radius: 16px; font-size: 0.9rem; padding: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(255,255,255,0.03);">
                        New Scan
                     </button>
                     <button class="btn-primary" onclick="window.scrollTo({top: 0, behavior: 'smooth'})" style="border-radius: 16px; font-size: 0.9rem; padding: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                        Back to Top
                     </button>
                </div>
            </div>
        `;

        resultDiv.innerHTML = html;
        resultDiv.style.display = 'block';
        showToast('Diagnosis complete', 'success');

        resultDiv.innerHTML = html;
        resultDiv.style.display = 'block';
        
        // Auto-scroll to result
        setTimeout(() => {
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);

        showToast('Clinical analysis complete!', 'success');

    } catch (error) {
        if (scannerShell) scannerShell.classList.remove('scanning');
        if (analyzeBtn) analyzeBtn.disabled = false;
        
        resultDiv.innerHTML = `
            <div class="glass-panel" style="padding:30px; border-radius:24px; border:1px solid rgba(239,68,68,0.3); background:rgba(239,68,68,0.05); text-align:center;">
                <h4 style="color:#ef4444; margin-bottom:10px;">Diagnostic Engine Failure</h4>
                <p style="color:var(--text-secondary);">${error.message}. Please try again with a clearer photo.</p>
                <button onclick="document.getElementById('pest-upload').click()" class="btn-primary" style="margin-top:20px;">Retry Photo Upload</button>
            </div>
        `;
        resultDiv.style.display = 'block';
        showToast('Analysis failed', 'error');
    }
}

// Expert Advisor Workflow - Construct Structured Input
async function consultAIExpert() {
    if (!lastAnalysisResult) {
        showToast('Please perform an analysis first.', 'info');
        return;
    }

    const res = lastAnalysisResult;
    
    // Construct Structured Input for the Master Prompt
    let structuredInput = "-----------------------------\nINPUT FORMAT\n-----------------------------\n";
    
    // 1. Disease
    const diseaseName = res.disease.disease || 'Unknown/None';
    const diseaseConf = res.disease.confidence || 0;
    structuredInput += `Disease:\n- Name: ${diseaseName}\n- Confidence: ${diseaseConf}%\n\n`;
    
    // 2. Pest
    const hasPest = res.pest.confidence > 30;
    const pestName = res.pest.pest || 'None detected';
    const pestConf = res.pest.confidence || 0;
    structuredInput += `Pest:\n- Detected: ${hasPest}\n- Name: ${pestName}\n- Severity: ${pestConf > 70 ? 'High' : 'Medium'}\n- Confidence: ${pestConf}%\n\n`;
    
    // 3. Crop Recommendation (Placeholder or stored from previous run)
    structuredInput += `Crop Recommendation:\n- Top Crops:\n  1. Rice (85%)\n  2. Maize (70%)\n  3. Wheat (60%)\n\n`;
    
    // 4. Environment (Dynamic from localStorage if available, otherwise fallback)
    const envDataStr = localStorage.getItem('agri_env_data');
    let envData = { temperature: 28, humidity: 65, rainfall: 150, ph: 6.5, soilType: 'Unknown' };
    
    if (envDataStr) {
        try {
            const saved = JSON.parse(envDataStr);
            envData = { ...envData, ...saved };
        } catch (e) { console.error("Error parsing env data", e); }
    }
    
    structuredInput += `Environment Data:\n- Soil Type: ${envData.soilType}\n- Temperature: ${envData.temperature}°C\n- Humidity: ${envData.humidity}%\n- Rainfall: ${envData.rainfall}mm\n- Soil pH: ${envData.ph}\n\n`;
    
    structuredInput += "Please provide the Expert Report now.";

    // Open Chat and Send
    const window = document.getElementById('ai-assistant-window');
    if (window && !window.classList.contains('show')) {
        toggleAIAssistant();
    }
    
    // Add to chat manually as a "System Analysis" trigger
    addMessageToChat("Requesting Expert Analysis Report...", 'user');
    const typingId = showTypingIndicator();
    
    try {
        const response = await fetch(`${API_URL}/chatbot/message`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: structuredInput,
                language: currentChatLang
            })
        });

        if (!response.ok) throw new Error('Expert brain is currently offline.');
        const data = await response.json();
        removeTypingIndicator(typingId);
        
        const botMsg = data.response || "Expert analysis could not be completed at this time.";
        addMessageToChat(botMsg, 'bot');
        saveToHistory(botMsg, 'bot');
        
    } catch (error) {
        removeTypingIndicator(typingId);
        addMessageToChat(error.message, 'bot');
    }
}

// Active filters state
const _cropFilters = { season: null, water: null, type: null };

function _initCropListing() {
    _renderPopularCrops();
    _renderSeasonalSuggestions();
    renderCropGrid();
}

// ── Popular Crops Section ──
function _renderPopularCrops() {
    const row = document.getElementById('popular-crops-row');
    if (!row || typeof window.CROPS_DB === 'undefined') return;
    const popular = window.CROPS_DB.filter(c => window.POPULAR_CROP_IDS.includes(c.id));
    row.innerHTML = popular.map(crop => `
        <div class="popular-crop-pill" onclick="viewCropDetail(${crop.id})">
            <img src="${crop.image}" alt="${crop.name}" loading="lazy">
            <span>${crop.name}</span>
        </div>
    `).join('');
}

// ── Seasonal Suggestions ──
function _renderSeasonalSuggestions() {
    const container = document.getElementById('seasonal-suggestion-section');
    if (!container || typeof window.CROPS_DB === 'undefined') return;

    const season = window.getCurrentSeason();
    const seasonLabel = window.SEASON_LABELS[season];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = monthNames[new Date().getMonth()];
    const seasonalCrops = window.CROPS_DB.filter(c => c.season === season).slice(0, 8);

    container.innerHTML = `
        <div class="seasonal-banner">
            <div class="seasonal-banner-info">
                <div class="seasonal-banner-title">${seasonLabel} Season Crops</div>
                <div class="seasonal-banner-sub">Recommended crops for ${currentMonth} — ${seasonLabel} season</div>
            </div>
            <div class="seasonal-crops-mini">
                ${seasonalCrops.map(crop => `
                    <div class="seasonal-crop-mini-card" onclick="viewCropDetail(${crop.id})">
                        <div class="mini-name">${crop.name.split(' ')[0]}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ── Toggle AI Recommendation Panel ──
function toggleAIRecoPanel() {
    const panel = document.getElementById('ai-reco-panel');
    const chevron = document.getElementById('ai-reco-chevron');
    if (!panel || !chevron) return;

    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        chevron.style.transform = 'rotate(180deg)';
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        panel.style.display = 'none';
        chevron.style.transform = 'rotate(0deg)';
    }
}

// ── Toggle Filter Panel ──
function toggleCropFilterPanel() {
    const panel = document.getElementById('crop-filter-panel');
    const btn = document.getElementById('crop-filter-toggle-btn');
    if (!panel || !btn) return;

    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        btn.style.background = 'rgba(74, 222, 128, 0.2)';
        btn.style.color = '#4ade80';
        btn.style.borderColor = 'rgba(74, 222, 128, 0.4)';
    } else {
        panel.style.display = 'none';
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
    }
}


// ── Filter chip toggle ──
function toggleCropChip(el) {
    const type = el.dataset.filterType;
    const val = el.dataset.filterVal;

    // Deactivate siblings
    el.closest('.crop-filter-chips').querySelectorAll('.crop-chip').forEach(chip => {
        chip.classList.remove('active');
    });

    if (_cropFilters[type] === val) {
        // toggle off
        _cropFilters[type] = null;
    } else {
        _cropFilters[type] = val;
        el.classList.add('active');
    }
    renderCropGrid();
}

// ── Clear all filters ──
function clearCropFilters() {
    _cropFilters.season = null;
    _cropFilters.water = null;
    _cropFilters.type = null;
    document.querySelectorAll('.crop-chip').forEach(c => c.classList.remove('active'));
    const searchInput = document.getElementById('crop-search-input');
    if (searchInput) searchInput.value = '';
    renderCropGrid();
}

// ── Build a crop card HTML ──
function _buildCropCard(crop) {
    return `
        <div class="crop-browse-card" onclick="viewCropDetail(${crop.id})">
            <div class="crop-browse-card-img-wrap">
                <img class="crop-browse-card-img" src="${crop.image}" alt="${crop.name}" loading="lazy">
            </div>
            <div class="crop-browse-card-body">
                <div class="crop-browse-card-name">${crop.name}</div>
                <div class="crop-browse-card-meta">
                    <div class="crop-meta-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        ${SEASON_LABELS[crop.season]} Season
                    </div>
                    <div class="crop-meta-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                        Water: ${WATER_LABELS[crop.water]}
                    </div>
                    <div class="crop-meta-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        ${crop.duration}
                    </div>
                </div>
                <div class="crop-browse-card-tags">
                    <span class="crop-badge-tag crop-tag-season-${crop.season}">${SEASON_LABELS[crop.season]}</span>
                    <span class="crop-badge-tag crop-tag-water-${crop.water}">${WATER_LABELS[crop.water]} Water</span>
                </div>
            </div>
        </div >
            `;
}

// ── Render the browse grid ──
function renderCropGrid() {
    const grid = document.getElementById('crop-browse-grid');
    const counter = document.getElementById('crop-results-count');
    if (!grid || typeof window.CROPS_DB === 'undefined') return;

    const query = (document.getElementById('crop-search-input')?.value || '').toLowerCase().trim();

    const filtered = window.CROPS_DB.filter(crop => {
        const matchSearch = !query || crop.name.toLowerCase().includes(query);
        const matchSeason = !_cropFilters.season || crop.season === _cropFilters.season;
        const matchWater = !_cropFilters.water || crop.water === _cropFilters.water;
        const matchType = !_cropFilters.type || crop.type === _cropFilters.type;
        return matchSearch && matchSeason && matchWater && matchType;
    });

    if (counter) {
        counter.textContent = `Showing ${filtered.length} of ${window.CROPS_DB.length} crops`;
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="crop-no-results">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <p>No crops match your filters. Try adjusting or clearing them.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(_buildCropCard).join('');
}

// ── Crop Detail View — opens as modal overlay ──
function viewCropDetail(cropId) {
    const crop = (typeof window.CROPS_DB !== 'undefined') ? window.CROPS_DB.find(c => c.id === cropId) : null;
    if (!crop) return;

    // Remove any existing modal
    const existing = document.getElementById('crop-detail-modal-backdrop');
    if (existing) existing.remove();

    const pestsHtml = crop.pests.map(p => `
        <div class="pest-item">
            <div class="pest-name">${p.name}</div>
            <div class="pest-treat">${p.treatment}</div>
        </div>
    `).join('');

    const soilHtml = crop.soil.map(s =>
        `<span class="crop-badge-tag" style="background:rgba(255,255,255,0.06);border:1px solid var(--glass-border);color:var(--text-secondary);">${s}</span>`
    ).join('');

    // Build modal HTML
    const backdrop = document.createElement('div');
    backdrop.id = 'crop-detail-modal-backdrop';
    backdrop.className = 'crop-detail-modal-backdrop';
    backdrop.innerHTML = `
        <div class="crop-detail-modal" id="crop-detail-modal-inner">
            <div class="crop-detail-modal-handle"></div>
            <button class="crop-detail-modal-close" onclick="closeCropDetailModal()" title="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <!-- Hero -->
            <div class="crop-detail-hero" style="margin-bottom:1.5rem;">
                <img src="${crop.image}" alt="${crop.name}">
                <div class="crop-detail-hero-overlay">
                    <div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                            <span class="crop-badge-tag crop-tag-season-${crop.season}">${SEASON_LABELS[crop.season]}</span>
                            <span class="crop-badge-tag crop-tag-water-${crop.water}">${WATER_LABELS[crop.water]} Water</span>
                            <span class="crop-badge-tag" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:var(--text-secondary);">${TYPE_LABELS[crop.type]}</span>
                        </div>
                        <h2>${crop.name}</h2>
                        <p style="color:var(--text-secondary);font-size:0.9rem;margin:0;">${crop.duration}</p>
                    </div>
                </div>
            </div>

            <!-- Info Grid -->
            <div class="crop-detail-sections">
                <div class="crop-detail-card">
                    <h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Basic Information</h4>
                    <div class="crop-detail-row"><span class="label">Name</span><span class="value">${crop.name}</span></div>
                    <div class="crop-detail-row"><span class="label">Season</span><span class="value">${SEASON_LABELS[crop.season]}</span></div>
                    <div class="crop-detail-row"><span class="label">Duration</span><span class="value">${crop.duration}</span></div>
                    <div class="crop-detail-row"><span class="label">Type</span><span class="value">${TYPE_LABELS[crop.type]}</span></div>
                    <div class="crop-detail-row"><span class="label">Soil pH</span><span class="value">${crop.ph}</span></div>
                </div>

                <div class="crop-detail-card">
                    <h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg> Water Requirement</h4>
                    <div class="crop-detail-row"><span class="label">Level</span><span class="value">${WATER_LABELS[crop.water]}</span></div>
                    <div class="crop-detail-row"><span class="label">Irrigation</span><span class="value" style="max-width:55%;line-height:1.4;">${crop.irrigation}</span></div>
                </div>

                <div class="crop-detail-card">
                    <h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l1.5 21L12 21l7.5 3L21 3z"/></svg> Soil Requirement</h4>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">${soilHtml}</div>
                </div>

                <div class="crop-detail-card">
                    <h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83"/></svg> Seed Rate</h4>
                    <div class="crop-detail-row"><span class="label">Per Acre</span><span class="value">${crop.seedRate}</span></div>
                </div>

                <div class="crop-detail-card">
                    <h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Fertilizer Guide</h4>
                    <div class="crop-detail-row"><span class="label">NPK / Acre</span><span class="value" style="max-width:55%;line-height:1.4;">${crop.npk}</span></div>
                </div>

                <div class="crop-detail-card">
                    <h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h4v4H3zM17 3h4v4h-4zM3 17h4v4H3zM17 17h4v4h-4zM7 5h10M5 7v10M19 7v10M7 19h10"/></svg> Harvest</h4>
                    <div class="crop-detail-row"><span class="label">Ready in</span><span class="value">${crop.harvest}</span></div>
                    <div class="crop-detail-row"><span class="label">Expected Yield</span><span class="value">${crop.yield}</span></div>
                </div>

                <div class="crop-detail-card full-width">
                    <h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Common Diseases &amp; Treatment</h4>
                    ${pestsHtml}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(backdrop);
    // Prevent scroll on body
    document.body.style.overflow = 'hidden';

    // Trigger open animation on next frame
    requestAnimationFrame(() => {
        requestAnimationFrame(() => backdrop.classList.add('open'));
    });

    // Close on backdrop click (outside modal panel)
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeCropDetailModal();
    });

    // Close on Escape key
    const escHandler = (e) => {
        if (e.key === 'Escape') { closeCropDetailModal(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);
}

function closeCropDetailModal() {
    const backdrop = document.getElementById('crop-detail-modal-backdrop');
    if (!backdrop) return;
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => backdrop.remove(), 350);
}

// --- Advanced Chatbot Functions ---

function setChatLang(langCode) {
    currentChatLang = langCode;
    // Refresh the whole UI to update labels and quick prompts
    showFeature('assistant');
    // Reload chat history to show the localized welcome message if empty
    loadChatHistory();
}

function handleQuickPrompt(text) {
    const input = document.getElementById('chat-input');
    if (input) {
        input.value = text;
        sendChatMessage();
    }
}

function clearChatHistory() {
    chatHistory = [];
    localStorage.removeItem('chatHistory');
    
    // Stop any ongoing voice
    stopSpeaking();
    
    // Full reset of the chat window
    const container = document.getElementById('chat-messages');
    if (container) container.innerHTML = '';
    
    loadChatHistory();
    showToast('Conversation cleared', 'info');
}

function loadChatHistory() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    container.innerHTML = '';

    if (chatHistory.length === 0) {
        addMessageToChat(CHAT_DATA[currentChatLang].welcome, 'bot');
    } else {
        chatHistory.forEach(msg => addMessageToChat(msg.text, msg.sender, false));
    }
}

function saveToHistory(text, sender) {
    chatHistory.push({ text, sender });
    if (chatHistory.length > 12) chatHistory.shift();
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

function isAgriRelated(text) {
    const textLower = text.toLowerCase();
    const allKeywords = Object.values(CHAT_DATA).flatMap(d => d.keywords);
    return allKeywords.some(kw => textLower.includes(kw));
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const message = input.value.trim();
    if (!message) return;

    // Reset TTS
    stopSpeaking();

    // Relaxed Guardrail: Let the LLM handle context check for better trilingual support
    /*
    if (!isAgriRelated(message)) {
        addMessageToChat(message, 'user');
        addMessageToChat(CHAT_DATA[currentChatLang].guardMessage, 'bot');
        input.value = '';
        return;
    }
    */

    addMessageToChat(message, 'user');
    saveToHistory(message, 'user');
    input.value = '';

    // 1. Check Professional Knowledge Base First (Priority for both Online & Offline)
    const proKnowledge = CHAT_DATA[currentChatLang].knowledgeBase;
    let proAnswer = null;
    
    // Case-insensitive & normalized lookup
    const normalizedInput = message.toLowerCase().trim().replace(/[?!.]$/, '');
    if (proKnowledge) {
        // Try exact match first
        if (proKnowledge[message]) {
            proAnswer = proKnowledge[message];
        } else {
            // Try normalized match
            const bestMatchKey = Object.keys(proKnowledge).find(key => 
                key.toLowerCase().trim().replace(/[?!.]$/, '') === normalizedInput
            );
            if (bestMatchKey) proAnswer = proKnowledge[bestMatchKey];
        }
    }

    if (proAnswer) {
        const typingId = showTypingIndicator(); // Short visual feedback for 'Instant' feel
        setTimeout(() => {
            removeTypingIndicator(typingId);
            addMessageToChat(proAnswer, 'bot');
            saveToHistory(proAnswer, 'bot');
            if (lastInputWasVoice) speakText(proAnswer);
        }, 300);
        return;
    }

    // 2. Offline Mode Support (for non-predefined questions)
    if (!navigator.onLine) {
        const cached = offlineCache[message.toLowerCase()];
        if (cached) {
            setTimeout(() => {
                addMessageToChat(cached, 'bot');
                saveToHistory(cached, 'bot');
                if (lastInputWasVoice) speakText(cached);
            }, 500);
        } else {
            addMessageToChat("I'm currently offline and don't have this professional answer cached.", 'bot');
        }
        return;
    }

    const typingId = showTypingIndicator();

    try {
        const response = await fetch(`${API_URL}/chatbot/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: message,
                language: currentChatLang,
                history: chatHistory.slice(-6)
            })
        });

        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        removeTypingIndicator(typingId);

        const botMsg = data.response || "I'm having trouble understanding right now.";
        addMessageToChat(botMsg, 'bot', true, data.backend);
        saveToHistory(botMsg, 'bot');

        // Auto-Read if input was voice
        if (lastInputWasVoice) {
            speakText(botMsg);
            lastInputWasVoice = false; // Reset
        }

        // Update Offline Cache
        offlineCache[message.toLowerCase()] = botMsg;
        const cacheKeys = Object.keys(offlineCache);
        if (cacheKeys.length > 50) delete offlineCache[cacheKeys[0]];
        localStorage.setItem('offlineCache', JSON.stringify(offlineCache));

    } catch (error) {
        removeTypingIndicator(typingId);
        addMessageToChat("Sorry, I'm having trouble connecting to the brain.", 'bot');
    }
}

function addMessageToChat(message, sender, animate = true, backend = null) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const messageRow = document.createElement('div');
    messageRow.style.display = 'flex';
    messageRow.style.flexDirection = 'column';
    messageRow.style.width = '100%';
    messageRow.style.marginBottom = '8px';

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender === 'bot' ? 'ai-bubble' : 'user-bubble'}`;
    
    const isBot = sender === 'bot';
    let label = isBot ? 'Agromind AI' : 'You';
    if (isBot && backend) {
        label += ` (${backend})`;
    }

    let html = `
        <div style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; opacity: 0.6; ${isBot ? '' : 'text-align: right;'}">
            ${label}
        </div>
        <div style="display: flex; align-items: flex-start; gap: 10px; ${isBot ? 'flex-direction: row;' : 'flex-direction: row-reverse;'}">
            <div class="message-content" style="flex: 1;">${formatChatMessage(message)}</div>
        </div>
    `;

    if (isBot) {
        html += `
            <button onclick="speakText(\`${message.replace(/`/g, "\\`")}\`)" class="btn-voice-read" title="Listen">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            </button>
        `;
    }

    bubble.innerHTML = html;
    messageRow.appendChild(bubble);
    container.appendChild(messageRow);
    
    // Smooth scroll to bottom
    container.scrollTo({
        top: container.scrollHeight,
        behavior: animate ? 'smooth' : 'auto'
    });
}

function showTypingIndicator() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const id = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.id = id;
    typingDiv.style.display = 'flex';
    typingDiv.style.justifyContent = 'flex-start';
    typingDiv.style.marginBottom = '15px';
    
    typingDiv.innerHTML = `
        <div class="chat-bubble ai-bubble" style="padding: 10px 16px;">
            <div style="display: flex; gap: 4px; align-items: center;">
                <span style="font-size: 0.75rem; font-weight: 800; opacity: 0.6;">Agromind AI is typing</span>
                <div class="typing-dots" style="display: flex; gap: 2px;">
                    <span style="width: 3px; height: 3px; background: var(--primary); border-radius: 50%; animation: bounce 1s infinite 0s;"></span>
                    <span style="width: 3px; height: 3px; background: var(--primary); border-radius: 50%; animation: bounce 1s infinite 0.2s;"></span>
                    <span style="width: 3px; height: 3px; background: var(--primary); border-radius: 50%; animation: bounce 1s infinite 0.4s;"></span>
                </div>
            </div>
        </div>
    `;
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;
    return id;
}

// Add CSS keyframe for typing dots
if (!document.getElementById('typing-animation-style')) {
    const style = document.createElement('style');
    style.id = 'typing-animation-style';
    style.innerHTML = `
        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
            40% { transform: scale(1); opacity: 1; }
        }
        .voice-play-btn:hover {
            background: rgba(16, 185, 129, 0.1) !important;
            transform: scale(1.1);
            border-color: var(--primary) !important;
        }
        .voice-play-btn:active {
            transform: scale(0.95);
        }
    `;
    document.head.appendChild(style);
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// --- Voice Recognition (STT) ---
function initVoice() {
    try {
        window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (window.SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onresult = (event) => {
                const text = event.results[0][0].transcript;
                const input = document.getElementById('chat-input');
                if (input) {
                    input.value = text;
                    lastInputWasVoice = true; // Mark for auto-read
                    sendChatMessage();
                }
            };

            recognition.onend = () => { isListening = false; updateMicUI(); };
            recognition.onerror = () => { isListening = false; updateMicUI(); };
        }
    } catch (e) { console.error("Speech Recognition initialization failed", e); }
}

function toggleVoiceInput() {
    if (!recognition) {
        showToast('Voice input not available', 'warning');
        return;
    }
    if (isListening) {
        recognition.stop();
    } else {
        recognition.lang = CHAT_DATA[currentChatLang].code;
        recognition.start();
        isListening = true;
        updateMicUI();
    }
}

function updateMicUI() {
    const btn = document.getElementById('mic-btn');
    if (btn) btn.style.color = isListening ? 'var(--primary)' : 'inherit';
}

// --- Text to Speech (TTS) ---
function speakText(text) {
    if (!window.speechSynthesis) return;
    
    // Always stop previous speech before starting new one
    window.speechSynthesis.cancel();
    
    if (!text) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = CHAT_DATA[currentChatLang].voice || 'en-IN';
    utterance.rate = 0.9; // Slightly slower for technical clarity
    window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
    if (window.speechSynthesis && window.speechSynthesis.speaking) window.speechSynthesis.cancel();
}

// Event Listeners
window.addEventListener('online', () => {
    const status = document.getElementById('chat-status');
    if (status) { status.innerText = CHAT_DATA[currentChatLang].status; status.style.color = 'var(--primary)'; }
});

window.addEventListener('offline', () => {
    const status = document.getElementById('chat-status');
    if (status) { status.innerText = CHAT_DATA[currentChatLang].offline; status.style.color = '#ef4444'; }
});



function toggleMobileMenu() {
    const burger = document.getElementById('burger-menu');
    const nav = document.getElementById('nav-links');
    const overlay = document.getElementById('mobile-overlay');
    
    if (burger && nav && overlay) {
        burger.classList.toggle('open');
        nav.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Prevent scroll when menu is open
        document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
    }
}

// Add event listener for burger menu if DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const burger = document.getElementById('burger-menu');
    if (burger) {
        burger.addEventListener('click', toggleMobileMenu);
    }

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('[Service Worker] Registered', reg))
                .catch(err => console.error('[Service Worker] Registration Failed', err));
        });
    }
});

initVoice();
// --- Global Window Exports for HTML onclick handlers ---
window.showPage = showPage;
window.handleSignin = handleSignin;
window.handleSignup = handleSignup;
window.handleSignout = handleSignout;
window.toggleAIAssistant = toggleAIAssistant;
window.handleHeroAIPrompt = handleHeroAIPrompt;
window.showFeature = showFeature;
window.setChatLang = setChatLang;
window.clearChatHistory = clearChatHistory;
window.handleQuickPrompt = handleQuickPrompt;
window.sendChatMessage = sendChatMessage;
window.toggleVoiceInput = toggleVoiceInput;
window.previewPestImage = previewPestImage;
window.analyzePestImage = analyzePestImage;
window.getCropRecommendations = getCropRecommendations;
window.toggleAIRecoPanel = toggleAIRecoPanel;
window.toggleCropFilterPanel = toggleCropFilterPanel;
window.toggleCropChip = toggleCropChip;
window.clearCropFilters = clearCropFilters;
window.renderCropGrid = renderCropGrid;
window.showCreatePost = showCreatePost;
window.handleCreatePost = handleCreatePost;
window.closeCreatePost = closeCreatePost;
window.loadPosts = loadPosts;
window.viewPost = viewPost;
window.handleAnswer = handleAnswer;
window.reactToAnswer = reactToAnswer;
window.deletePost = deletePost;
window.deleteAnswer = deleteAnswer;
window.handleSignout = handleSignout;
window.showToast = showToast;
window.toggleMobileMenu = toggleMobileMenu;
