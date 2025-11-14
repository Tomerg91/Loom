/**
 * Resource Engagement Analytics
 *
 * Tracks resource-related user interactions including:
 * - Resource views and downloads
 * - Resource sharing and collaboration
 * - Resource creation and uploads
 * - Resource search and discovery
 * - Resource engagement metrics
 */

import { trackEvent, posthogEvent } from './analytics';
import {
  trackResourceViewed as persistResourceViewed,
  trackResourceDownloaded as persistResourceDownloaded,
  trackResourceShared as persistResourceShared,
} from './event-tracking';
import * as Sentry from '@sentry/nextjs';

export interface ResourceEvent {
  userId: string;
  resourceId: string;
  resourceType: 'pdf' | 'video' | 'audio' | 'image' | 'document' | 'spreadsheet' | 'presentation' | 'other';
  resourceName: string;
  metadata?: Record<string, unknown>;
}

/**
 * Track resource view
 */
export const trackResourceViewed = (
  data: ResourceEvent & {
    viewDurationSeconds?: number;
    scrollDepthPercent?: number;
    isFirstView?: boolean;
  }
) => {
  const eventData = {
    action: 'resource_viewed',
    category: 'resource_engagement',
    label: data.resourceType,
    value: data.viewDurationSeconds,
    userId: data.userId,
    properties: {
      resourceId: data.resourceId,
      resourceType: data.resourceType,
      resourceName: data.resourceName,
      viewDurationSeconds: data.viewDurationSeconds,
      scrollDepthPercent: data.scrollDepthPercent,
      isFirstView: data.isFirstView,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('resource_viewed', eventData.properties);

  // Track in database
  persistResourceViewed(data.userId, data.resourceId, data.metadata).catch(
    (error) => {
      Sentry.captureException(error, {
        tags: { event_type: 'resource_tracking_error' },
      });
    }
  );

  // Track view metrics
  Sentry.metrics.increment('resource_views', 1, {
    tags: {
      resource_type: data.resourceType,
      is_first_view: data.isFirstView ? 'yes' : 'no',
    },
  });

  // Track engagement depth
  if (data.viewDurationSeconds) {
    Sentry.metrics.distribution(
      'resource_view_duration',
      data.viewDurationSeconds,
      {
        tags: {
          resource_type: data.resourceType,
        },
        unit: 'second',
      }
    );
  }

  if (data.scrollDepthPercent) {
    Sentry.metrics.distribution(
      'resource_scroll_depth',
      data.scrollDepthPercent,
      {
        tags: {
          resource_type: data.resourceType,
        },
        unit: 'percent',
      }
    );
  }
};

/**
 * Track resource download
 */
export const trackResourceDownloaded = (
  data: ResourceEvent & {
    downloadSource: 'direct' | 'search' | 'recommendation' | 'share';
    fileSizeBytes?: number;
  }
) => {
  const eventData = {
    action: 'resource_downloaded',
    category: 'resource_engagement',
    label: data.resourceType,
    userId: data.userId,
    properties: {
      resourceId: data.resourceId,
      resourceType: data.resourceType,
      resourceName: data.resourceName,
      downloadSource: data.downloadSource,
      fileSizeBytes: data.fileSizeBytes,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('resource_downloaded', eventData.properties);

  // Track in database
  persistResourceDownloaded(
    data.userId,
    data.resourceId,
    data.metadata
  ).catch(
    (error) => {
      Sentry.captureException(error);
    }
  );

  // Track download metrics
  Sentry.metrics.increment('resource_downloads', 1, {
    tags: {
      resource_type: data.resourceType,
      source: data.downloadSource,
    },
  });

  // Track file size distribution
  if (data.fileSizeBytes) {
    Sentry.metrics.distribution('download_file_size', data.fileSizeBytes, {
      tags: {
        resource_type: data.resourceType,
      },
      unit: 'byte',
    });
  }
};

/**
 * Track resource sharing
 */
export const trackResourceShared = (
  data: ResourceEvent & {
    shareMethod: 'email' | 'link' | 'social' | 'internal';
    recipientCount?: number;
    shareMessage?: string;
  }
) => {
  const eventData = {
    action: 'resource_shared',
    category: 'resource_engagement',
    label: data.shareMethod,
    value: data.recipientCount,
    userId: data.userId,
    properties: {
      resourceId: data.resourceId,
      resourceType: data.resourceType,
      resourceName: data.resourceName,
      shareMethod: data.shareMethod,
      recipientCount: data.recipientCount,
      hasMessage: !!data.shareMessage,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('resource_shared', eventData.properties);

  // Track in database
  persistResourceShared(data.userId, data.resourceId, data.metadata).catch(
    (error) => {
      Sentry.captureException(error);
    }
  );

  // Track sharing metrics
  Sentry.metrics.increment('resource_shares', 1, {
    tags: {
      resource_type: data.resourceType,
      method: data.shareMethod,
    },
  });

  // Track viral coefficient
  if (data.recipientCount) {
    Sentry.metrics.distribution('share_recipient_count', data.recipientCount, {
      tags: {
        method: data.shareMethod,
      },
    });
  }
};

/**
 * Track resource upload/creation
 */
export const trackResourceCreated = (
  data: ResourceEvent & {
    uploadMethod: 'drag_drop' | 'file_picker' | 'url' | 'integration' | 'api';
    fileSizeBytes?: number;
    processingTimeMs?: number;
  }
) => {
  const eventData = {
    action: 'resource_created',
    category: 'resource_engagement',
    label: data.resourceType,
    userId: data.userId,
    properties: {
      resourceId: data.resourceId,
      resourceType: data.resourceType,
      resourceName: data.resourceName,
      uploadMethod: data.uploadMethod,
      fileSizeBytes: data.fileSizeBytes,
      processingTimeMs: data.processingTimeMs,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('resource_created', eventData.properties);

  // Track creation metrics
  Sentry.metrics.increment('resource_creations', 1, {
    tags: {
      resource_type: data.resourceType,
      method: data.uploadMethod,
    },
  });

  // Track upload performance
  if (data.processingTimeMs) {
    Sentry.metrics.distribution('resource_processing_time', data.processingTimeMs, {
      tags: {
        resource_type: data.resourceType,
      },
      unit: 'millisecond',
    });
  }
};

/**
 * Track resource search
 */
export const trackResourceSearch = (data: {
  userId: string;
  searchQuery: string;
  resultsCount: number;
  filters?: Record<string, unknown>;
  selectedResultId?: string;
  selectedResultPosition?: number;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'resource_search',
    category: 'resource_discovery',
    label: data.searchQuery,
    value: data.resultsCount,
    userId: data.userId,
    properties: {
      searchQuery: data.searchQuery,
      resultsCount: data.resultsCount,
      filters: data.filters,
      selectedResultId: data.selectedResultId,
      selectedResultPosition: data.selectedResultPosition,
      hasResults: data.resultsCount > 0,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('resource_search', eventData.properties);

  // Track search metrics
  Sentry.metrics.increment('resource_searches', 1, {
    tags: {
      has_results: data.resultsCount > 0 ? 'yes' : 'no',
    },
  });

  // Track search effectiveness
  if (data.selectedResultId) {
    Sentry.metrics.increment('resource_search_clicks', 1);

    if (data.selectedResultPosition) {
      Sentry.metrics.distribution('search_result_position', data.selectedResultPosition);
    }
  }
};

/**
 * Track resource recommendation interaction
 */
export const trackResourceRecommendation = (data: {
  userId: string;
  resourceId: string;
  resourceType: string;
  recommendationType: 'similar' | 'popular' | 'personalized' | 'trending';
  action: 'viewed' | 'clicked' | 'dismissed';
  position?: number;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'resource_recommendation',
    category: 'resource_discovery',
    label: `${data.recommendationType}:${data.action}`,
    userId: data.userId,
    properties: {
      resourceId: data.resourceId,
      resourceType: data.resourceType,
      recommendationType: data.recommendationType,
      recommendationAction: data.action,
      position: data.position,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('resource_recommendation', eventData.properties);

  // Track recommendation effectiveness
  Sentry.metrics.increment('resource_recommendations', 1, {
    tags: {
      type: data.recommendationType,
      action: data.action,
    },
  });
};

/**
 * Track resource engagement score update
 */
export const trackResourceEngagementScore = (data: {
  userId: string;
  resourceId: string;
  engagementScore: number;
  engagementActions: {
    views?: number;
    downloads?: number;
    shares?: number;
    ratings?: number;
    comments?: number;
  };
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'resource_engagement_score',
    category: 'resource_metrics',
    label: data.resourceId,
    value: data.engagementScore,
    userId: data.userId,
    properties: {
      resourceId: data.resourceId,
      engagementScore: data.engagementScore,
      ...data.engagementActions,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('resource_engagement_score', eventData.properties);

  // Track engagement distribution
  Sentry.metrics.distribution('resource_engagement_score', data.engagementScore);
};

/**
 * Track resource rating/feedback
 */
export const trackResourceRating = (data: {
  userId: string;
  resourceId: string;
  resourceType: string;
  rating: number;
  maxRating: number;
  feedback?: string;
  metadata?: Record<string, unknown>;
}) => {
  const eventData = {
    action: 'resource_rating',
    category: 'resource_feedback',
    label: data.resourceId,
    value: data.rating,
    userId: data.userId,
    properties: {
      resourceId: data.resourceId,
      resourceType: data.resourceType,
      rating: data.rating,
      maxRating: data.maxRating,
      normalizedRating: (data.rating / data.maxRating) * 100,
      hasFeedback: !!data.feedback,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('resource_rating', eventData.properties);

  // Track rating distribution
  Sentry.metrics.distribution('resource_ratings', data.rating, {
    tags: {
      resource_type: data.resourceType,
    },
  });
};

/**
 * Track resource deletion
 */
export const trackResourceDeleted = (data: ResourceEvent & {
  deleteReason?: 'outdated' | 'duplicate' | 'error' | 'privacy' | 'other';
  hadEngagement: boolean;
  viewCount?: number;
}) => {
  const eventData = {
    action: 'resource_deleted',
    category: 'resource_lifecycle',
    label: data.resourceType,
    userId: data.userId,
    properties: {
      resourceId: data.resourceId,
      resourceType: data.resourceType,
      resourceName: data.resourceName,
      deleteReason: data.deleteReason,
      hadEngagement: data.hadEngagement,
      viewCount: data.viewCount,
      timestamp: new Date().toISOString(),
      ...data.metadata,
    },
  };

  trackEvent(eventData);
  posthogEvent('resource_deleted', eventData.properties);

  // Track deletion metrics
  Sentry.metrics.increment('resource_deletions', 1, {
    tags: {
      resource_type: data.resourceType,
      reason: data.deleteReason || 'unknown',
      had_engagement: data.hadEngagement ? 'yes' : 'no',
    },
  });
};
