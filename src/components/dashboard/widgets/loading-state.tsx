interface LoadingStateProps {
  title?: string;
  description?: string;
  variant?: 'page' | 'card' | 'inline';
  showSkeleton?: boolean;
}

export function LoadingState({ 
  title, 
  description, 
  variant = 'page',
  showSkeleton = false 
}: LoadingStateProps) {
  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-center h-32">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {title && description ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">{description}</p>
          </div>
        </div>
      ) : showSkeleton && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded w-64 animate-pulse"></div>
            <div className="h-5 bg-muted rounded w-96 animate-pulse"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 bg-muted rounded w-24 animate-pulse"></div>
            <div className="h-9 bg-muted rounded w-20 animate-pulse"></div>
          </div>
        </div>
      )}
      
      {/* Content area */}
      {showSkeleton ? (
        <div className="space-y-6">
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                  <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-8 bg-muted rounded w-16 animate-pulse"></div>
                  <div className="h-3 bg-muted rounded w-20 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Chart skeleton */}
          <div className="rounded-lg border bg-card p-6">
            <div className="space-y-4">
              <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
              <div className="h-64 bg-muted rounded animate-pulse"></div>
            </div>
          </div>
          
          {/* Table skeleton */}
          <div className="rounded-lg border bg-card">
            <div className="p-6 border-b">
              <div className="h-6 bg-muted rounded w-40 animate-pulse"></div>
            </div>
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-muted rounded-full animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
                    <div className="h-3 bg-muted rounded w-24 animate-pulse"></div>
                  </div>
                  <div className="h-8 bg-muted rounded w-16 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <div className="text-center">
              <p className="text-lg font-medium">Loading</p>
              <p className="text-sm text-muted-foreground">Please wait while we fetch your data</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}