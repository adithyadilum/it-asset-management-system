export interface AuthUser {
    id: number;
    email: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginSuccessResponse {
    success: true;
    message: string;
    user: AuthUser;
}

export interface AuthErrorResponse {
    error: string;
}

export type LoginResponse = LoginSuccessResponse | AuthErrorResponse;
