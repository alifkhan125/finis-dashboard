/**
 * API Client
 * 
 * Centralized HTTP client with interceptors, error handling, and retry logic.
 * This is the foundation for all API calls in the application.
 */

import { config } from '@/config/env';
import type { ApiError, ApiResponse } from '@/shared/types';

interface RequestConfig extends RequestInit {
    params?: Record<string, string | number | boolean>;
    responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}

class ApiClient {
    private baseURL: string;
    private defaultHeaders: HeadersInit;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
    }

    /**
     * Add authentication token to requests
     */
    private getAuthHeaders(): HeadersInit {
        const token = this.getAuthToken();
        if (token) {
            return {
                ...this.defaultHeaders,
                Authorization: `Bearer ${token}`,
            };
        }
        return this.defaultHeaders;
    }

    /**
     * Get auth token from storage
     */
    private getAuthToken(): string | null {
        return localStorage.getItem('auth_token');
    }

    /**
     * Build URL with query parameters
     */
    private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
        const url = new URL(`${this.baseURL}${endpoint}`);

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, String(value));
            });
        }

        return url.toString();
    }

    /**
     * Handle API response
     */
    private async handleResponse<T>(response: Response, config?: RequestConfig): Promise<ApiResponse<T>> {
        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const isBlob =
            config?.responseType === 'blob' ||
            contentType.includes('application/pdf') ||
            contentType.includes('application/octet-stream') ||
            contentType.includes('image/');

        if (!response.ok) {
            let serverMessage: any = undefined;
            try {
                if (isJson) {
                    const json = await response.json();
                    serverMessage = json?.message || json?.error;
                } else {
                    serverMessage = await response.text();
                }
            } catch (_) {}

            const error: ApiError = {
                code: `HTTP_${response.status}`,
                message: (Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage) || response.statusText,
                statusCode: response.status,
                details: isJson && typeof serverMessage === 'object' ? serverMessage : undefined,
            };
            throw error;
        }

        let data: T;
        if (isBlob) {
            data = (await response.blob()) as unknown as T;
        } else if (isJson) {
            data = await response.json();
        } else {
            data = (await response.text()) as unknown as T;
        }

        return {
            data,
            status: response.status,
        };
    }

    /**
     * Handle API errors
     */
    private handleError(error: unknown): never {
        if (error instanceof Error) {
            const apiError: ApiError = {
                code: 'NETWORK_ERROR',
                message: error.message,
            };
            throw apiError;
        }
        throw error;
    }

    /**
     * Generic request method
     */
    private async request<T>(
        endpoint: string,
        config: RequestConfig = {}
    ): Promise<ApiResponse<T>> {
        const { params, headers, ...restConfig } = config;
        const url = this.buildUrl(endpoint, params);

        try {
            const response = await fetch(url, {
                ...restConfig,
                headers: {
                    ...this.getAuthHeaders(),
                    ...headers,
                },
            });

            return await this.handleResponse<T>(response, config);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * GET request
     */
    async get<T>(
        endpoint: string,
        configOrParams?: Record<string, any> | RequestConfig
    ): Promise<ApiResponse<T>> {
        let config: RequestConfig = { method: 'GET' };
        if (configOrParams) {
            if ('responseType' in configOrParams || 'headers' in configOrParams || 'params' in configOrParams) {
                config = { ...config, ...(configOrParams as RequestConfig), method: 'GET' };
            } else {
                config.params = configOrParams as Record<string, string | number | boolean>;
            }
        }
        return this.request<T>(endpoint, config);
    }

    /**
     * Direct Blob Download
     */
    async downloadBlob(
        endpoint: string,
        params?: Record<string, string | number | boolean>
    ): Promise<Blob> {
        const res = await this.request<Blob>(endpoint, {
            method: 'GET',
            params,
            responseType: 'blob',
        });
        return res.data;
    }

    /**
     * POST request
     */
    async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * PUT request
     */
    async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    /**
     * PATCH request
     */
    async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    /**
     * DELETE request
     */
    async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }

    /**
     * Upload file
     */
    async uploadFile<T>(
        endpoint: string,
        file: File,
        additionalData?: Record<string, unknown>,
        fileFieldName: string = 'file',
        method: 'POST' | 'PUT' | 'PATCH' = 'POST'
    ): Promise<ApiResponse<T>> {
        const formData = new FormData();
        formData.append(fileFieldName, file);

        if (additionalData) {
            Object.entries(additionalData).forEach(([key, value]) => {
                formData.append(key, typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value));
            });
        }

        const token = this.getAuthToken();
        const headers: HeadersInit = token
            ? { Authorization: `Bearer ${token}` }
            : {};

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method,
                headers,
                body: formData,
            });

            return await this.handleResponse<T>(response);
        } catch (error) {
            return this.handleError(error);
        }
    }
}

// Export singleton instance
export const apiClient = new ApiClient(config.apiBaseUrl);
