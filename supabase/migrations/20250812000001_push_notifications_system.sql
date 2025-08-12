-- Push Notification System Implementation
-- Date: 2025-08-12
-- Purpose: Complete push notification support with subscriptions and delivery tracking

-- Create push_subscriptions table
CREATE TABLE push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    -- Subscription details
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    
    -- Metadata
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique endpoint per user
    UNIQUE(user_id, endpoint)
);

-- Add indexes for push_subscriptions
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active);
CREATE INDEX idx_push_subscriptions_created_at ON push_subscriptions(created_at);

-- Add trigger for updated_at on push_subscriptions
CREATE TRIGGER update_push_subscriptions_updated_at 
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old push subscriptions
CREATE OR REPLACE FUNCTION cleanup_old_push_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete inactive subscriptions older than 90 days
    DELETE FROM push_subscriptions
    WHERE updated_at < NOW() - INTERVAL '90 days'
    AND is_active = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to send push notification (placeholder for integration)
CREATE OR REPLACE FUNCTION send_push_notification(
    input_user_id UUID,
    notification_title TEXT,
    notification_body TEXT,
    notification_data JSONB DEFAULT '{}',
    notification_options JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
    subscription_count INTEGER;
    notification_id UUID;
BEGIN
    -- Count active subscriptions for the user
    SELECT COUNT(*) INTO subscription_count
    FROM push_subscriptions
    WHERE user_id = input_user_id
    AND is_active = true;
    
    -- If no subscriptions, return false
    IF subscription_count = 0 THEN
        RETURN false;
    END IF;
    
    -- Create a notification record (if needed for tracking)
    INSERT INTO notifications (
        user_id,
        type,
        channel,
        title,
        message,
        data
    ) VALUES (
        input_user_id,
        'system_update',
        'push',
        notification_title,
        notification_body,
        notification_data
    ) RETURNING id INTO notification_id;
    
    -- Log delivery attempts for each subscription
    INSERT INTO notification_delivery_logs (
        notification_id,
        channel,
        status,
        sent_at,
        provider_id
    )
    SELECT 
        notification_id,
        'push',
        'pending',
        NOW(),
        ps.id::TEXT
    FROM push_subscriptions ps
    WHERE ps.user_id = input_user_id
    AND ps.is_active = true;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update push subscription status
CREATE OR REPLACE FUNCTION update_push_subscription_status(
    subscription_endpoint TEXT,
    is_active_status BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE push_subscriptions
    SET 
        is_active = is_active_status,
        updated_at = NOW()
    WHERE endpoint = subscription_endpoint;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced notification delivery logging for push notifications
CREATE OR REPLACE FUNCTION log_push_delivery_status(
    input_notification_id UUID,
    input_subscription_id TEXT,
    input_status TEXT,
    input_error_message TEXT DEFAULT NULL,
    input_provider_response JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    status_timestamp_column TEXT;
    update_data JSONB;
BEGIN
    -- Determine which timestamp column to update based on status
    CASE input_status
        WHEN 'sent' THEN status_timestamp_column := 'sent_at';
        WHEN 'delivered' THEN status_timestamp_column := 'delivered_at';
        WHEN 'opened' THEN status_timestamp_column := 'opened_at';
        WHEN 'clicked' THEN status_timestamp_column := 'clicked_at';
        WHEN 'failed' THEN status_timestamp_column := 'failed_at';
        ELSE status_timestamp_column := NULL;
    END CASE;
    
    -- Build update data
    update_data := jsonb_build_object(
        'status', input_status,
        'updated_at', NOW()
    );
    
    IF input_error_message IS NOT NULL THEN
        update_data := update_data || jsonb_build_object('error_message', input_error_message);
    END IF;
    
    IF input_provider_response IS NOT NULL THEN
        update_data := update_data || jsonb_build_object('provider_response', input_provider_response);
    END IF;
    
    -- Add timestamp for specific status
    IF status_timestamp_column IS NOT NULL THEN
        update_data := update_data || jsonb_build_object(status_timestamp_column, NOW());
    END IF;
    
    -- Update the delivery log
    UPDATE notification_delivery_logs
    SET
        status = (update_data->>'status')::TEXT,
        error_message = update_data->>'error_message',
        provider_response = update_data->'provider_response',
        sent_at = CASE WHEN update_data ? 'sent_at' THEN (update_data->>'sent_at')::TIMESTAMP WITH TIME ZONE ELSE sent_at END,
        delivered_at = CASE WHEN update_data ? 'delivered_at' THEN (update_data->>'delivered_at')::TIMESTAMP WITH TIME ZONE ELSE delivered_at END,
        opened_at = CASE WHEN update_data ? 'opened_at' THEN (update_data->>'opened_at')::TIMESTAMP WITH TIME ZONE ELSE opened_at END,
        clicked_at = CASE WHEN update_data ? 'clicked_at' THEN (update_data->>'clicked_at')::TIMESTAMP WITH TIME ZONE ELSE clicked_at END,
        failed_at = CASE WHEN update_data ? 'failed_at' THEN (update_data->>'failed_at')::TIMESTAMP WITH TIME ZONE ELSE failed_at END,
        updated_at = NOW()
    WHERE notification_id = input_notification_id
    AND channel = 'push'
    AND provider_id = input_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own push subscriptions
CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions
    USING (auth.uid() = user_id);

-- Admins can view all push subscriptions
CREATE POLICY "Admins can view all push subscriptions" ON push_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO authenticated;
GRANT USAGE ON SEQUENCE push_subscriptions_id_seq TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE push_subscriptions IS 'Stores push notification subscriptions for users';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL';
COMMENT ON COLUMN push_subscriptions.p256dh_key IS 'P256DH key for message encryption';
COMMENT ON COLUMN push_subscriptions.auth_key IS 'Auth key for message encryption';
COMMENT ON COLUMN push_subscriptions.user_agent IS 'Browser user agent string';
COMMENT ON COLUMN push_subscriptions.is_active IS 'Whether the subscription is still active';

COMMENT ON FUNCTION cleanup_old_push_subscriptions() IS 'Removes old inactive push subscriptions';
COMMENT ON FUNCTION send_push_notification(UUID, TEXT, TEXT, JSONB, JSONB) IS 'Initiates push notification sending process';
COMMENT ON FUNCTION update_push_subscription_status(TEXT, BOOLEAN) IS 'Updates subscription active status';
COMMENT ON FUNCTION log_push_delivery_status(UUID, TEXT, TEXT, TEXT, JSONB) IS 'Logs push notification delivery status';