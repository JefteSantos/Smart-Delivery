import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Session } from '@supabase/supabase-js';
import { User } from '@/store/authStore';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converte uma Session do Supabase no objeto User do authStore.
 *
 * SEGURANÇA: O role é lido SOMENTE do user_metadata.role.
 * A verificação por email (email.includes('admin')) foi removida pois
 * permitia que qualquer usuário com "admin" no e-mail ganhasse acesso master.
 */
export function mapSessionToUser(session: Session): User {
  const meta = session.user.user_metadata ?? {};
  return {
    id: session.user.id,
    name: meta.name || session.user.email?.split('@')[0] || 'Cliente',
    email: session.user.email || '',
    role: meta.role === 'master' ? 'master' : 'client',
    address: meta.address || '',
    cep: meta.cep || '',
    avatar_url: meta.avatar_url || '',
  };
}

/**
 * Valida o formato de um e-mail de forma rigorosa para evitar envios nulos ou sem final (.com)
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
