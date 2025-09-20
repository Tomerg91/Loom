-- Notification Scheduling System
-- Date: 2025-08-12
-- Purpose: Add notification scheduling and background job processing

-- Create scheduled_notifications table
CREATE TABLE scheduled_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    -- Notification details
    type notification_type NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'inapp', 'push')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Template and variables
    template_id UUID REFERENCES notification_templates(id),
    template_variables JSONB DEFAULT '{}',
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Status and retry logic
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification_jobs table for background processing
CREATE TABLE notification_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('send_notification', 'send_bulk_notifications', 'send_reminder', 'cleanup_notifications', 'process_digest')),
    payload JSONB NOT NULL,
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Status and retry logic
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 0, -- Higher number = higher priority
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for scheduled_notifications
CREATE INDEX idx_scheduled_notifications_user_id ON scheduled_notifications(user_id);
CREATE INDEX idx_scheduled_notifications_status ON scheduled_notifications(status);
CREATE INDEX idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for);
CREATE INDEX idx_scheduled_notifications_channel ON scheduled_notifications(channel);
CREATE INDEX idx_scheduled_notifications_type ON scheduled_notifications(type);
CREATE INDEX idx_scheduled_notifications_priority ON scheduled_notifications(priority);

-- Composite index for processing queue
CREATE INDEX idx_scheduled_notifications_processing ON scheduled_notifications(status, scheduled_for, priority) 
    WHERE status = 'pending';

-- Add indexes for notification_jobs
CREATE INDEX idx_notification_jobs_status ON notification_jobs(status);
CREATE INDEX idx_notification_jobs_scheduled_for ON notification_jobs(scheduled_for);
CREATE INDEX idx_notification_jobs_type ON notification_jobs(type);
CREATE INDEX idx_notification_jobs_priority ON notification_jobs(priority);

-- Composite index for job processing
CREATE INDEX idx_notification_jobs_processing ON notification_jobs(status, scheduled_for, priority) 
    WHERE status = 'pending';

-- Add triggers for updated_at
CREATE TRIGGER update_scheduled_notifications_updated_at 
    BEFORE UPDATE ON scheduled_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_jobs_updated_at 
    BEFORE UPDATE ON notification_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to schedule session reminders
CREATE OR REPLACE FUNCTION schedule_session_reminders(
    session_id UUID,
    participant_ids UUID[],
    session_title TEXT,
    session_datetime TIMESTAMP WITH TIME ZONE,
    coach_name TEXT
)
RETURNS INTEGER AS $$
DECLARE
    participant_id UUID;
    reminder_count INTEGER := 0;
    reminder_time TIMESTAMP WITH TIME ZONE;
    template_vars JSONB;
BEGIN
    -- Loop through each participant
    FOREACH participant_id IN ARRAY participant_ids LOOP
        -- Get user's reminder preferences
        SELECT 
            CASE 
                WHEN np.reminder_timing IS NOT NULL THEN np.reminder_timing 
                ELSE 15 
            END INTO reminder_time
        FROM users u
        LEFT JOIN notification_preferences np ON u.id = np.user_id
        WHERE u.id = participant_id;
        
        -- Calculate reminder time (default 15 minutes before)
        reminder_time := session_datetime - INTERVAL '15 minutes';
        
        -- Prepare template variables
        template_vars := jsonb_build_object(
            'session_id', session_id,
            'session_title', session_title,
            'coach_name', coach_name,
            'session_time', session_datetime,
            'session_url', CONCAT(
                COALESCE(current_setting('app.base_url', true), 'http://localhost:3000'),
                '/sessions/', session_id
            )
        );
        
        -- Schedule email reminder (if user has email reminders enabled)
        INSERT INTO scheduled_notifications (
            user_id, type, channel, title, message, 
            scheduled_for, template_variables, priority
        )
        SELECT 
            participant_id,
            'session_reminder',
            'email',
            'Session Reminder',
            'Your session "' || session_title || '" starts in 15 minutes.',
            reminder_time,
            template_vars,
            'high'
        WHERE EXISTS (
            SELECT 1 FROM notification_preferences np
            WHERE np.user_id = participant_id 
            AND np.email_session_reminders = true
        );
        
        -- Schedule push reminder (if user has push reminders enabled)
        INSERT INTO scheduled_notifications (
            user_id, type, channel, title, message, 
            scheduled_for, template_variables, priority
        )
        SELECT 
            participant_id,
            'session_reminder',
            'push',
            'Session Reminder',
            'Your session "' || session_title || '" starts in 15 minutes.',
            reminder_time,
            template_vars,
            'high'
        WHERE EXISTS (
            SELECT 1 FROM notification_preferences np
            WHERE np.user_id = participant_id 
            AND np.push_session_reminders = true
        );
        
        -- Schedule in-app reminder (if user has in-app reminders enabled)
        INSERT INTO scheduled_notifications (
            user_id, type, channel, title, message, 
            scheduled_for, template_variables, priority
        )
        SELECT 
            participant_id,
            'session_reminder',
            'inapp',
            'Session Reminder',
            'Your session "' || session_title || '" starts in 15 minutes.',
            reminder_time,
            template_vars,
            'high'
        WHERE EXISTS (
            SELECT 1 FROM notification_preferences np
            WHERE np.user_id = participant_id 
            AND np.inapp_session_reminders = true
        );
        
        reminder_count := reminder_count + 1;
    END LOOP;
    
    RETURN reminder_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel scheduled notifications
