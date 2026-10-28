import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Message, Thread } from '../messageApi';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL === '/api'
    ? window.location.origin
    : import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:6000';

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

interface UseChatSocketOptions {
    activeThreadId?: string | null;
    onNewSupportThread?: (threadId: string, thread: Thread) => void;
    onMessage?: (message: Message) => void;
    onThreadUpdate?: (payload: { threadId: string; lastMessage: Message }) => void;
    onReadReceipt?: (payload: { userId: string; threadId: string }) => void;
    onTyping?: (payload: { userId: string; threadId: string; isTyping: boolean }) => void;
}

export function useChatSocket({
    activeThreadId,
    onNewSupportThread,
    onMessage,
    onThreadUpdate,
    onReadReceipt,
    onTyping,
}: UseChatSocketOptions = {}) {
    const socketRef = useRef<Socket | null>(null);
    const activeThreadRef = useRef<string | null | undefined>(activeThreadId);

    // ── CONNECT ──────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const socket = io(`${SOCKET_URL}/chat`, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            if (activeThreadRef.current) {
                socket.emit('thread:join', { threadId: activeThreadRef.current });
            }
        });

        socket.on('reconnect', () => {
            if (activeThreadRef.current) {
                socket.emit('thread:join', { threadId: activeThreadRef.current });
            }
        });

        socket.on('disconnect', () => {
        });

        socket.on('connect_error', (err) => {
            console.error('[Socket] connect error:', err.message);
        });

        // Online / Offline presence
        socket.on('user:online', () => {});

        socket.on('user:offline', () => {});

        // নতুন message আসলে
        socket.on('message:new', (message: Message) => {
            onMessage?.(message);
        });

        socket.on('message:read', ({ userId, threadId }: { userId: string; threadId: string }) => {
            onReadReceipt?.({ userId, threadId });
        });

        // Thread list update (last message)
        socket.on('thread:updated', ({ threadId, lastMessage }: { threadId: string; lastMessage: Message }) => {
            onThreadUpdate?.({ threadId, lastMessage });
        });

        // Typing indicator
        socket.on(
            'message:typing',
            ({ userId, threadId, isTyping }: { userId: string; threadId: string; isTyping: boolean }) => {
                onTyping?.({ userId, threadId, isTyping });
            },
        );

        // Super admin কে নতুন support thread এর notification
        // (user support tab open করলে এই event আসে)
        socket.on('support:thread:new', ({ threadId, thread }: { threadId: string; thread: Thread }) => {
            onNewSupportThread?.(threadId, thread);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── JOIN / LEAVE THREAD ROOM ──────────────────
    useEffect(() => {
        activeThreadRef.current = activeThreadId;
        const socket = socketRef.current;
        if (!socket || !activeThreadId) return;

        socket.emit('thread:join', { threadId: activeThreadId });

        return () => {
            socket.emit('thread:leave', { threadId: activeThreadId });
        };
    }, [activeThreadId]);

    // ── ACTIONS ───────────────────────────────────

    /** Message পাঠানো */
    const sendSocketMessage = useCallback(
        (threadId: string, content: string, mediaUrl?: string, mediaType?: string) => {
            socketRef.current?.emit('message:send', { threadId, content, mediaUrl, mediaType });
        },
        [],
    );

    /**
     * User support thread তৈরির পরে এই function call করতে হবে।
     * Socket server super_admin কে notify করবে এবং নতুন room এ join করাবে।
     */
    const notifySupportThreadCreated = useCallback((threadId: string) => {
        socketRef.current?.emit('support:thread:new', { threadId });
    }, []);

    const sendTyping = useCallback((threadId: string, isTyping: boolean) => {
        socketRef.current?.emit('message:typing', { threadId, isTyping });
    }, []);

    const markRead = useCallback((threadId: string) => {
        socketRef.current?.emit('message:read', { threadId });
    }, []);

    const checkOnlineStatus = useCallback((userIds: string[]) => {
        socketRef.current?.emit('user:status', { userIds });
    }, []);

    return {
        sendSocketMessage,
        notifySupportThreadCreated,
        sendTyping,
        markRead,
        checkOnlineStatus,
    };
}
