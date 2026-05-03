// ============================================================
// Agromind AI — Crop Database
// Contains crop info for the Crop Listing & Browsing feature.
// ============================================================

const CROPS_DB = [
    // ---------- CEREALS ----------
    {
        id: 1, name: 'Paddy (Rice)', icon: '🌾', season: 'kharif',
        water: 'high', type: 'cereals', duration: '120–150 days',
        image: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400&q=80',
        soil: ['Clay', 'Loamy', 'Alluvial'],
        ph: '5.5 – 7.0',
        irrigation: 'Standing water / flooding every 3–5 days',
        seedRate: '20–25 kg/acre',
        npk: 'N: 80 kg | P: 40 kg | K: 40 kg per acre',
        pests: [
            { name: 'Brown Plant Hopper', treatment: 'Spray Buprofezin 25 SC @ 1 ml/L' },
            { name: 'Stem Borer', treatment: 'Apply Carbofuran 3G @ 7 kg/acre' }
        ],
        harvest: '120–150 days after sowing',
        yield: '20–25 quintals / acre',
        popular: true
    },
    {
        id: 2, name: 'Wheat', icon: '🌾', season: 'rabi',
        water: 'medium', type: 'cereals', duration: '100–120 days',
        image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80',
        soil: ['Loamy', 'Clay Loam', 'Sandy Loam'],
        ph: '6.0 – 7.5',
        irrigation: 'Every 15–20 days (5–6 irrigations)',
        seedRate: '40–50 kg/acre',
        npk: 'N: 60 kg | P: 30 kg | K: 30 kg per acre',
        pests: [
            { name: 'Aphids', treatment: 'Spray Dimethoate 30 EC @ 2 ml/L' },
            { name: 'Rust', treatment: 'Spray Propiconazole 25 EC @ 1 ml/L' }
        ],
        harvest: '100–120 days after sowing',
        yield: '15–20 quintals / acre',
        popular: false
    },
    {
        id: 3, name: 'Maize (Corn)', icon: '🌽', season: 'kharif',
        water: 'medium', type: 'cereals', duration: '80–100 days',
        image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&q=80',
        soil: ['Sandy Loam', 'Loamy', 'Alluvial'],
        ph: '6.0 – 7.5',
        irrigation: 'Every 10–12 days; critical at tasselling',
        seedRate: '8–10 kg/acre',
        npk: 'N: 60 kg | P: 25 kg | K: 25 kg per acre',
        pests: [
            { name: 'Fall Armyworm', treatment: 'Spray Chlorantraniliprole 18.5 SC @ 0.4 ml/L' },
            { name: 'Stem Borer', treatment: 'Apply Carbofuran 3G in whorls' }
        ],
        harvest: '80–100 days after sowing',
        yield: '20–25 quintals / acre',
        popular: true
    },
    {
        id: 4, name: 'Sorghum (Jowar)', icon: '🌾', season: 'kharif',
        water: 'low', type: 'millets', duration: '90–110 days',
        image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&q=80',
        soil: ['Black', 'Loamy', 'Sandy Loam'],
        ph: '6.0 – 7.5',
        irrigation: 'Every 15–20 days; drought tolerant',
        seedRate: '5–7 kg/acre',
        npk: 'N: 40 kg | P: 20 kg | K: 20 kg per acre',
        pests: [
            { name: 'Shoot Fly', treatment: 'Seed treatment with Thiamethoxam 70 WS' },
            { name: 'Midge', treatment: 'Spray Malathion 50 EC @ 2 ml/L' }
        ],
        harvest: '90–110 days after sowing',
        yield: '10–15 quintals / acre',
        popular: false
    },
    {
        id: 5, name: 'Pearl Millet (Bajra)', icon: '🌾', season: 'kharif',
        water: 'low', type: 'millets', duration: '70–90 days',
        image: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=400&q=80',
        soil: ['Sandy', 'Sandy Loam', 'Well-drained'],
        ph: '6.0 – 7.5',
        irrigation: 'Every 20–25 days; very drought tolerant',
        seedRate: '2–3 kg/acre',
        npk: 'N: 30 kg | P: 15 kg | K: 15 kg per acre',
        pests: [
            { name: 'Downy Mildew', treatment: 'Seed treatment with Metalaxyl 35 WS' },
            { name: 'Ergot', treatment: 'Spray Copper Oxychloride 0.3%' }
        ],
        harvest: '70–90 days after sowing',
        yield: '8–12 quintals / acre',
        popular: false
    },
    // ---------- PULSES ----------
    {
        id: 6, name: 'Chickpea (Gram)', icon: '🫘', season: 'rabi',
        water: 'low', type: 'pulses', duration: '90–100 days',
        image: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&q=80',
        soil: ['Sandy Loam', 'Loamy', 'Black'],
        ph: '6.0 – 8.0',
        irrigation: 'Minimal; 1–2 irrigations at flowering',
        seedRate: '30–35 kg/acre',
        npk: 'N: 20 kg | P: 40 kg | K: 20 kg per acre',
        pests: [
            { name: 'Pod Borer', treatment: 'Spray Bacillus thuringiensis @ 2 g/L' },
            { name: 'Wilt', treatment: 'Seed treatment with Trichoderma viride' }
        ],
        harvest: '90–100 days after sowing',
        yield: '6–8 quintals / acre',
        popular: false
    },
    {
        id: 7, name: 'Lentil (Masoor)', icon: '🫘', season: 'rabi',
        water: 'low', type: 'pulses', duration: '90–120 days',
        image: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=400&q=80',
        soil: ['Loamy', 'Clay Loam'],
        ph: '6.0 – 8.0',
        irrigation: '2–3 irrigations only',
        seedRate: '15–20 kg/acre',
        npk: 'N: 20 kg | P: 30 kg | K: 20 kg per acre',
        pests: [
            { name: 'Aphids', treatment: 'Spray Dimethoate 30 EC @ 1.5 ml/L' }
        ],
        harvest: '90–120 days after sowing',
        yield: '4–6 quintals / acre',
        popular: false
    },
    {
        id: 8, name: 'Moong (Green Gram)', icon: '🫘', season: 'zaid',
        water: 'low', type: 'pulses', duration: '60–75 days',
        image: 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?w=400&q=80',
        soil: ['Sandy Loam', 'Loamy'],
        ph: '6.0 – 7.5',
        irrigation: 'Every 10–12 days; critical at flowering',
        seedRate: '6–8 kg/acre',
        npk: 'N: 20 kg | P: 25 kg | K: 15 kg per acre',
        pests: [
            { name: 'Yellow Mosaic Virus', treatment: 'Use resistant varieties; control whitefly with Imidacloprid' },
            { name: 'Pod Borer', treatment: 'Spray Spinosad 45 SC @ 0.3 ml/L' }
        ],
        harvest: '60–75 days after sowing',
        yield: '4–5 quintals / acre',
        popular: false
    },
    // ---------- OILSEEDS ----------
    {
        id: 9, name: 'Groundnut', icon: '🥜', season: 'kharif',
        water: 'medium', type: 'oilseeds', duration: '100–120 days',
        image: 'https://images.unsplash.com/photo-1590004953392-5aba2e72269a?w=400&q=80',
        soil: ['Sandy Loam', 'Red Sandy', 'Well-drained'],
        ph: '5.5 – 7.0',
        irrigation: 'Every 10–12 days; critical at pegging',
        seedRate: '50–60 kg/acre (shelled)',
        npk: 'N: 20 kg | P: 40 kg | K: 40 kg per acre',
        pests: [
            { name: 'Leaf Miner', treatment: 'Spray Dimethoate 30 EC @ 2 ml/L' },
            { name: 'Tikka Disease', treatment: 'Spray Chlorothalonil 75 WP @ 2 g/L' }
        ],
        harvest: '100–120 days after sowing',
        yield: '8–12 quintals / acre',
        popular: true
    },
    {
        id: 10, name: 'Mustard', icon: '🌼', season: 'rabi',
        water: 'low', type: 'oilseeds', duration: '90–100 days',
        image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80',
        soil: ['Sandy Loam', 'Loamy', 'Well-drained'],
        ph: '6.0 – 7.5',
        irrigation: '2–3 irrigations; at flowering stage',
        seedRate: '2–3 kg/acre',
        npk: 'N: 40 kg | P: 20 kg | K: 20 kg per acre',
        pests: [
            { name: 'Aphids', treatment: 'Spray Dimethoate 30 EC @ 1.5 ml/L' },
            { name: 'Alternaria Blight', treatment: 'Spray Iprodione 50 WP @ 2 g/L' }
        ],
        harvest: '90–100 days after sowing',
        yield: '5–8 quintals / acre',
        popular: false
    },
    // ---------- VEGETABLES ----------
    {
        id: 11, name: 'Tomato', icon: '🍅', season: 'rabi',
        water: 'medium', type: 'vegetables', duration: '70–90 days',
        image: 'https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=400&q=80',
        soil: ['Sandy Loam', 'Loamy', 'Well-drained'],
        ph: '6.0 – 7.0',
        irrigation: 'Drip irrigation; every 3–4 days',
        seedRate: '100–150 g/acre (transplant)',
        npk: 'N: 60 kg | P: 40 kg | K: 60 kg per acre',
        pests: [
            { name: 'Fruit Borer', treatment: 'Spray Emamectin Benzoate 5 SG @ 0.4 g/L' },
            { name: 'Late Blight', treatment: 'Spray Mancozeb 75 WP @ 2.5 g/L' }
        ],
        harvest: '70–90 days after transplanting',
        yield: '80–100 quintals / acre',
        popular: true
    },
    {
        id: 12, name: 'Onion', icon: '🧅', season: 'rabi',
        water: 'medium', type: 'vegetables', duration: '100–130 days',
        image: 'https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400&q=80',
        soil: ['Sandy Loam', 'Loamy', 'Well-drained'],
        ph: '6.0 – 7.5',
        irrigation: 'Every 7–8 days; stop 2 weeks before harvest',
        seedRate: '4–5 kg/acre (seed)',
        npk: 'N: 60 kg | P: 30 kg | K: 30 kg per acre',
        pests: [
            { name: 'Thrips', treatment: 'Spray Fipronil 5 SC @ 1.5 ml/L' },
            { name: 'Purple Blotch', treatment: 'Spray Mancozeb 75 WP @ 2 g/L' }
        ],
        harvest: '100–130 days after transplanting',
        yield: '60–80 quintals / acre',
        popular: true
    },
    {
        id: 13, name: 'Potato', icon: '🥔', season: 'rabi',
        water: 'medium', type: 'vegetables', duration: '70–90 days',
        image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80',
        soil: ['Sandy Loam', 'Loamy', 'Deep alluvial'],
        ph: '5.0 – 6.5',
        irrigation: 'Every 7–10 days; earthing up after irrigation',
        seedRate: '10–12 bags (seed tubers)/acre',
        npk: 'N: 80 kg | P: 60 kg | K: 80 kg per acre',
        pests: [
            { name: 'Late Blight', treatment: 'Spray Cymoxanil + Mancozeb @ 2.5 g/L' },
            { name: 'White Grub', treatment: 'Apply Phorate 10 G @ 5 kg/acre in soil' }
        ],
        harvest: '70–90 days after planting',
        yield: '80–100 quintals / acre',
        popular: false
    },
    // ---------- FRUITS ----------
    {
        id: 14, name: 'Banana', icon: '🍌', season: 'zaid',
        water: 'high', type: 'fruits', duration: '12–15 months',
        image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80',
        soil: ['Well-drained Loamy', 'Alluvial'],
        ph: '6.0 – 7.5',
        irrigation: 'Drip; every 2–3 days in summer',
        seedRate: '500–600 suckers/acre',
        npk: 'N: 100 kg | P: 30 kg | K: 150 kg per acre',
        pests: [
            { name: 'Sigatoka Leaf Spot', treatment: 'Spray Propiconazole 25 EC @ 1 ml/L' },
            { name: 'Banana Weevil', treatment: 'Apply Carbofuran 3G @ 5 g/pit' }
        ],
        harvest: '12–15 months after planting',
        yield: '150–200 quintals / acre',
        popular: true
    },
    {
        id: 15, name: 'Mango', icon: '🥭', season: 'zaid',
        water: 'low', type: 'fruits', duration: '3–5 years (first fruiting)',
        image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&q=80',
        soil: ['Deep Sandy Loam', 'Alluvial', 'Well-drained'],
        ph: '5.5 – 7.5',
        irrigation: 'Every 15–20 days; withhold at flowering',
        seedRate: '28–35 grafted plants/acre',
        npk: 'N: 50 kg | P: 25 kg | K: 50 kg per acre (mature tree)',
        pests: [
            { name: 'Mango Hopper', treatment: 'Spray Imidacloprid 17.8 SL @ 0.5 ml/L' },
            { name: 'Powdery Mildew', treatment: 'Spray Wettable Sulphur 80 WP @ 2 g/L' }
        ],
        harvest: '3–5 years; April–June season',
        yield: '100–150 quintals / acre (mature orchard)',
        popular: false
    },
    // ---------- CASH CROPS ----------
    {
        id: 16, name: 'Sugarcane', icon: '🎋', season: 'zaid',
        water: 'high', type: 'cereals', duration: '10–12 months',
        image: 'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?w=400&q=80',
        soil: ['Loamy', 'Alluvial', 'Well-drained'],
        ph: '6.5 – 8.0',
        irrigation: 'Furrow irrigation; every 7–10 days',
        seedRate: '8,000–10,000 setts/acre',
        npk: 'N: 120 kg | P: 60 kg | K: 60 kg per acre',
        pests: [
            { name: 'Pyrilla', treatment: 'Spray Dimethoate 30 EC @ 2 ml/L' },
            { name: 'Tobacco Caterpillar', treatment: 'Spray Chlorpyrifos 20 EC @ 2 ml/L' }
        ],
        harvest: '10–12 months after planting',
        yield: '300–400 quintals / acre',
        popular: true
    },
    {
        id: 17, name: 'Cotton', icon: '☁️', season: 'kharif',
        water: 'medium', type: 'oilseeds', duration: '150–180 days',
        image: 'https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=400&q=80',
        soil: ['Black Cotton Soil', 'Alluvial', 'Deep Loamy'],
        ph: '6.5 – 8.5',
        irrigation: 'Every 10–15 days; critical at boll formation',
        seedRate: '2–3 kg/acre (Bt hybrid)',
        npk: 'N: 60 kg | P: 30 kg | K: 30 kg per acre',
        pests: [
            { name: 'Bollworm', treatment: 'Spray Emamectin Benzoate 5 SG @ 0.4 g/L' },
            { name: 'Whitefly', treatment: 'Spray Imidacloprid 17.8 SL @ 0.5 ml/L' }
        ],
        harvest: '150–180 days; picking in 3–4 rounds',
        yield: '8–12 quintals / acre',
        popular: true
    }
];

