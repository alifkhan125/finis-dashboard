import { io } from 'socket.io-client';
import type { Socket as SocketClient } from 'socket.io-client';
import type { Store } from '@reduxjs/toolkit';
import { config } from '@/config/env';
import { setLiveWorkers, setWorkforceConnected, updateLiveWorker, clearLiveWorkers } from '../store/workforceSlice';

let socket: SocketClient | null = null;
let activeProjectId: string | null = null;

export function startWorkforceSocket(store: Store, projectId: string) {
  const currentSocket = socket;

  const joinProject = (nextProjectId: string) => {
    const activeSocket = socket;
    if (!activeSocket) return;
    if (activeProjectId && activeProjectId !== nextProjectId) {
      activeSocket.emit('leave_project', { projectId: activeProjectId });
    }
    activeProjectId = nextProjectId;
    activeSocket.emit('join_project', { projectId: nextProjectId });
    activeSocket.emit('get_live_workers', { projectId: nextProjectId });
  };

  if (currentSocket) {
    joinProject(projectId);
    return currentSocket;
  }

  const SERVER = (() => {
    if (config.apiBaseUrl === '/api') return window.location.origin;
    try {
      const url = new URL(config.apiBaseUrl);
      const pathname = url.pathname.replace(/\/+$/, '');
      return `${url.origin}${pathname}`;
    } catch {
      return (config.apiBaseUrl || 'http://localhost:3000').replace(/\/+$/, '');
    }
  })();
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : '';

  socket = io(`${SERVER}/geofencing`, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    store.dispatch(setWorkforceConnected(true));
    joinProject(projectId);
  });

  socket.on('joined_project', () => {
    socket?.emit('get_live_workers', { projectId: activeProjectId ?? projectId });
  });

  socket.on('live_workers', (payload: any) => {
    const workers = Array.isArray(payload?.workers) ? payload.workers : [];
    const normalized: Record<string, any> = {};
    workers.forEach((worker: any) => {
      if (!worker?.workerId) return;
      const isInsideZone = Boolean(worker.isInsideZone);
      normalized[worker.workerId] = {
        workerId: worker.workerId,
        workerName: worker.workerName || worker.name || '',
        avatarUrl: worker.avatarUrl ?? null,
        lat: typeof worker.lat === 'number' ? worker.lat : 0,
        lng: typeof worker.lng === 'number' ? worker.lng : 0,
        isInsideZone,
        zoneName: worker.zoneName ?? null,
        totalZoneHours: worker.totalZoneHours ?? 0,
        status: isInsideZone ? 'inside' : 'outside',
        timestamp: worker.timestamp ?? new Date().toISOString(),
      };
    });

    store.dispatch(setLiveWorkers(normalized));
  });

  socket.on('worker_location', (payload: any) => {
    if (!payload?.workerId) return;
    store.dispatch(updateLiveWorker({
      workerId: payload.workerId,
      workerName: payload.workerName || '',
      avatarUrl: payload.avatarUrl ?? null,
      lat: payload.lat ?? 0,
      lng: payload.lng ?? 0,
      isInsideZone: Boolean(payload.isInsideZone),
      zoneName: payload.zoneName ?? null,
      totalZoneHours: payload.totalZoneHours ?? 0,
      status: payload.isInsideZone ? 'inside' : 'outside',
      timestamp: payload.timestamp ?? new Date().toISOString(),
    }));
  });

  socket.on('worker_checked_in', (payload: any) => {
    const workerId = payload?.worker?.id ?? payload?.workerId ?? payload?.id;
    if (!workerId) return;
    store.dispatch(updateLiveWorker({
      workerId,
      workerName: payload?.worker?.fullName || payload?.worker?.name || payload?.workerName || payload?.name || '',
      avatarUrl: payload?.worker?.avatarUrl ?? payload?.avatarUrl ?? null,
      lat: typeof payload.lat === 'number' ? payload.lat : typeof payload?.worker?.lat === 'number' ? payload.worker.lat : 0,
      lng: typeof payload.lng === 'number' ? payload.lng : typeof payload?.worker?.lng === 'number' ? payload.worker.lng : 0,
      isInsideZone: Boolean(payload.isInsideZone),
      zoneName: payload.zoneName ?? null,
      totalZoneHours: payload.totalZoneHours ?? 0,
      status: payload.isInsideZone ? 'inside' : 'outside',
      timestamp: payload.checkInTime ?? new Date().toISOString(),
    }));
  });

  socket.on('worker_checked_out', (payload: any) => {
    const workerId = payload?.worker?.id ?? payload?.workerId ?? payload?.id;
    if (!workerId) return;
    store.dispatch(updateLiveWorker({
      workerId,
      workerName: payload?.worker?.fullName || payload?.worker?.name || payload?.workerName || payload?.name || '',
      avatarUrl: payload?.worker?.avatarUrl ?? payload?.avatarUrl ?? null,
      lat: 0,
      lng: 0,
      isInsideZone: false,
      zoneName: null,
      totalZoneHours: payload.totalZoneHours ?? 0,
      status: 'outside',
      timestamp: payload.checkOutTime ?? new Date().toISOString(),
    }));
  });

  socket.on('location_update', (payload: any) => {
    if (!payload?.workerId) return;
    store.dispatch(updateLiveWorker({
      workerId: payload.workerId,
      workerName: payload.workerName || '',
      avatarUrl: payload.avatarUrl ?? null,
      lat: payload.lat ?? 0,
      lng: payload.lng ?? 0,
      isInsideZone: Boolean(payload.isInsideZone),
      zoneName: payload.zoneName ?? null,
      totalZoneHours: payload.totalZoneHours ?? 0,
      status: payload.isInsideZone ? 'inside' : 'outside',
      timestamp: payload.timestamp ?? new Date().toISOString(),
    }));
  });

  socket.on('disconnect', () => {
    store.dispatch(setWorkforceConnected(false));
    store.dispatch(clearLiveWorkers());
    activeProjectId = null;
  });

  return socket;
}

export function stopWorkforceSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  activeProjectId = null;
}
