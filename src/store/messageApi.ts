import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface ThreadParticipant {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    role: string;
}

export interface LastMessage {
    content: string | null;
    sentAt: string;
    senderId: string;
    isRead: boolean;
}

export interface Thread {
    id: string;
    type: 'direct' | 'group' | 'project';
    name: string;
    isActive: boolean;
    isReadOnly?: boolean;
    isBlocked?: boolean;
    blockedByMe?: boolean;
    blockedByOther?: boolean;
    lastMessage: LastMessage | null;
    unreadCount: number;
    participants: ThreadParticipant[];
}

export interface Message {
    id: string;
    threadId: string;
    senderId: string;
    content: string | null;
    mediaUrl: string | null;
    mediaType: string | null;
    isRead: boolean;
    sentAt: string;
    sender?: {
        id: string;
        fullName: string;
        avatarUrl: string | null;
        role: string;
    };
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages?: number;
    };
}

export interface ChatContact {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    role: string;
    status: string;
}

export interface SingleThreadResponse {
    data: Thread | null;
}

// ─────────────────────────────────────────────
// UNWRAP HELPERS
// ─────────────────────────────────────────────

function unwrap<T>(response: any): T {
    if (response?.success !== undefined && 'data' in response) return response.data as T;
    if (response && typeof response === 'object' && 'data' in response && !Array.isArray(response))
        return response.data as T;
    return response as T;
}

function unwrapPaginated<T>(response: any): PaginatedResponse<T> {
    if (response?.success !== undefined && Array.isArray(response?.data)) {
        return {
            data: response.data,
            meta: response.meta ?? { page: 1, limit: 20, total: response.data.length },
        };
    }
    if (Array.isArray(response?.data)) {
        return {
            data: response.data,
            meta: response.meta ?? { page: 1, limit: 20, total: response.data.length },
        };
    }
    return response;
}

// ─────────────────────────────────────────────
// API
// ─────────────────────────────────────────────

