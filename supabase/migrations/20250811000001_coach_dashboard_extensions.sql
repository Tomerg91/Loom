-- Coach Dashboard Extensions Migration
-- Adds missing tables for coach functionality and analytics

-- Create coach_profiles table for individual coach pricing and settings
CREATE TABLE coach_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    session_rate DECIMAL(10,2) NOT NULL DEFAULT 75.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    specializations TEXT[] DEFAULT '{}',
    certifications JSONB DEFAULT '[]',
    bio TEXT,
    experience_years INTEGER DEFAULT 0,
    languages TEXT[] DEFAULT '{"en"}',
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT positive_session_rate CHECK (session_rate >= 0),
    CONSTRAINT valid_experience CHECK (experience_years >= 0)
);

-- Create client_goals table for goal tracking
CREATE TABLE client_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50),
    target_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    progress_percentage INTEGER DEFAULT 0,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    CONSTRAINT different_users CHECK (client_id != coach_id)
);

-- Create session_feedback table for ratings and feedback
CREATE TABLE session_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    overall_rating INTEGER NOT NULL,
    communication_rating INTEGER,
    helpfulness_rating INTEGER,
    preparation_rating INTEGER,
    feedback_text TEXT,
    would_recommend BOOLEAN,
    anonymous BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_overall_rating CHECK (overall_rating >= 1 AND overall_rating <= 5),
    CONSTRAINT valid_communication_rating CHECK (communication_rating IS NULL OR (communication_rating >= 1 AND communication_rating <= 5)),
    CONSTRAINT valid_helpfulness_rating CHECK (helpfulness_rating IS NULL OR (helpfulness_rating >= 1 AND helpfulness_rating <= 5)),
    CONSTRAINT valid_preparation_rating CHECK (preparation_rating IS NULL OR (preparation_rating >= 1 AND preparation_rating <= 5)),
    CONSTRAINT different_users CHECK (client_id != coach_id),
    UNIQUE(session_id, client_id)
);

