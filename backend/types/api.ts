export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

export interface LoginResponse {
    token: string;
    team: {
        id: string;
        name: string;
        credits: number;
    };
}