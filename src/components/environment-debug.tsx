'use client';

import React, { useState, useEffect } from 'react';

interface EnvironmentStatus {
  NEXT_PUBLIC_SUPABASE_URL: {
    present: boolean;
    valid: boolean;
    value: string;
    issues: string[];
  };
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    present: boolean;
    valid: boolean;
    value: string;
    issues: string[];
  };
}

/**
 * Environment Debug Component
 * 
 * This component helps debug environment variable issues in production.
 * Only renders in development mode or when explicitly enabled.
 */
export function EnvironmentDebug({ forceShow = false }: { forceShow?: boolean }) {
  const [status, setStatus] = useState<EnvironmentStatus | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Only show in development or when explicitly forced
  const shouldShow = process.env.NODE_ENV === 'development' || forceShow;

  useEffect(() => {
    if (!shouldShow) return;

    const checkEnvironment = () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const urlStatus = {
        present: !!supabaseUrl,
        valid: false,
        value: supabaseUrl || 'NOT_SET',
        issues: [] as string[]
      };

      const keyStatus = {
        present: !!supabaseKey,
        valid: false,
        value: supabaseKey ? `${supabaseKey.substring(0, 10)}...` : 'NOT_SET',
        issues: [] as string[]
      };

      // Validate URL
      if (supabaseUrl) {
        try {
          const url = new URL(supabaseUrl);
          if (url.hostname.includes('supabase.co') || url.hostname.includes('localhost')) {
            urlStatus.valid = true;
          } else {
            urlStatus.issues.push('URL does not match expected Supabase pattern');
          }

          // Check for placeholder values
          const placeholderPatterns = [
            'your-project-id',
            'MISSING_',
            'INVALID_',
          ];
          
          if (placeholderPatterns.some(pattern => supabaseUrl.includes(pattern))) {
            urlStatus.valid = false;
            urlStatus.issues.push('Contains placeholder value');
          }

        } catch (error) {
          urlStatus.issues.push('Invalid URL format');
        }
      } else {
        urlStatus.issues.push('Environment variable not set');
      }

      // Validate key
      if (supabaseKey) {
        if (supabaseKey.startsWith('eyJ') && supabaseKey.length > 100) {
          keyStatus.valid = true;
        } else {
          keyStatus.issues.push('Invalid JWT format or too short');
        }

        if (supabaseKey.includes('your-supabase') || supabaseKey.includes('MISSING_')) {
          keyStatus.valid = false;
          keyStatus.issues.push('Contains placeholder value');
        }
      } else {
        keyStatus.issues.push('Environment variable not set');
      }

      setStatus({
        NEXT_PUBLIC_SUPABASE_URL: urlStatus,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: keyStatus
      });
    };

    checkEnvironment();
  }, [shouldShow]);

  if (!shouldShow || !status) {
    return null;
  }

  const hasIssues = !status.NEXT_PUBLIC_SUPABASE_URL.valid || !status.NEXT_PUBLIC_SUPABASE_ANON_KEY.valid;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`px-3 py-2 rounded-lg text-sm font-medium ${
          hasIssues 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'bg-green-500 text-white hover:bg-green-600'
        } shadow-lg transition-colors`}
      >
        ENV {hasIssues ? '⚠️' : '✅'}
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full right-0 mb-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Environment Status
          </h3>
          
          {Object.entries(status).map(([key, value]) => (
            <div key={key} className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                  {key}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${
                  value.valid 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {value.valid ? 'Valid' : 'Invalid'}
                </span>
              </div>
              
              <div className="text-xs text-gray-600 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded mb-1">
                {value.value}
              </div>
              
              {value.issues.length > 0 && (
                <ul className="text-xs text-red-600 dark:text-red-400">
                  {value.issues.map((issue, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-1">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            <p>Environment: {process.env.NODE_ENV}</p>
            <p>Client-side validation active</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnvironmentDebug;