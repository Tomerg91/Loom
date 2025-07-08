-- Create custom types/enums
CREATE TYPE user_role AS ENUM ('client', 'coach', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled');
CREATE TYPE notification_type AS ENUM ('session_reminder', 'session_confirmation', 'new_message', 'system_update');
CREATE TYPE privacy_level AS ENUM ('private', 'shared_with_client');
CREATE TYPE language AS ENUM ('en', 'he');

-- Create users table
CREATE TABLE users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'client',
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    language language NOT NULL DEFAULT 'en',
    status user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE
);

-- Create sessions table
CREATE TABLE sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    status session_status NOT NULL DEFAULT 'scheduled',
    meeting_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Note: Role validation will be handled by application logic or triggers
    CONSTRAINT sessions_different_users CHECK (coach_id != client_id),
    CONSTRAINT sessions_positive_duration CHECK (duration_minutes > 0),
    CONSTRAINT sessions_future_or_current CHECK (scheduled_at >= NOW() - INTERVAL '1 day')
);

-- Create coach_notes table
CREATE TABLE coach_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    privacy_level privacy_level NOT NULL DEFAULT 'private',
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- Note: Role validation will be handled by application logic or triggers
);

-- Create reflections table
CREATE TABLE reflections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 10),
    insights TEXT,
    goals_for_next_session TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- Note: Role validation will be handled by application logic or triggers
);

-- Create notifications table
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read_at TIMESTAMP WITH TIME ZONE,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create coach_availability table
CREATE TABLE coach_availability (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Note: Role validation will be handled by application logic or triggers
    CONSTRAINT coach_availability_valid_time CHECK (start_time < end_time),
    UNIQUE(coach_id, day_of_week, start_time, end_time)
);

-- Create indexes for better performance
CREATE INDEX idx_sessions_coach_id ON sessions(coach_id);
CREATE INDEX idx_sessions_client_id ON sessions(client_id);
CREATE INDEX idx_sessions_scheduled_at ON sessions(scheduled_at);
CREATE INDEX idx_sessions_status ON sessions(status);

CREATE INDEX idx_coach_notes_coach_id ON coach_notes(coach_id);
CREATE INDEX idx_coach_notes_client_id ON coach_notes(client_id);
CREATE INDEX idx_coach_notes_session_id ON coach_notes(session_id);

CREATE INDEX idx_reflections_client_id ON reflections(client_id);
CREATE INDEX idx_reflections_session_id ON reflections(session_id);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for);

CREATE INDEX idx_coach_availability_coach_id ON coach_availability(coach_id);
CREATE INDEX idx_coach_availability_day_of_week ON coach_availability(day_of_week);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coach_notes_updated_at BEFORE UPDATE ON coach_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reflections_updated_at BEFORE UPDATE ON reflections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coach_availability_updated_at BEFORE UPDATE ON coach_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();