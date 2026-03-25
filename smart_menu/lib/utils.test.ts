import { mapSessionToUser, isValidEmail } from './utils';
import { Session } from '@supabase/supabase-js';

describe('Utilitários (lib/utils.ts)', () => {
    
    describe('mapSessionToUser', () => {
        
        it('deve extrair o "role" de cliente corretamente quando não for master', () => {
            const mockSession = {
                user: {
                    id: '123-uuid',
                    email: 'cliente@teste.com',
                    user_metadata: {
                        name: 'João Cliente',
                        role: 'client'
                    }
                }
            } as unknown as Session;

            const resultado = mapSessionToUser(mockSession);

            expect(resultado.id).toBe('123-uuid');
            expect(resultado.role).toBe('client');
            expect(resultado.name).toBe('João Cliente');
        });

        it('deve extrair o "role" master APENAS se o metadata tiver master verdadeiro', () => {
            const mockSession = {
                user: {
                    id: '999-uuid',
                    email: 'admin_falso@teste.com', 
                    // Apesar de ter admin no email, a segurança (user_metadata) manda
                    user_metadata: {
                        role: 'client'
                    }
                }
            } as unknown as Session;

            const resultado = mapSessionToUser(mockSession);

            expect(resultado.role).toBe('client'); // Bloqueou o falso admin
        });

        it('deve formatar o nome baseado no e-mail caso o nome não exista', () => {
            const mockSession = {
                user: {
                    id: 'abc-uuid',
                    email: 'pedro.silva@smart.com',
                    user_metadata: {}
                }
            } as unknown as Session;

            const resultado = mapSessionToUser(mockSession);

            expect(resultado.name).toBe('pedro.silva');
        });
    });

    describe('isValidEmail', () => {
        it('deve aprovar e-mails em formato padrão (ex: nome@dominio.com)', () => {
            expect(isValidEmail('joao.santos@smart.com')).toBe(true);
            expect(isValidEmail('cliente123@gmail.com.br')).toBe(true);
            expect(isValidEmail('teste_valido-1@empresa.net')).toBe(true);
        });

        it('deve BLOQUEAR e-mails bizarros ou sem domínio raiz (.com)', () => {
            // O caso que parou nosso app antes! O email sem .alguma_coisa
            expect(isValidEmail('joao.santos@smart')).toBe(false); 
            
            // E-mails com formatos bizarros ou com defeitos de teclado
            expect(isValidEmail('joao.santos.smart.com')).toBe(false); // Sem o @
            expect(isValidEmail(' joa@smart.com')).toBe(false);        // Espaço no começo
            expect(isValidEmail('joao@ smart.com')).toBe(false);       // Espaço no meio
            expect(isValidEmail('joao@smart.com ')).toBe(false);       // Espaço no fim (Aquele antigo bug!)
            expect(isValidEmail('admin@.com')).toBe(false);            // Sem provedor
            expect(isValidEmail('@smart.com')).toBe(false);            // Sem nome de usuário
        });
    });
});
