-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_availability ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Coaches can view their clients" ON users
    FOR SELECT USING (
        role = 'client' AND EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.client_id = users.id 
            AND sessions.coach_id = auth.uid()
        )
    );

CREATE POLICY "Clients can view their coach" ON users
    FOR SELECT USING (
        role = 'coach' AND EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.coach_id = users.id 
            AND sessions.client_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all users" ON users
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Sessions table policies
CREATE POLICY "Users can view their own sessions" ON sessions
    FOR SELECT USING (
        auth.uid() = coach_id OR 
        auth.uid() = client_id OR
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

CREATE POLICY "Coaches can create sessions with their clients" ON sessions
    FOR INSERT WITH CHECK (
        auth.uid() = coach_id AND
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'coach')
    );

CREATE POLICY "Coaches and clients can update their sessions" ON sessions
    FOR UPDATE USING (
        auth.uid() = coach_id OR 
        auth.uid() = client_id OR
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

CREATE POLICY "Coaches and admins can delete sessions" ON sessions
    FOR DELETE USING (
        auth.uid() = coach_id OR
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Coach notes table policies
CREATE POLICY "Coaches can view their own notes" ON coach_notes
    FOR SELECT USING (
        auth.uid() = coach_id OR
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

CREATE POLICY "Clients can view shared notes about them" ON coach_notes
    FOR SELECT USING (
        auth.uid() = client_id AND privacy_level = 'shared_with_client'
    );

CREATE POLICY "Coaches can create notes for their clients" ON coach_notes
    FOR INSERT WITH CHECK (
        auth.uid() = coach_id AND
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'coach') AND
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.client_id = coach_notes.client_id 
            AND sessions.coach_id = auth.uid()
        )
    );

CREATE POLICY "Coaches can update their own notes" ON coach_notes
    FOR UPDATE USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their own notes" ON coach_notes
    FOR DELETE USING (auth.uid() = coach_id);

-- Reflections table policies
CREATE POLICY "Clients can view their own reflections" ON reflections
    FOR SELECT USING (
        auth.uid() = client_id OR
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

CREATE POLICY "Coaches can view reflections of their clients" ON reflections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.client_id = reflections.client_id 
            AND sessions.coach_id = auth.uid()
        )
    );

CREATE POLICY "Clients can create their own reflections" ON reflections
    FOR INSERT WITH CHECK (
        auth.uid() = client_id AND
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'client')
    );

CREATE POLICY "Clients can update their own reflections" ON reflections
    FOR UPDATE USING (auth.uid() = client_id);

CREATE POLICY "Clients can delete their own reflections" ON reflections
    FOR DELETE USING (auth.uid() = client_id);

-- Notifications table policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (
        -- Only allow system/admin roles or users creating notifications for themselves
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin') OR
        auth.uid() = user_id
    );

CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Coach availability table policies
CREATE POLICY "Anyone can view coach availability" ON coach_availability
    FOR SELECT USING (true);

CREATE POLICY "Coaches can manage their own availability" ON coach_availability
    FOR ALL USING (
        auth.uid() = coach_id AND
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'coach')
    );

CREATE POLICY "Admins can manage all availability" ON coach_availability
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, first_name, last_name)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user last_seen_at
CREATE OR REPLACE FUNCTION public.update_user_last_seen()
RETURNS trigger AS $$
BEGIN
    UPDATE public.users 
    SET last_seen_at = NOW()
    WHERE id = auth.uid();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;