-- Create goal_milestones table for tracking goal progress
CREATE TABLE goal_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    goal_id UUID REFERENCES client_goals(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_health table for real monitoring data
CREATE TABLE system_health (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    component VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    metrics JSONB DEFAULT '{}',
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
    UNIQUE(component)
);

-- Create audit_logs table for admin tracking
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_coach_profiles_coach_id ON coach_profiles(coach_id);

CREATE INDEX idx_client_goals_client_id ON client_goals(client_id);
CREATE INDEX idx_client_goals_coach_id ON client_goals(coach_id);
CREATE INDEX idx_client_goals_status ON client_goals(status);
CREATE INDEX idx_client_goals_target_date ON client_goals(target_date);

CREATE INDEX idx_session_feedback_session_id ON session_feedback(session_id);
CREATE INDEX idx_session_feedback_client_id ON session_feedback(client_id);
CREATE INDEX idx_session_feedback_coach_id ON session_feedback(coach_id);
CREATE INDEX idx_session_feedback_overall_rating ON session_feedback(overall_rating);

CREATE INDEX idx_goal_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX idx_goal_milestones_target_date ON goal_milestones(target_date);

CREATE INDEX idx_system_health_component ON system_health(component);
CREATE INDEX idx_system_health_status ON system_health(status);
CREATE INDEX idx_system_health_last_checked ON system_health(last_checked_at);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Create updated_at triggers
CREATE TRIGGER update_coach_profiles_updated_at BEFORE UPDATE ON coach_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_goals_updated_at BEFORE UPDATE ON client_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_feedback_updated_at BEFORE UPDATE ON session_feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goal_milestones_updated_at BEFORE UPDATE ON goal_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS (Row Level Security) policies
ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Coach profiles policies
CREATE POLICY "Coaches can view and edit their own profile" ON coach_profiles
    FOR ALL USING (auth.uid() = coach_id);

CREATE POLICY "Clients can view their coach's basic profile info" ON coach_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE coach_id = coach_profiles.coach_id 
            AND client_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all coach profiles" ON coach_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Client goals policies
CREATE POLICY "Clients can manage their own goals" ON client_goals
    FOR ALL USING (auth.uid() = client_id);

CREATE POLICY "Coaches can view and edit goals for their clients" ON client_goals
    FOR ALL USING (
        auth.uid() = coach_id OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Session feedback policies
CREATE POLICY "Clients can manage their own feedback" ON session_feedback
    FOR ALL USING (auth.uid() = client_id);

CREATE POLICY "Coaches can view feedback for their sessions" ON session_feedback
    FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Admins can view all feedback" ON session_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Goal milestones policies
CREATE POLICY "Goal milestones inherit goal permissions" ON goal_milestones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM client_goals 
            WHERE id = goal_milestones.goal_id 
            AND (client_id = auth.uid() OR coach_id = auth.uid())
        ) OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- System health policies (admin only)
CREATE POLICY "Admins can manage system health" ON system_health
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Audit logs policies (admin only)
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create useful views
CREATE VIEW coach_stats AS
SELECT 
    cp.coach_id,
    cp.session_rate,
    COUNT(DISTINCT s.client_id) as total_clients,
    COUNT(s.id) as total_sessions,
    COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_sessions,
    AVG(sf.overall_rating) as average_rating,
    SUM(CASE WHEN s.status = 'completed' THEN cp.session_rate ELSE 0 END) as total_earnings,
    COUNT(CASE WHEN s.scheduled_at >= NOW() - INTERVAL '30 days' THEN 1 END) as sessions_last_30_days
FROM coach_profiles cp
LEFT JOIN sessions s ON cp.coach_id = s.coach_id
LEFT JOIN session_feedback sf ON s.id = sf.session_id
GROUP BY cp.coach_id, cp.session_rate;

CREATE VIEW client_progress_summary AS
SELECT 
    cg.client_id,
    cg.coach_id,
    COUNT(*) as total_goals,
    COUNT(CASE WHEN cg.status = 'completed' THEN 1 END) as completed_goals,
    COUNT(CASE WHEN cg.status = 'active' THEN 1 END) as active_goals,
    AVG(cg.progress_percentage) as avg_progress,
    COUNT(CASE WHEN cg.target_date < CURRENT_DATE AND cg.status != 'completed' THEN 1 END) as overdue_goals
FROM client_goals cg
GROUP BY cg.client_id, cg.coach_id;

-- Insert default system health components
INSERT INTO system_health (component, status, metrics) VALUES
    ('database', 'healthy', '{"connections": 0, "max_connections": 100, "response_time_ms": 0}'),
    ('server', 'healthy', '{"uptime_seconds": 0, "memory_usage_percent": 0, "cpu_usage_percent": 0}'),
    ('cache', 'healthy', '{"hit_rate_percent": 0, "memory_used_mb": 0}'),
    ('storage', 'healthy', '{"used_space_gb": 0, "available_space_gb": 0}'),
    ('notifications', 'healthy', '{"queue_size": 0, "failed_last_24h": 0}'),
    ('analytics', 'healthy', '{"events_last_hour": 0, "processing_lag_ms": 0}')
ON CONFLICT (component) DO NOTHING;

-- Create a function to get coach average rating
CREATE OR REPLACE FUNCTION get_coach_average_rating(coach_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
BEGIN
    RETURN (
        SELECT COALESCE(AVG(overall_rating), 0.0)
        FROM session_feedback sf
        JOIN sessions s ON sf.session_id = s.id
        WHERE s.coach_id = coach_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to update system health
CREATE OR REPLACE FUNCTION update_system_health(
    component_name VARCHAR(50),
    health_status VARCHAR(20),
    health_metrics JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO system_health (component, status, metrics, last_checked_at)
    VALUES (component_name, health_status, health_metrics, NOW())
    ON CONFLICT (component) 
    DO UPDATE SET 
        status = EXCLUDED.status,
        metrics = EXCLUDED.metrics,
        last_checked_at = EXCLUDED.last_checked_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit logging function
CREATE OR REPLACE FUNCTION log_audit_event(
    action_name VARCHAR(100),
    resource_type_name VARCHAR(50) DEFAULT NULL,
    resource_id_value UUID DEFAULT NULL,
    details_json JSONB DEFAULT '{}',
    ip_addr INET DEFAULT NULL,
    user_agent_string TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
    VALUES (auth.uid(), action_name, resource_type_name, resource_id_value, details_json, ip_addr, user_agent_string)
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;