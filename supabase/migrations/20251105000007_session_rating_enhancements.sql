-- Session Rating and Feedback System Enhancements
-- Sprint 02 - Task 1.4.2: Implement Session Feedback/Rating System (3 SP)
-- Enhances rating system with detailed feedback, categories, and coach responses

-- Add enhanced feedback fields to session_ratings
ALTER TABLE session_ratings
ADD COLUMN IF NOT EXISTS comment TEXT,
ADD COLUMN IF NOT EXISTS rating_professionalism INTEGER CHECK (rating_professionalism >= 1 AND rating_professionalism <= 5),
ADD COLUMN IF NOT EXISTS rating_communication INTEGER CHECK (rating_communication >= 1 AND rating_communication <= 5),
ADD COLUMN IF NOT EXISTS rating_helpfulness INTEGER CHECK (rating_helpfulness >= 1 AND rating_helpfulness <= 5),
ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS not_helpful_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS coach_response TEXT,
ADD COLUMN IF NOT EXISTS coach_response_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Rename review to comment if it exists (for consistency)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'session_ratings' AND column_name = 'review') THEN
        EXECUTE 'UPDATE session_ratings SET comment = review WHERE comment IS NULL';
        ALTER TABLE session_ratings DROP COLUMN IF EXISTS review;
    END IF;
END $$;

-- Comments for new columns
COMMENT ON COLUMN session_ratings.comment IS 'Written feedback/review about the session';
COMMENT ON COLUMN session_ratings.rating_professionalism IS 'Rating for coach professionalism (1-5)';
COMMENT ON COLUMN session_ratings.rating_communication IS 'Rating for communication clarity (1-5)';
COMMENT ON COLUMN session_ratings.rating_helpfulness IS 'Rating for helpfulness and value (1-5)';
COMMENT ON COLUMN session_ratings.would_recommend IS 'Whether client would recommend this coach';
COMMENT ON COLUMN session_ratings.is_anonymous IS 'Whether review is posted anonymously';
COMMENT ON COLUMN session_ratings.is_verified IS 'Whether rating is from verified completed session';
COMMENT ON COLUMN session_ratings.helpful_count IS 'Number of users who found this review helpful';
COMMENT ON COLUMN session_ratings.not_helpful_count IS 'Number of users who found this review not helpful';
COMMENT ON COLUMN session_ratings.coach_response IS 'Coach response to the rating/feedback';
COMMENT ON COLUMN session_ratings.coach_response_at IS 'When coach responded to the feedback';
COMMENT ON COLUMN session_ratings.is_featured IS 'Whether this review is featured on coach profile';

-- Create table for rating helpfulness votes
CREATE TABLE IF NOT EXISTS rating_helpfulness_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rating_id UUID REFERENCES session_ratings(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(rating_id, user_id)
);

CREATE INDEX idx_rating_votes_rating_id ON rating_helpfulness_votes(rating_id);
CREATE INDEX idx_rating_votes_user_id ON rating_helpfulness_votes(user_id);

-- Trigger to update helpful counts
CREATE OR REPLACE FUNCTION update_rating_helpful_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_helpful THEN
            UPDATE session_ratings SET helpful_count = helpful_count + 1 WHERE id = NEW.rating_id;
        ELSE
            UPDATE session_ratings SET not_helpful_count = not_helpful_count + 1 WHERE id = NEW.rating_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' AND OLD.is_helpful != NEW.is_helpful THEN
        IF NEW.is_helpful THEN
            UPDATE session_ratings
            SET helpful_count = helpful_count + 1, not_helpful_count = not_helpful_count - 1
            WHERE id = NEW.rating_id;
        ELSE
            UPDATE session_ratings
            SET helpful_count = helpful_count - 1, not_helpful_count = not_helpful_count + 1
            WHERE id = NEW.rating_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.is_helpful THEN
            UPDATE session_ratings SET helpful_count = helpful_count - 1 WHERE id = OLD.rating_id;
        ELSE
            UPDATE session_ratings SET not_helpful_count = not_helpful_count - 1 WHERE id = OLD.rating_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rating_helpfulness_votes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON rating_helpfulness_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_rating_helpful_counts();

