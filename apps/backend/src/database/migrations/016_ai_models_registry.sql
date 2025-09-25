-- AI Models Registry
-- Migration: 016
-- Generated: 2025-09-21T18:24:38.161Z

CREATE TABLE IF NOT EXISTS ai_models_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL UNIQUE,
    model_type VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    framework VARCHAR(50) NOT NULL,
    model_path TEXT NOT NULL,
    input_schema JSONB,
    output_schema JSONB,
    parameters JSONB,
    performance_metrics JSONB,
    training_data_hash VARCHAR(64),
    model_hash VARCHAR(64),
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_models_type ON ai_models_registry(model_type);
CREATE INDEX idx_ai_models_active ON ai_models_registry(is_active);
CREATE INDEX idx_ai_models_version ON ai_models_registry(version);

-- Insert sample AI models
INSERT INTO ai_models_registry (model_name, model_type, version, framework, model_path, parameters) VALUES
('price_prediction_lstm', 'LSTM', '1.0.0', 'TensorFlow', '/models/lstm_price_v1.pkl', '{"layers": 3, "units": 128, "dropout": 0.2}'),
('sentiment_analysis_bert', 'BERT', '2.1.0', 'PyTorch', '/models/bert_sentiment_v2.pkl', '{"max_length": 512, "batch_size": 32}'),
('risk_assessment_rf', 'RandomForest', '1.5.0', 'Scikit-Learn', '/models/rf_risk_v1.pkl', '{"n_estimators": 100, "max_depth": 10}'),
('portfolio_optimization_ga', 'GeneticAlgorithm', '3.0.0', 'Custom', '/models/ga_portfolio_v3.pkl', '{"population_size": 100, "generations": 500}');