CREATE OR REPLACE FUNCTION cancel_scheduled_notifications(
    filter_user_id UUID DEFAULT NULL,
    filter_type notification_type DEFAULT NULL,
    filter_channel TEXT DEFAULT NULL,
    filter_session_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    cancelled_count INTEGER;
BEGIN
    UPDATE scheduled_notifications 
    SET 
        status = 'cancelled',
        updated_at = NOW()
    WHERE status = 'pending'
    AND (filter_user_id IS NULL OR user_id = filter_user_id)
    AND (filter_type IS NULL OR type = filter_type)
    AND (filter_channel IS NULL OR channel = filter_channel)
    AND (filter_session_id IS NULL OR template_variables ? 'session_id' AND (template_variables->>'session_id')::UUID = filter_session_id);
    
    GET DIAGNOSTICS cancelled_count = ROW_COUNT;
    RETURN cancelled_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process notification jobs queue
CREATE OR REPLACE FUNCTION process_notification_jobs(batch_size INTEGER DEFAULT 10)
RETURNS TABLE(
    processed_count INTEGER,
    success_count INTEGER,
    failed_count INTEGER
) AS $$
DECLARE
    job_record notification_jobs;
    processed INTEGER := 0;
    succeeded INTEGER := 0;
    failed INTEGER := 0;
BEGIN
    -- Process jobs in priority order
    FOR job_record IN 
        SELECT * FROM notification_jobs
        WHERE status = 'pending'
        AND scheduled_for <= NOW()
        ORDER BY priority DESC, scheduled_for ASC
        LIMIT batch_size
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Mark job as processing
        UPDATE notification_jobs
        SET 
            status = 'processing',
            started_at = NOW(),
            updated_at = NOW()
        WHERE id = job_record.id;
        
        processed := processed + 1;
        
        BEGIN
            -- Process the job based on type
            CASE job_record.type
                WHEN 'send_notification' THEN
                    -- Single notification processing would be handled by application
                    succeeded := succeeded + 1;
                    
                WHEN 'cleanup_notifications' THEN
                    -- Clean up old notifications
                    DELETE FROM notifications
                    WHERE (
                        (read_at IS NOT NULL AND read_at < NOW() - INTERVAL '90 days')
                        OR (expires_at IS NOT NULL AND expires_at < NOW())
                        OR (read_at IS NULL AND created_at < NOW() - INTERVAL '6 months')
                    );
                    succeeded := succeeded + 1;
                    
                ELSE
                    -- Other job types handled by application
                    succeeded := succeeded + 1;
            END CASE;
            
            -- Mark job as completed
            UPDATE notification_jobs
            SET 
                status = 'completed',
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = job_record.id;
            
        EXCEPTION WHEN others THEN
            -- Mark job as failed and potentially retry
            failed := failed + 1;
            
            UPDATE notification_jobs
            SET 
                status = CASE 
                    WHEN retry_count + 1 >= max_retries THEN 'failed'
                    ELSE 'pending'
                END,
                retry_count = retry_count + 1,
                scheduled_for = CASE 
                    WHEN retry_count + 1 < max_retries 
                    THEN NOW() + INTERVAL '1 hour' * POWER(2, retry_count)
                    ELSE scheduled_for
                END,
                error_message = SQLERRM,
                updated_at = NOW()
            WHERE id = job_record.id;
        END;
    END LOOP;
    
    RETURN QUERY SELECT processed, succeeded, failed;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old scheduled notifications and jobs
CREATE OR REPLACE FUNCTION cleanup_notification_system()
RETURNS TABLE(
    scheduled_notifications_cleaned INTEGER,
    jobs_cleaned INTEGER,
    delivery_logs_cleaned INTEGER
) AS $$
DECLARE
    notifications_count INTEGER;
    jobs_count INTEGER;
    logs_count INTEGER;
BEGIN
    -- Clean up old scheduled notifications (older than 30 days)
    DELETE FROM scheduled_notifications
    WHERE status IN ('sent', 'failed', 'cancelled')
    AND updated_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS notifications_count = ROW_COUNT;
    
    -- Clean up old notification jobs (older than 7 days)
    DELETE FROM notification_jobs
    WHERE status IN ('completed', 'failed', 'cancelled')
    AND updated_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS jobs_count = ROW_COUNT;
    
    -- Clean up old delivery logs (older than 90 days)
    DELETE FROM notification_delivery_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS logs_count = ROW_COUNT;
    
    RETURN QUERY SELECT notifications_count, jobs_count, logs_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get notification queue statistics
CREATE OR REPLACE FUNCTION get_notification_queue_stats()
RETURNS TABLE(
    pending_notifications INTEGER,
    processing_notifications INTEGER,
    failed_notifications INTEGER,
    pending_jobs INTEGER,
    processing_jobs INTEGER,
    failed_jobs INTEGER,
    oldest_pending_notification TIMESTAMP WITH TIME ZONE,
    oldest_pending_job TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM scheduled_notifications WHERE status = 'pending'),
        (SELECT COUNT(*)::INTEGER FROM scheduled_notifications WHERE status = 'processing'),
        (SELECT COUNT(*)::INTEGER FROM scheduled_notifications WHERE status = 'failed'),
        (SELECT COUNT(*)::INTEGER FROM notification_jobs WHERE status = 'pending'),
        (SELECT COUNT(*)::INTEGER FROM notification_jobs WHERE status = 'processing'),
        (SELECT COUNT(*)::INTEGER FROM notification_jobs WHERE status = 'failed'),
        (SELECT MIN(scheduled_for) FROM scheduled_notifications WHERE status = 'pending'),
        (SELECT MIN(scheduled_for) FROM notification_jobs WHERE status = 'pending');
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for scheduled_notifications
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own scheduled notifications
CREATE POLICY "Users can view own scheduled notifications" ON scheduled_notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can cancel their own scheduled notifications
CREATE POLICY "Users can cancel own scheduled notifications" ON scheduled_notifications
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- System can manage all scheduled notifications
CREATE POLICY "System can manage scheduled notifications" ON scheduled_notifications
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Add RLS policies for notification_jobs
ALTER TABLE notification_jobs ENABLE ROW LEVEL SECURITY;

-- Only system/admin can manage notification jobs
CREATE POLICY "Admin can manage notification jobs" ON notification_jobs
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
        OR auth.jwt() ->> 'role' = 'service_role'
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON scheduled_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_jobs TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE scheduled_notifications IS 'Stores notifications scheduled to be sent at specific times';
COMMENT ON TABLE notification_jobs IS 'Background job queue for notification processing';

COMMENT ON FUNCTION schedule_session_reminders(UUID, UUID[], TEXT, TIMESTAMP WITH TIME ZONE, TEXT) IS 'Schedule reminder notifications for session participants';
COMMENT ON FUNCTION cancel_scheduled_notifications(UUID, notification_type, TEXT, UUID) IS 'Cancel scheduled notifications matching criteria';
COMMENT ON FUNCTION process_notification_jobs(INTEGER) IS 'Process pending notification jobs from the queue';
COMMENT ON FUNCTION cleanup_notification_system() IS 'Clean up old notifications, jobs, and delivery logs';
COMMENT ON FUNCTION get_notification_queue_stats() IS 'Get statistics about the notification processing queue';
