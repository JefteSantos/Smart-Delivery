import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from './login';

// Mock do expo-router
jest.mock('expo-router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
    }),
}));

// Mock do Supabase
jest.mock('../../lib/supabase', () => ({
    supabase: {
        auth: {
            signInWithPassword: jest.fn(),
            resetPasswordForEmail: jest.fn(),
        },
    },
}));

describe('Tela de Login (LoginScreen)', () => {
    it('deve exibir erro se tentar logar com campos vazios', () => {
        const { getByText, queryByText } = render(<LoginScreen />);
        
        const loginButton = getByText('Entrar');
        fireEvent.press(loginButton);

        expect(getByText('Preencha seu e-mail e senha!')).toBeTruthy();
    });

    it('deve exibir erro para formato de e-mail inválido', () => {
        const { getByPlaceholderText, getByText } = render(<LoginScreen />);
        
        const emailInput = getByPlaceholderText('Digite seu e-mail');
        const passwordInput = getByPlaceholderText('Sua senha secreta');
        const loginButton = getByText('Entrar');

        fireEvent.changeText(emailInput, 'emailinvalido');
        fireEvent.changeText(passwordInput, '123456');
        fireEvent.press(loginButton);

        expect(getByText('O formato do e-mail é inválido (exemplo@email.com).')).toBeTruthy();
    });
});
