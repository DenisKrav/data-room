import { api } from './client';
import type { User } from '../types';

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export function registerRequest(data: { email: string; password: string; name?: string }) {
  return api.post<AuthResponse>('/auth/register', data).then((r) => r.data);
}

export function loginRequest(data: { email: string; password: string }) {
  return api.post<AuthResponse>('/auth/login', data).then((r) => r.data);
}

export function logoutRequest() {
  return api.post('/auth/logout');
}