export const messageApi = createApi({
    reducerPath: 'messageApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${BASE_URL}/messages`,
        prepareHeaders: (headers) => {
            const token = localStorage.getItem('auth_token');
            if (token) headers.set('Authorization', `Bearer ${token}`);
            return headers;
        },
    }),
    tagTypes: ['Thread', 'Message', 'Contact', 'AdminSupportThread', 'AdminChatThread'],
    endpoints: (builder) => ({

        // ════════════════════════════════════════
        // CONTACTS
        // ════════════════════════════════════════

        /** Chat tab এর জন্য user search (super_admin বাদে) */
        getChatContacts: builder.query<ChatContact[], { search?: string } | void>({
            query: (params) => ({ url: 'contacts', params: params ?? {} }),
            transformResponse: (response: any) => unwrap<ChatContact[]>(response),
            providesTags: ['Contact'],
        }),

        /** Support tab এর জন্য super_admin user search করবে */
        searchUsersForSupport: builder.query<ChatContact[], { search?: string } | void>({
            query: (params) => ({ url: 'support/contacts', params: params ?? {} }),
            transformResponse: (response: any) => unwrap<ChatContact[]>(response),
        }),

        // ════════════════════════════════════════
        // USER — CHAT THREADS
        // ════════════════════════════════════════

        /** User এর নিজের user-to-user chat threads */
        getUserChatThreads: builder.query<PaginatedResponse<Thread>, { search?: string } | void>({
            query: (params) => ({ url: 'threads/chat', params: params ?? {} }),
            transformResponse: (response: any) => unwrapPaginated<Thread>(response),
            providesTags: ['Thread'],
        }),

        /** নতুন user-to-user chat thread তৈরি */
        createDirectThread: builder.mutation<Thread, { targetUserId: string }>({
            query: (body) => ({ url: 'threads/direct', method: 'POST', body }),
            transformResponse: (response: any) => unwrap<Thread>(response),
            invalidatesTags: ['Thread'],
        }),

        // ════════════════════════════════════════
        // USER — SUPPORT THREAD
        // ════════════════════════════════════════

        /** User এর super_admin এর সাথে support thread পাওয়া */
        getUserSupportThread: builder.query<SingleThreadResponse, void>({
            query: () => 'threads/support',
            transformResponse: (response: any) => unwrap<SingleThreadResponse>(response),
            providesTags: ['Thread'],
        }),

        /** Support thread তৈরি বা খোঁজা — user support tab open করলে call করবে */
        getOrCreateSupportThread: builder.mutation<Thread, void>({
            query: () => ({ url: 'support/thread', method: 'POST', body: {} }),
            transformResponse: (response: any) => unwrap<Thread>(response),
            invalidatesTags: ['Thread'],
        }),

        // ════════════════════════════════════════
        // USER — MESSAGES & SEND
        // ════════════════════════════════════════

        /** Thread এর messages পাওয়া */
        getMessages: builder.query<PaginatedResponse<Message>, { threadId: string; page?: number; limit?: number }>({
            query: ({ threadId, page, limit }) => ({
                url: `threads/${threadId}/messages`,
                params: { page, limit },
            }),
            transformResponse: (response: any) => unwrapPaginated<Message>(response),
            providesTags: (_r, _e, { threadId }) => [{ type: 'Message', id: threadId }],
        }),

        /** Message পাঠানো — REST fallback (socket না থাকলে) */
        sendMessage: builder.mutation<Message, { threadId: string; content?: string; mediaUrl?: string; mediaType?: string }>({
            query: (body) => ({ url: 'send', method: 'POST', body }),
            transformResponse: (response: any) => unwrap<Message>(response),
        }),

        /** File upload via backend multer */
        uploadMessageFile: builder.mutation<{ url: string; originalName: string; mimeType: string }, FormData>({
            query: (body) => ({
                url: 'upload',
                method: 'POST',
                body,
            }),
            transformResponse: (response: any) => unwrap<{ url: string; originalName: string; mimeType: string }>(response),
        }),

        /** নিজের message delete করা */
        deleteMessage: builder.mutation<{ message: string }, string>({
            query: (messageId) => ({ url: messageId, method: 'DELETE' }),
            transformResponse: (response: any) => unwrap<{ message: string }>(response),
            invalidatesTags: ['Message'],
        }),

        // ════════════════════════════════════════
        // SUPER ADMIN — SUPPORT THREADS
        // ════════════════════════════════════════

        /** সব support threads (super_admin ↔ user) */
        getAdminSupportThreads: builder.query<PaginatedResponse<Thread>, { search?: string } | void>({
            query: (params) => ({ url: 'admin/support/threads', params: params ?? {} }),
            transformResponse: (response: any) => unwrapPaginated<Thread>(response),
            providesTags: ['AdminSupportThread'],
        }),

        /** Support thread এর messages */
        getAdminSupportMessages: builder.query<PaginatedResponse<Message>, { threadId: string; page?: number; limit?: number }>({
            query: ({ threadId, page, limit }) => ({
                url: `admin/support/threads/${threadId}/messages`,
                params: { page, limit },
            }),
            transformResponse: (response: any) => unwrapPaginated<Message>(response),
            providesTags: (_r, _e, { threadId }) => [{ type: 'Message', id: `admin-support-${threadId}` }],
        }),

        /** super_admin কোনো user এর সাথে support thread শুরু করবে */
        adminStartSupportThread: builder.mutation<Thread, { targetUserId: string }>({
            query: (body) => ({ url: 'admin/support/thread', method: 'POST', body }),
            transformResponse: (response: any) => unwrap<Thread>(response),
            invalidatesTags: ['AdminSupportThread'],
        }),

        /** super_admin support thread এ message পাঠাবে — REST fallback */
        adminSendSupportMessage: builder.mutation<Message, { threadId: string; content?: string; mediaUrl?: string; mediaType?: string }>({
            query: (body) => ({ url: 'admin/support/send', method: 'POST', body }),
            transformResponse: (response: any) => unwrap<Message>(response),
        }),

        /** Support thread বন্ধ করা */
        closeThread: builder.mutation<unknown, string>({
            query: (threadId) => ({
                url: `admin/support/threads/${threadId}/close`,
                method: 'PATCH',
            }),
            transformResponse: (response: any) => unwrap<unknown>(response),
            invalidatesTags: ['AdminSupportThread'],
        }),

        /** Support thread export */
        exportThread: builder.query<unknown[], string>({
            query: (threadId) => `admin/support/threads/${threadId}/export`,
            transformResponse: (response: any) => unwrap<unknown[]>(response),
        }),

        // ════════════════════════════════════════
        // SUPER ADMIN — CHAT THREADS (READ ONLY)
        // ════════════════════════════════════════

        /** সব user-to-user chat threads (read only) */
        getAdminChatThreads: builder.query<PaginatedResponse<Thread>, { search?: string } | void>({
            query: (params) => ({ url: 'admin/chat/threads', params: params ?? {} }),
            transformResponse: (response: any) => unwrapPaginated<Thread>(response),
            providesTags: ['AdminChatThread'],
        }),

        /** Chat thread এর messages (read only) */
        getAdminChatMessages: builder.query<PaginatedResponse<Message>, { threadId: string; page?: number; limit?: number }>({
            query: ({ threadId, page, limit }) => ({
                url: `admin/chat/threads/${threadId}/messages`,
                params: { page, limit },
            }),
            transformResponse: (response: any) => unwrapPaginated<Message>(response),
            providesTags: (_r, _e, { threadId }) => [{ type: 'Message', id: `admin-chat-${threadId}` }],
        }),
    }),
});

export const {
    // Contacts
    useGetChatContactsQuery,
    useSearchUsersForSupportQuery,

    // User — Chat
    useGetUserChatThreadsQuery,
    useCreateDirectThreadMutation,

    // User — Support
    useGetUserSupportThreadQuery,
    useGetOrCreateSupportThreadMutation,

    // User — Messages
    useGetMessagesQuery,
    useSendMessageMutation,
    useUploadMessageFileMutation,
    useDeleteMessageMutation,

    // Super Admin — Support
    useGetAdminSupportThreadsQuery,
    useGetAdminSupportMessagesQuery,
    useAdminStartSupportThreadMutation,
    useAdminSendSupportMessageMutation,
    useCloseThreadMutation,
    useLazyExportThreadQuery,

    // Super Admin — Chat (read only)
    useGetAdminChatThreadsQuery,
    useGetAdminChatMessagesQuery,
} = messageApi;
