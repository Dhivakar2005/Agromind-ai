-- Krishi Mitra Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Farmers table
CREATE TABLE farmers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(255),
    language_preference VARCHAR(10) DEFAULT 'hi', -- hi, en, mr, ta, etc.
    location GEOGRAPHY(POINT, 4326), -- PostGIS for spatial queries
    district VARCHAR(100),
    state VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Farms table
CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    land_size_acres DECIMAL(10, 2),
    soil_type VARCHAR(50), -- clay, loam, sandy, etc.
    soil_ph DECIMAL(3, 1),
    location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crops master data
CREATE TABLE crops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en VARCHAR(100) NOT NULL,
    name_hi VARCHAR(100),
    name_mr VARCHAR(100),
    name_ta VARCHAR(100),
    category VARCHAR(50), -- cereal, pulse, vegetable, fruit, cash_crop
    season VARCHAR(50), -- kharif, rabi, zaid
    duration_days INTEGER,
    water_requirement VARCHAR(20), -- low, medium, high
    suitable_soil_types TEXT[], -- array of soil types
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crop history
CREATE TABLE crop_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    crop_id UUID REFERENCES crops(id),
    crop_name VARCHAR(100),
    season VARCHAR(50),
    year INTEGER,
    sowing_date DATE,
    harvest_date DATE,
    yield_quintal DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Soil Health Cards
CREATE TABLE soil_health_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    issue_date DATE,
    nitrogen_kg_per_ha DECIMAL(10, 2),
    phosphorus_kg_per_ha DECIMAL(10, 2),
    potassium_kg_per_ha DECIMAL(10, 2),
    organic_carbon_percent DECIMAL(5, 2),
    ph_value DECIMAL(3, 1),
    ec_value DECIMAL(5, 2),
    raw_data JSONB, -- store complete SHC data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Queries and responses
CREATE TABLE queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    query_type VARCHAR(50), -- voice, text, image
    query_text TEXT,
    query_language VARCHAR(10),
    response_text TEXT,
    confidence_score DECIMAL(3, 2), -- 0.00 to 1.00
    sources TEXT[], -- array of source citations
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Advisories
CREATE TABLE advisories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    advisory_type VARCHAR(50), -- crop_recommendation, fertilizer, irrigation, pest_treatment
    crop_id UUID REFERENCES crops(id),
    title VARCHAR(255),
    content TEXT,
    confidence_score DECIMAL(3, 2),
    assumptions JSONB, -- store assumptions made
    sources TEXT[],
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Images (for pest detection)
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    file_path VARCHAR(500),
    file_size_bytes INTEGER,
    image_type VARCHAR(20), -- pest_detection, soil, farm
    crop_type VARCHAR(100),
    detection_result JSONB, -- store ML model output
    confidence_score DECIMAL(3, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
    notification_type VARCHAR(50), -- weather_alert, task_reminder, scheme_update
    channel VARCHAR(20), -- push, sms, voice
    title VARCHAR(255),
    message TEXT,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weather data cache
CREATE TABLE weather_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district VARCHAR(100),
    state VARCHAR(100),
    forecast_date DATE,
    temperature_max DECIMAL(4, 1),
    temperature_min DECIMAL(4, 1),
    humidity DECIMAL(5, 2),
    rainfall_mm DECIMAL(6, 2),
    wind_speed_kmph DECIMAL(5, 2),
    weather_condition VARCHAR(50),
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(district, state, forecast_date)
);

-- Government schemes
CREATE TABLE government_schemes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_name VARCHAR(255),
    scheme_type VARCHAR(50), -- subsidy, insurance, loan, direct_benefit
    description TEXT,
    eligibility_criteria TEXT,
    application_process TEXT,
    state VARCHAR(100), -- NULL for central schemes
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge base (for RAG)
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500),
    content TEXT,
    source VARCHAR(255), -- ICAR, IMD, State Dept, etc.
    category VARCHAR(100), -- crop_production, pest_management, fertilizer, etc.
    crop_type VARCHAR(100),
    language VARCHAR(10),
    embedding_id VARCHAR(255), -- reference to vector DB
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_farmers_phone ON farmers(phone_number);
CREATE INDEX idx_farmers_location ON farmers USING GIST(location);
CREATE INDEX idx_farms_farmer ON farms(farmer_id);
CREATE INDEX idx_crop_history_farm ON crop_history(farm_id);
CREATE INDEX idx_queries_farmer ON queries(farmer_id);
CREATE INDEX idx_queries_created ON queries(created_at DESC);
CREATE INDEX idx_advisories_farmer ON advisories(farmer_id);
CREATE INDEX idx_images_farmer ON images(farmer_id);
CREATE INDEX idx_notifications_farmer ON notifications(farmer_id);
CREATE INDEX idx_weather_location_date ON weather_data(district, state, forecast_date);
CREATE INDEX idx_knowledge_category ON knowledge_base(category, crop_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for farmers table
CREATE TRIGGER update_farmers_updated_at BEFORE UPDATE ON farmers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