-- Function to submit a session rating
CREATE OR REPLACE FUNCTION submit_session_rating(
    p_session_id UUID,
    p_client_id UUID,
    p_rating INTEGER,
    p_comment TEXT DEFAULT NULL,
    p_rating_professionalism INTEGER DEFAULT NULL,
    p_rating_communication INTEGER DEFAULT NULL,
    p_rating_helpfulness INTEGER DEFAULT NULL,
    p_would_recommend BOOLEAN DEFAULT true,
    p_is_anonymous BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
    v_coach_id UUID;
    v_session_status TEXT;
    v_rating_id UUID;
BEGIN
    -- Verify session exists and client is the owner
    SELECT coach_id, status INTO v_coach_id, v_session_status
    FROM sessions
    WHERE id = p_session_id AND client_id = p_client_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found or access denied';
    END IF;

    -- Only allow rating completed sessions
    IF v_session_status != 'completed' THEN
        RAISE EXCEPTION 'Can only rate completed sessions';
    END IF;

    -- Insert or update rating
    INSERT INTO session_ratings (
        session_id,
        coach_id,
        client_id,
        rating,
        comment,
        rating_professionalism,
        rating_communication,
        rating_helpfulness,
        would_recommend,
        is_anonymous,
        is_verified
    )
    VALUES (
        p_session_id,
        v_coach_id,
        p_client_id,
        p_rating,
        p_comment,
        p_rating_professionalism,
        p_rating_communication,
        p_rating_helpfulness,
        p_would_recommend,
        p_is_anonymous,
        true -- Mark as verified since it's from actual session
    )
    ON CONFLICT (session_id)
    DO UPDATE SET
        rating = EXCLUDED.rating,
        comment = EXCLUDED.comment,
        rating_professionalism = EXCLUDED.rating_professionalism,
        rating_communication = EXCLUDED.rating_communication,
        rating_helpfulness = EXCLUDED.rating_helpfulness,
        would_recommend = EXCLUDED.would_recommend,
        is_anonymous = EXCLUDED.is_anonymous,
        updated_at = NOW()
    RETURNING id INTO v_rating_id;

    RETURN v_rating_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add coach response to rating
CREATE OR REPLACE FUNCTION add_coach_response_to_rating(
    p_rating_id UUID,
    p_coach_id UUID,
    p_response TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_rating_coach_id UUID;
BEGIN
    -- Verify coach owns this rating
    SELECT coach_id INTO v_rating_coach_id
    FROM session_ratings
    WHERE id = p_rating_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rating not found';
    END IF;

    IF v_rating_coach_id != p_coach_id THEN
        RAISE EXCEPTION 'Access denied - not your rating';
    END IF;

    -- Update with coach response
    UPDATE session_ratings
    SET
        coach_response = p_response,
        coach_response_at = NOW(),
        updated_at = NOW()
    WHERE id = p_rating_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to vote on rating helpfulness
CREATE OR REPLACE FUNCTION vote_rating_helpfulness(
    p_rating_id UUID,
    p_user_id UUID,
    p_is_helpful BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO rating_helpfulness_votes (rating_id, user_id, is_helpful)
    VALUES (p_rating_id, p_user_id, p_is_helpful)
    ON CONFLICT (rating_id, user_id)
    DO UPDATE SET
        is_helpful = EXCLUDED.is_helpful,
        created_at = NOW();

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get coach ratings with pagination
CREATE OR REPLACE FUNCTION get_coach_ratings(
    p_coach_id UUID,
    p_min_rating INTEGER DEFAULT NULL,
    p_verified_only BOOLEAN DEFAULT false,
    p_with_comments_only BOOLEAN DEFAULT false,
    p_sort_by TEXT DEFAULT 'recent',
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    rating_id UUID,
    session_id UUID,
    client_name TEXT,
    rating INTEGER,
    comment TEXT,
    rating_professionalism INTEGER,
    rating_communication INTEGER,
    rating_helpfulness INTEGER,
    would_recommend BOOLEAN,
    is_anonymous BOOLEAN,
    is_verified BOOLEAN,
    helpful_count INTEGER,
    coach_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sr.id AS rating_id,
        sr.session_id,
        CASE
            WHEN sr.is_anonymous THEN 'Anonymous'
            ELSE u.first_name || ' ' || COALESCE(SUBSTRING(u.last_name, 1, 1) || '.', '')
        END AS client_name,
        sr.rating,
        sr.comment,
        sr.rating_professionalism,
        sr.rating_communication,
        sr.rating_helpfulness,
        sr.would_recommend,
        sr.is_anonymous,
        sr.is_verified,
        sr.helpful_count,
        sr.coach_response,
        sr.created_at
    FROM session_ratings sr
    LEFT JOIN users u ON u.id = sr.client_id
    WHERE sr.coach_id = p_coach_id
    AND (p_min_rating IS NULL OR sr.rating >= p_min_rating)
    AND (NOT p_verified_only OR sr.is_verified = true)
    AND (NOT p_with_comments_only OR sr.comment IS NOT NULL)
    ORDER BY
        CASE WHEN p_sort_by = 'recent' THEN sr.created_at END DESC,
        CASE WHEN p_sort_by = 'helpful' THEN sr.helpful_count END DESC,
        CASE WHEN p_sort_by = 'rating_high' THEN sr.rating END DESC,
        CASE WHEN p_sort_by = 'rating_low' THEN sr.rating END ASC,
        sr.created_at DESC -- Default secondary sort
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get rating statistics for a coach
CREATE OR REPLACE FUNCTION get_coach_rating_stats(p_coach_id UUID)
RETURNS JSON AS $$
DECLARE
    stats_json JSON;
BEGIN
    SELECT json_build_object(
        'average_rating', COALESCE(AVG(rating), 0),
        'total_ratings', COUNT(*),
        'verified_ratings', COUNT(*) FILTER (WHERE is_verified = true),
        'rating_distribution', json_build_object(
            '5_star', COUNT(*) FILTER (WHERE rating = 5),
            '4_star', COUNT(*) FILTER (WHERE rating = 4),
            '3_star', COUNT(*) FILTER (WHERE rating = 3),
            '2_star', COUNT(*) FILTER (WHERE rating = 2),
            '1_star', COUNT(*) FILTER (WHERE rating = 1)
        ),
        'category_averages', json_build_object(
            'professionalism', COALESCE(AVG(rating_professionalism), 0),
            'communication', COALESCE(AVG(rating_communication), 0),
            'helpfulness', COALESCE(AVG(rating_helpfulness), 0)
        ),
        'recommendation_rate', COALESCE(
            (COUNT(*) FILTER (WHERE would_recommend = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
            0
        ),
        'response_rate', COALESCE(
            (COUNT(*) FILTER (WHERE coach_response IS NOT NULL)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
            0
        )
    ) INTO stats_json
    FROM session_ratings
    WHERE coach_id = p_coach_id;

    RETURN stats_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RLS policies for rating_helpfulness_votes
ALTER TABLE rating_helpfulness_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY rating_votes_select ON rating_helpfulness_votes
    FOR SELECT
    USING (true); -- Anyone can see vote counts

CREATE POLICY rating_votes_insert_own ON rating_helpfulness_votes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY rating_votes_update_own ON rating_helpfulness_votes
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY rating_votes_delete_own ON rating_helpfulness_votes
    FOR DELETE
    USING (auth.uid() = user_id);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION submit_session_rating(UUID, UUID, INTEGER, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION add_coach_response_to_rating(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION vote_rating_helpfulness(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coach_ratings(UUID, INTEGER, BOOLEAN, BOOLEAN, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coach_rating_stats(UUID) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE rating_helpfulness_votes IS 'User votes on whether ratings were helpful';
COMMENT ON FUNCTION submit_session_rating(UUID, UUID, INTEGER, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN) IS 'Submit or update a session rating with detailed feedback';
COMMENT ON FUNCTION add_coach_response_to_rating(UUID, UUID, TEXT) IS 'Add coach response to a rating';
COMMENT ON FUNCTION vote_rating_helpfulness(UUID, UUID, BOOLEAN) IS 'Vote on whether a rating was helpful';
COMMENT ON FUNCTION get_coach_ratings(UUID, INTEGER, BOOLEAN, BOOLEAN, TEXT, INTEGER, INTEGER) IS 'Get paginated ratings for a coach with filters and sorting';
COMMENT ON FUNCTION get_coach_rating_stats(UUID) IS 'Get comprehensive rating statistics for a coach';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_ratings_verified ON session_ratings(coach_id, is_verified)
WHERE is_verified = true;

CREATE INDEX IF NOT EXISTS idx_session_ratings_featured ON session_ratings(coach_id, is_featured)
WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_session_ratings_recommend ON session_ratings(coach_id, would_recommend)
WHERE would_recommend = true;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Session rating enhancements installed successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Detailed category ratings (professionalism, communication, helpfulness)';
    RAISE NOTICE '  - Would recommend indicator';
    RAISE NOTICE '  - Anonymous rating option';
    RAISE NOTICE '  - Verified rating for completed sessions';
    RAISE NOTICE '  - Helpful/not helpful voting';
    RAISE NOTICE '  - Coach response capability';
    RAISE NOTICE '  - Featured review marking';
    RAISE NOTICE '  - Comprehensive rating statistics';
    RAISE NOTICE '  - Filtered and sorted rating retrieval';
END $$;
