export interface User {
  id: number;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  fullName: string;
  fullNameThai: string | null;
  department?: string | null;
  position?: string | null;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}
