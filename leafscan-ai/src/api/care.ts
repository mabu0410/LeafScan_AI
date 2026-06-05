import { HomeCareLog, HomeTask } from '../types/home';
import { requestJson } from './client';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

function mapTask(raw: any): HomeTask {
  return {
    id: Number(raw?.id ?? 0),
    title: raw?.title || 'Việc chăm sóc',
    taskType: raw?.task_type || 'general',
    dueAt: raw?.due_at || null,
    status: raw?.status || 'pending',
    plantId: raw?.plant_id == null ? null : Number(raw.plant_id),
    plantName: raw?.plant_name || null,
  };
}

function mapCareLog(raw: any): HomeCareLog {
  return {
    id: Number(raw?.id ?? 0),
    title: raw?.title || 'Nhật ký chăm sóc',
    description: raw?.description || null,
    logType: raw?.log_type || 'general',
    performedAt: raw?.performed_at || new Date().toISOString(),
    plantId: raw?.plant_id == null ? null : Number(raw.plant_id),
    plantName: raw?.plant_name || null,
  };
}

export interface CareTaskPayload {
  title: string;
  taskType: string;
  dueAt?: string | null;
  status?: string;
  plantId?: number | null;
}

export interface CareLogPayload {
  title: string;
  description?: string | null;
  logType: string;
  performedAt?: string | null;
  plantId?: number | null;
}

function taskPayload(payload: CareTaskPayload) {
  return {
    title: payload.title,
    task_type: payload.taskType,
    due_at: payload.dueAt || null,
    status: payload.status || 'pending',
    plant_id: payload.plantId || null,
  };
}

function logPayload(payload: CareLogPayload) {
  return {
    title: payload.title,
    description: payload.description || null,
    log_type: payload.logType,
    performed_at: payload.performedAt || null,
    plant_id: payload.plantId || null,
  };
}

export async function listCareTasksApi(token: string): Promise<HomeTask[]> {
  const response = await requestJson<Envelope<any[]>>('/home/tasks', { token });
  return (response.data || []).map(mapTask);
}

export async function createCareTaskApi(token: string, payload: CareTaskPayload): Promise<HomeTask> {
  const response = await requestJson<Envelope<any>>('/home/tasks', {
    method: 'POST',
    token,
    body: taskPayload(payload),
  });
  return mapTask(response.data);
}

export async function updateCareTaskApi(token: string, taskId: number, payload: Partial<CareTaskPayload>): Promise<HomeTask> {
  const body: Record<string, unknown> = {};
  if (payload.title !== undefined) body.title = payload.title;
  if (payload.taskType !== undefined) body.task_type = payload.taskType;
  if (payload.dueAt !== undefined) body.due_at = payload.dueAt || null;
  if (payload.status !== undefined) body.status = payload.status;
  if (payload.plantId !== undefined) body.plant_id = payload.plantId || null;
  const response = await requestJson<Envelope<any>>(`/home/tasks/${taskId}`, {
    method: 'PATCH',
    token,
    body,
  });
  return mapTask(response.data);
}

export async function deleteCareTaskApi(token: string, taskId: number): Promise<void> {
  await requestJson<Envelope<null>>(`/home/tasks/${taskId}`, { method: 'DELETE', token });
}

export async function listCareLogsApi(token: string): Promise<HomeCareLog[]> {
  const response = await requestJson<Envelope<any[]>>('/home/care-logs', { token });
  return (response.data || []).map(mapCareLog);
}

export async function createCareLogApi(token: string, payload: CareLogPayload): Promise<HomeCareLog> {
  const response = await requestJson<Envelope<any>>('/home/care-logs', {
    method: 'POST',
    token,
    body: logPayload(payload),
  });
  return mapCareLog(response.data);
}

export async function updateCareLogApi(token: string, logId: number, payload: Partial<CareLogPayload>): Promise<HomeCareLog> {
  const body: Record<string, unknown> = {};
  if (payload.title !== undefined) body.title = payload.title;
  if (payload.description !== undefined) body.description = payload.description || null;
  if (payload.logType !== undefined) body.log_type = payload.logType;
  if (payload.performedAt !== undefined) body.performed_at = payload.performedAt || null;
  if (payload.plantId !== undefined) body.plant_id = payload.plantId || null;
  const response = await requestJson<Envelope<any>>(`/home/care-logs/${logId}`, {
    method: 'PATCH',
    token,
    body,
  });
  return mapCareLog(response.data);
}

export async function deleteCareLogApi(token: string, logId: number): Promise<void> {
  await requestJson<Envelope<null>>(`/home/care-logs/${logId}`, { method: 'DELETE', token });
}
