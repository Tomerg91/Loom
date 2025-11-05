-- Resource Library Pagination Enhancement
-- Sprint 01 - Task 1.4.3: Add Pagination to Resource Lists
-- Adds efficient cursor-based pagination and count functions

-- Function to count resources with filters
CREATE OR REPLACE FUNCTION count_coach_library_resources(
    p_coach_id UUID,
    p_category TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    resource_count INTEGER;
    search_pattern TEXT;
BEGIN
    -- Build search pattern if provided
    IF p_search IS NOT NULL THEN
        search_pattern := '%' || p_search || '%';
    END IF;

    -- Count resources with filters
    SELECT COUNT(*)::INTEGER INTO resource_count
    FROM file_uploads
    WHERE user_id = p_coach_id
    AND is_library_resource = TRUE
    AND (p_category IS NULL OR file_category = p_category)
    AND (p_tags IS NULL OR tags && p_tags) -- Array overlap operator
    AND (
        p_search IS NULL OR
        filename ILIKE search_pattern OR
        description ILIKE search_pattern
    );

    RETURN resource_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get resources with cursor-based pagination
CREATE OR REPLACE FUNCTION get_resources_cursor_paginated(
    p_coach_id UUID,
    p_cursor TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_cursor_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_category TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'created_at',
    p_sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE (
    id UUID,
    filename TEXT,
    file_type TEXT,
    file_size BIGINT,
    file_category TEXT,
    description TEXT,
    tags TEXT[],
    is_shared BOOLEAN,
    download_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    storage_path TEXT,
    next_cursor TIMESTAMP WITH TIME ZONE,
    has_more BOOLEAN
) AS $$
DECLARE
    search_pattern TEXT;
    total_count INTEGER;
BEGIN
    -- Build search pattern if provided
    IF p_search IS NOT NULL THEN
        search_pattern := '%' || p_search || '%';
    END IF;

    -- Get total count for has_more calculation
    SELECT count_coach_library_resources(
        p_coach_id, p_category, p_tags, p_search
    ) INTO total_count;

    -- Return paginated results with cursor
    RETURN QUERY
    WITH filtered_resources AS (
        SELECT
            fu.id,
            fu.filename,
            fu.file_type,
            fu.file_size,
            fu.file_category::TEXT,
            fu.description,
            fu.tags,
            fu.is_shared,
            fu.download_count,
            fu.created_at,
            fu.updated_at,
            fu.storage_path
        FROM file_uploads fu
        WHERE fu.user_id = p_coach_id
        AND fu.is_library_resource = TRUE
        AND (p_category IS NULL OR fu.file_category::TEXT = p_category)
        AND (p_tags IS NULL OR fu.tags && p_tags)
        AND (
            p_search IS NULL OR
            fu.filename ILIKE search_pattern OR
            fu.description ILIKE search_pattern
        )
        -- Cursor-based filtering
        AND (
            p_cursor IS NULL OR
            (
                CASE
                    WHEN p_sort_order = 'desc' THEN
                        fu.created_at < p_cursor OR
                        (fu.created_at = p_cursor AND fu.id < p_cursor_id)
                    ELSE
                        fu.created_at > p_cursor OR
                        (fu.created_at = p_cursor AND fu.id > p_cursor_id)
                END
            )
        )
        ORDER BY
            CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN fu.created_at END DESC,
            CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN fu.created_at END ASC,
            CASE WHEN p_sort_by = 'filename' AND p_sort_order = 'desc' THEN fu.filename END DESC,
            CASE WHEN p_sort_by = 'filename' AND p_sort_order = 'asc' THEN fu.filename END ASC,
            fu.id -- Tiebreaker for stable sorting
        LIMIT p_limit + 1 -- Fetch one extra to check if there are more results
    ),
    paginated_results AS (
        SELECT
            fr.*,
            ROW_NUMBER() OVER () AS rn
        FROM filtered_resources fr
    )
    SELECT
        pr.id,
        pr.filename,
        pr.file_type,
        pr.file_size,
        pr.file_category,
        pr.description,
        pr.tags,
        pr.is_shared,
        pr.download_count,
        pr.created_at,
        pr.updated_at,
        pr.storage_path,
        -- Next cursor is the last item's created_at
        CASE WHEN pr.rn = p_limit THEN pr.created_at ELSE NULL END AS next_cursor,
        -- Has more if we fetched more than the limit
        EXISTS (SELECT 1 FROM paginated_results WHERE rn > p_limit) AS has_more
    FROM paginated_results pr
    WHERE pr.rn <= p_limit
    ORDER BY pr.rn;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to count client shared resources
CREATE OR REPLACE FUNCTION count_client_shared_resources(
    p_client_id UUID,
    p_category TEXT DEFAULT NULL,
    p_coach_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    resource_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT fu.id)::INTEGER INTO resource_count
    FROM file_uploads fu
    INNER JOIN file_shares fs ON fs.file_id = fu.id
    WHERE fs.shared_with = p_client_id
    AND fu.is_library_resource = TRUE
    AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
    AND (p_category IS NULL OR fu.file_category::TEXT = p_category)
    AND (p_coach_id IS NULL OR fs.shared_by = p_coach_id);

    RETURN resource_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get paginated results with metadata
CREATE OR REPLACE FUNCTION get_resources_paginated_with_meta(
    p_coach_id UUID,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20,
    p_category TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    total_count INTEGER;
    total_pages INTEGER;
    offset_value INTEGER;
    result JSON;
BEGIN
    -- Calculate offset
    offset_value := (p_page - 1) * p_page_size;

    -- Get total count
    total_count := count_coach_library_resources(
        p_coach_id, p_category, p_tags, p_search
    );

    -- Calculate total pages
    total_pages := CEIL(total_count::NUMERIC / p_page_size);

    -- Build JSON response with pagination metadata
    SELECT json_build_object(
        'data', (
            SELECT COALESCE(json_agg(row_to_json(resources)), '[]'::json)
            FROM (
                SELECT
                    id,
                    filename,
                    file_type,
                    file_size,
                    file_category,
                    description,
                    tags,
                    is_shared,
                    download_count,
                    created_at,
                    updated_at
                FROM file_uploads
                WHERE user_id = p_coach_id
                AND is_library_resource = TRUE
                AND (p_category IS NULL OR file_category::TEXT = p_category)
                AND (p_tags IS NULL OR tags && p_tags)
                AND (
                    p_search IS NULL OR
                    filename ILIKE '%' || p_search || '%' OR
                    description ILIKE '%' || p_search || '%'
                )
                ORDER BY created_at DESC
                LIMIT p_page_size
                OFFSET offset_value
            ) AS resources
        ),
        'pagination', json_build_object(
            'page', p_page,
            'page_size', p_page_size,
            'total_count', total_count,
            'total_pages', total_pages,
            'has_previous', p_page > 1,
            'has_next', p_page < total_pages
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Add indexes to improve pagination performance
CREATE INDEX IF NOT EXISTS idx_file_uploads_library_created_cursor
ON file_uploads(user_id, is_library_resource, created_at DESC, id)
WHERE is_library_resource = TRUE;

CREATE INDEX IF NOT EXISTS idx_file_uploads_library_category
ON file_uploads(user_id, file_category, created_at DESC)
WHERE is_library_resource = TRUE;

CREATE INDEX IF NOT EXISTS idx_file_shares_shared_with_expires
ON file_shares(shared_with, expires_at)
WHERE expires_at IS NULL OR expires_at > NOW();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION count_coach_library_resources(UUID, TEXT, TEXT[], TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_resources_cursor_paginated(UUID, TIMESTAMP WITH TIME ZONE, UUID, INTEGER, TEXT, TEXT[], TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION count_client_shared_resources(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_resources_paginated_with_meta(UUID, INTEGER, INTEGER, TEXT, TEXT[], TEXT) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION count_coach_library_resources(UUID, TEXT, TEXT[], TEXT) IS 'Count resources for a coach with optional filters';
COMMENT ON FUNCTION get_resources_cursor_paginated(UUID, TIMESTAMP WITH TIME ZONE, UUID, INTEGER, TEXT, TEXT[], TEXT, TEXT, TEXT) IS 'Get resources with cursor-based pagination (more efficient for large datasets)';
COMMENT ON FUNCTION count_client_shared_resources(UUID, TEXT, UUID) IS 'Count resources shared with a client';
COMMENT ON FUNCTION get_resources_paginated_with_meta(UUID, INTEGER, INTEGER, TEXT, TEXT[], TEXT) IS 'Get resources with pagination metadata (page, total, has_more)';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Resource pagination system installed successfully';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Count functions for total results';
    RAISE NOTICE '  - Cursor-based pagination (efficient for large datasets)';
    RAISE NOTICE '  - Offset-based pagination with metadata';
    RAISE NOTICE '  - Optimized indexes for pagination queries';
    RAISE NOTICE '  - Support for filtered counts';
END $$;
