import { useAuthStore, User } from './authStore';

const mockUser: User = {
    id: 'u1',
    name: 'Test Master',
    email: 'master@test.com',
    role: 'master'
};

describe('Auth Store (authStore.ts)', () => {
    
    beforeEach(() => {
        useAuthStore.getState().logout();
    });

    it('deve inicializar com o usuário nulo', () => {
        expect(useAuthStore.getState().user).toBeNull();
    });

    it('deve atualizar o estado do usuário após login', () => {
        useAuthStore.getState().login(mockUser);
        
        const state = useAuthStore.getState();
        expect(state.user).toEqual(mockUser);
        expect(state.user?.name).toBe('Test Master');
    });

    it('deve limpar o usuário ao fazer logout', () => {
        useAuthStore.getState().login(mockUser);
        expect(useAuthStore.getState().user).not.toBeNull();
        
        useAuthStore.getState().logout();
        expect(useAuthStore.getState().user).toBeNull();
    });
});
