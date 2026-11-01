/**
 * Environment Configuration
 * 
 * Centralized configuration for all environment variables.
 * Provides type-safe access to configuration values.
 */

interface EnvironmentConfig {
    apiBaseUrl: string;
    useMockApi: boolean;
    environment: 'development' | 'staging' | 'production';
    features: {
        enableGeofencing: boolean;
        enableChat: boolean;
        enableReports: boolean;
        enablePayroll: boolean;
    };
    maps: {
        googleMapsApiKey: string;
    };
    stripe: {
        publishableKey: string;
    };
    app: {
        name: string;
        version: string;
    };
}

export const config: EnvironmentConfig = {
    apiBaseUrl: ((import.meta.env.VITE_API_BASE_URL as string) || '').replace(/\/+$/, ''),
    useMockApi: import.meta.env.VITE_USE_MOCK_API === 'true' || import.meta.env.VITE_USE_MOCK_API === '1',
    environment: ((import.meta.env.VITE_ENV as string) || 'development') as EnvironmentConfig['environment'],

    features: {
        enableGeofencing: import.meta.env.VITE_FEATURE_GEOFENCING !== 'false',
        enableChat: import.meta.env.VITE_FEATURE_CHAT !== 'false',
        enableReports: import.meta.env.VITE_FEATURE_REPORTS !== 'false',
        enablePayroll: import.meta.env.VITE_FEATURE_PAYROLL !== 'false',
    },
    maps: {
        googleMapsApiKey: (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '',
    },
    stripe: {
        publishableKey: (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string) || 'pk_test_51TUBgUC2pLUXHqxfzDZPxt9L8CDYLTfixYOJnDsNfcPDOalKo4vGfLGEvdN7ShuqaCwrt1atXEZPduPVZXJ4UZZt00IOTFH2VZ',
    },

    app: {
        name: 'FinisPro Admin Dashboard',
        version: (import.meta.env.VITE_APP_VERSION as string) || '1.0.0',
    },
};

/**
 * Validate critical environment variables on app startup
 */
export function validateConfig(): void {
    const errors: string[] = [];

    if (!config.apiBaseUrl && !config.useMockApi) {
        errors.push('VITE_API_BASE_URL is required when mock API is disabled');
    }

    if (errors.length > 0) {
        console.error('Configuration validation errors:', errors);
        throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
}

// Development utilities
export const isDevelopment = config.environment === 'development';
export const isProduction = config.environment === 'production';
export const isStaging = config.environment === 'staging';
