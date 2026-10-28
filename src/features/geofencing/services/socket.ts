import { io } from 'socket.io-client';
import type { Socket as SocketClient } from 'socket.io-client';
import type { Store } from '@reduxjs/toolkit';
import { config } from '@/config/env';
import {
  setGeofences,
  setLiveWorkers,
  updateWorkerLocation,
  removeWorker,
  addLog,
} from '../store/geofencingSlice';

let socket: SocketClient | null = null;
let activeToken: string | null = null;

function normalizeWorker(worker: any) {
  const source = worker?.worker ?? worker?.workerData ?? worker ?? {};
  const workerId = source.workerId ?? source.id ?? worker?.workerId ?? worker?.id;
  const isInsideZone = Boolean(worker.isInsideZone);
  const status =
    typeof worker.status === 'string' && worker.status.trim()
      ? worker.status
      : isInsideZone
        ? 'inside'
        : 'outside';

  return {
    workerId,
    name: source.fullName || source.workerName || worker.workerName || worker.name || source.name || '',
    lat: typeof worker.lat === 'number' ? worker.lat : typeof source.lat === 'number' ? source.lat : 0,
    lng: typeof worker.lng === 'number' ? worker.lng : typeof source.lng === 'number' ? source.lng : 0,
    timestamp: worker.timestamp || source.timestamp || new Date().toISOString(),
    status,
    isInsideZone,
    zoneName: worker.zoneName ?? source.zoneName ?? null,
  };
}

export function startGeofencingSocket(store: Store) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : '';
  const currentSocket = socket;

  if (currentSocket) {
    const tokenChanged = activeToken !== token;
    if (!tokenChanged && currentSocket.connected) return currentSocket;

    currentSocket.removeAllListeners();
    currentSocket.disconnect();
    socket = null;
    activeToken = null;
  }

  const SERVER = (() => {
    try {
      const url = new URL(config.apiBaseUrl);
      const pathname = url.pathname.replace(/\/+$/, '');
      return `${url.origin}${pathname}`;
    } catch {
      return (config.apiBaseUrl || 'http://localhost:3000').replace(/\/+$/, '');
    }
  })();
  activeToken = token;

  socket = io(`${SERVER}/geofencing`, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('geofencing socket connected', socket?.id);
  });

  socket.on('joined_project', (payload: any) => {
    if (!payload?.projectId) return;
    socket?.emit('get_live_workers', { projectId: payload.projectId });
  });

  socket.on('geofences', (payload: any) => {
    const geofences = Array.isArray(payload)
      ? payload.map((item) => ({
          id: item.id,
          name: item.zoneName ?? item.name,
          coords: Array.isArray(item.coords)
            ? item.coords
            : Array.isArray(item.polygonCoords)
              ? item.polygonCoords
              : [],
          isActive: item.isActive ?? true,
        }))
      : [];

    store.dispatch(setGeofences(geofences));
  });

  socket.on('live_workers', (payload: Record<string, any>) => {
    const workers = Array.isArray(payload?.workers) ? payload.workers : [];
    const normalizedWorkers: Record<string, any> = {};
    workers.forEach((worker: any) => {
      if (!worker?.workerId) return;
      normalizedWorkers[worker.workerId] = normalizeWorker(worker);
    });

    store.dispatch(setLiveWorkers(normalizedWorkers));
  });

  socket.on('active_workers', (payload: Record<string, any>) => {
    const workers = Array.isArray(payload?.workers) ? payload.workers : [];
    const normalizedWorkers: Record<string, any> = {};
    workers.forEach((worker: any) => {
      if (!worker?.workerId) return;
      normalizedWorkers[worker.workerId] = normalizeWorker(worker);
    });

    store.dispatch(setLiveWorkers(normalizedWorkers));
  });

  const handleWorkerLocation = (payload: any) => {
    if (!payload?.workerId) return;
    store.dispatch(updateWorkerLocation(normalizeWorker(payload)));
    if (payload && payload.workerId && payload.lat !== undefined && payload.lng !== undefined) {
      store.dispatch(addLog({ workerId: payload.workerId, location: { lat: payload.lat, lng: payload.lng }, timestamp: payload.timestamp || new Date().toISOString(), type: payload.type || 'tracking' }));
    }
  };

  socket.on('worker_location', handleWorkerLocation);
  socket.on('location_update', handleWorkerLocation);

  socket.on('worker_checked_in', (payload: any) => {
    const workerId = payload?.worker?.id ?? payload?.workerId ?? payload?.id;
    if (!workerId) return;
    const workerName = payload?.worker?.fullName || payload?.worker?.name || payload?.workerName || payload?.name || '';
    const lat = typeof payload.lat === 'number' ? payload.lat : typeof payload?.worker?.lat === 'number' ? payload.worker.lat : 0;
    const lng = typeof payload.lng === 'number' ? payload.lng : typeof payload?.worker?.lng === 'number' ? payload.worker.lng : 0;

    store.dispatch(updateWorkerLocation({
      workerId,
      name: workerName,
      lat,
      lng,
      timestamp: payload.checkInTime || new Date().toISOString(),
      status: payload.isInsideZone ? 'inside' : 'outside',
      isInsideZone: Boolean(payload.isInsideZone),
      zoneName: payload.zoneName ?? null,
    }));
  });

  socket.on('worker_checked_out', (payload: any) => {
    const workerId = payload?.worker?.id ?? payload?.workerId ?? payload?.id;
    if (!workerId) return;
    store.dispatch(removeWorker(workerId));
  });

  socket.on('worker_offline', (payload: any) => {
    if (!payload?.workerId) return;
    store.dispatch(removeWorker(payload.workerId));
  });

  socket.on('location_sharing_stopped', (payload: any) => {
    if (!payload?.workerId) return;
    store.dispatch(removeWorker(payload.workerId));
  });

  socket.on('location_log', (log: any) => {
    store.dispatch(addLog(log));
  });

  socket.on('zone_violation', (payload: any) => {
    const violation = payload?.violation;
    if (!violation?.worker?.id) return;

    store.dispatch(addLog({
      workerId: violation.worker.id,
      location: { lat: 0, lng: 0 },
      timestamp: violation.occurredAt || new Date().toISOString(),
      type: 'violation',
    }));
  });

  socket.on('disconnect', (reason) => {
    console.log('geofencing socket disconnected', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('geofencing socket connect_error', err);
  });

  return socket;
}

export function stopGeofencingSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  activeToken = null;
}

export function getSocket() {
  return socket;
}
