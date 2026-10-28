import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { config } from '@/config/env';
import { selectAuthToken, selectAuthUser } from '@/store/authSlice';
import { useAppSelector } from '@/store/hooks';
import type { Notification } from '@/shared/types';

type ApiNotification = {
  id: string;
  title: string;
  body?: string | null;
  type?: string;
  isRead?: boolean;
  createdAt?: string;
  refId?: string | null;
  refType?: string | null;
};

function getApiOrigin() {
  try {
    const url = new URL(config.apiBaseUrl);
    const pathname = url.pathname.replace(/\/+$/, '');
    return `${url.origin}${pathname}`;
  } catch {
    return (config.apiBaseUrl || 'http://localhost:3000').replace(/\/+$/, '');
  }
}

function formatTimeLabel(value?: string) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function mapType(type?: string): Notification['type'] {
  switch (type) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'info';
  }
}

function resolveNotificationLink(refType?: string | null, refId?: string | null): string | undefined {
  if (!refType || !refId) return undefined;

  switch (refType) {
    case 'company':
      return `/companies/${refId}`;
    case 'project':
      return `/projects/${refId}`;
    case 'task':
      return `/notifications`;
    case 'sub_task':
      return `/notifications`;
    case 'task_report':
      return `/notifications`;
    case 'payroll':
      return `/admin/payroll`;
    case 'geofence_violation':
      return `/geofencing`;
    case 'attendance_session':
      return `/attendance`;
    case 'leave_request':
      return `/notifications`;
    case 'support_request':
      return `/notifications`;
    case 'message_thread':
      return `/chat`;
    case 'message_block':
      return `/chat`;
    default:
      return `/notifications`;
  }
}

function mapNotification(notification: ApiNotification): Notification {
  const refType = typeof notification.refType === 'string' ? notification.refType : '';
  const refId = typeof notification.refId === 'string' ? notification.refId : '';
  return {
    id: notification.id,
    title: notification.title,
    message: notification.body || '',
    type: mapType(notification.type),
    timestamp: formatTimeLabel(notification.createdAt),
    read: Boolean(notification.isRead),
    link: resolveNotificationLink(refType, refId),
    refId: notification.refId ?? null,
    refType: notification.refType ?? null,
  };
}

export function useNotifications() {
  const token = useAppSelector(selectAuthToken);
  const user = useAppSelector(selectAuthUser);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(false);

  const endpoints = useMemo(() => {
    const isSuperAdmin = user?.role === 'super_admin';
    const base = isSuperAdmin ? '/notifications/super-admin' : '/notifications';
    return {
      list: `${config.apiBaseUrl}${base}/my`,
      unread: `${config.apiBaseUrl}${base}/unread-count`,
      markRead: (id: string) => `${config.apiBaseUrl}/notifications/${id}/read`,
      markAllRead: `${config.apiBaseUrl}/notifications/mark-all-read`,
    };
  }, [user?.role]);

  useEffect(() => {
    if (!token) return;

    const nextSocket = io(`${getApiOrigin()}/notifications`, {
      transports: ['websocket'],
      auth: { token },
    });

    nextSocket.on('notification', (notification: ApiNotification) => {
      setNotifications((prev) => [mapNotification(notification), ...prev.filter((item) => item.id !== notification.id)].slice(0, 50));
    });

    setSocket(nextSocket);

    return () => {
      nextSocket.removeAllListeners();
      nextSocket.disconnect();
      setSocket(null);
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(endpoints.list, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        const items = Array.isArray(data) ? data : data?.data ?? data?.notifications ?? [];
        setNotifications(Array.isArray(items) ? items.map(mapNotification) : []);
      } catch (error) {
        console.error('Failed to load notifications:', error);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    void load();

    const intervalId = window.setInterval(() => {
      void load();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [endpoints.list, token]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
    try {
      await fetch(endpoints.markRead(id), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    try {
      await fetch(endpoints.markAllRead, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  return {
    socket,
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
}
