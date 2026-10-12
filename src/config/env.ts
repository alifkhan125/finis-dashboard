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

function getEnvVar(key: string, defaultValue?: string): string {
    const value = (import.meta.env as Record<string, string | undefined>)[key];
    if (value === undefined && defaultValue === undefined) {
        console.warn(`Environment variable ${key} is not defined`);
        return '';
    }
    return value || defaultValue || '';
}

function getBoolEnvVar(key: string, defaultValue = false): boolean {
    const value = (import.meta.env as Record<string, string | undefined>)[key];
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1';
}

export const config: EnvironmentConfig = {
    apiBaseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:6000').replace(/\/+$/, ''),
    useMockApi: getBoolEnvVar('VITE_USE_MOCK_API', false),
    environment: (getEnvVar('VITE_ENV', 'development') as EnvironmentConfig['environment']),

    features: {
        enableGeofencing: getBoolEnvVar('VITE_FEATURE_GEOFENCING', true),
        enableChat: getBoolEnvVar('VITE_FEATURE_CHAT', true),
        enableReports: getBoolEnvVar('VITE_FEATURE_REPORTS', true),
        enablePayroll: getBoolEnvVar('VITE_FEATURE_PAYROLL', true),
    },
    maps: {
        googleMapsApiKey: getEnvVar('VITE_GOOGLE_MAPS_API_KEY', ''),
    },
    stripe: {
        publishableKey: getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_51TUBgUC2pLUXHqxfzDZPxt9L8CDYLTfixYOJnDsNfcPDOalKo4vGfLGEvdN7ShuqaCwrt1atXEZPduPVZXJ4UZZt00IOTFH2VZ'),
    },

    app: {
        name: 'FinisPro Admin Dashboard',
        version: getEnvVar('VITE_APP_VERSION', '1.0.0'),
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
