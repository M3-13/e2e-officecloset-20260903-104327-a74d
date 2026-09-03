import { api } from "./client";

export interface UserOut {
  id: number;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  user: UserOut;
}

export function register(
  email: string,
  password: string
): Promise<AuthResponse> {
  return api.post<AuthResponse>("/api/auth/register", { email, password });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>("/api/auth/login", { email, password });
}

export function logout(): Promise<void> {
  return api.post<void>("/api/auth/logout");
}

export function getMe(): Promise<UserOut> {
  return api.get<UserOut>("/api/auth/me");
}

export function deleteAccount(): Promise<void> {
  return api.del<void>("/api/auth/me");
}