// Popular crop IDs for the "Popular Crops" section
const POPULAR_CROP_IDS = [1, 3, 14, 16, 17, 9, 11, 12]; // paddy, maize, banana, sugarcane, cotton, groundnut, tomato, onion

// Get current season based on month
function getCurrentSeason() {
    const month = new Date().getMonth() + 1; // 1-indexed
    if (month >= 6 && month <= 9) return 'kharif';
    if (month >= 10 && month <= 2) return 'rabi';
    return 'zaid';
}

const SEASON_LABELS = { kharif: 'Kharif', rabi: 'Rabi', zaid: 'Zaid' };
const WATER_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };
const TYPE_LABELS = {
    cereals: 'Cereals', pulses: 'Pulses', vegetables: 'Vegetables',
    fruits: 'Fruits', oilseeds: 'Oilseeds', millets: 'Millets'
};
const WATER_COLORS = { low: '#10b981', medium: '#f59e0b', high: '#3b82f6' };
const SEASON_COLORS = { kharif: '#10b981', rabi: '#60a5fa', zaid: '#f97316' };

// --- Global Window Exports for Vite compatibility ---
window.CROPS_DB = CROPS_DB;
window.POPULAR_CROP_IDS = POPULAR_CROP_IDS;
window.getCurrentSeason = getCurrentSeason;
window.SEASON_LABELS = SEASON_LABELS;
window.WATER_LABELS = WATER_LABELS;
window.TYPE_LABELS = TYPE_LABELS;
window.WATER_COLORS = WATER_COLORS;
window.SEASON_COLORS = SEASON_COLORS;
