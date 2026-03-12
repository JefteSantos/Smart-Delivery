import { create } from 'zustand';

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'client' | 'master';
    address?: string;
    cep?: string;
    avatar_url?: string;
}

interface AuthState {
    user: User | null;
    isHydrated: boolean;
    login: (user: User) => void;
    logout: () => void;
    setHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isHydrated: true,
    login: (user) => set({ user }),
    logout: () => set({ user: null }),
    setHydrated: () => set({ isHydrated: true }),
}));
