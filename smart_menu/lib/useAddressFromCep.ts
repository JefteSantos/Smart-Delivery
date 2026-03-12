import { useState } from 'react';
import { Alert } from 'react-native';

/**
 * Hook reutilizável para buscar endereço a partir de um CEP via ViaCEP.
 * Elimina a duplicação de código que existia em register.tsx, cart.tsx,
 * my-data.tsx e settings.tsx (master).
 */
export function useAddressFromCep() {
    const [loadingCep, setLoadingCep] = useState(false);

    /**
     * Formata um CEP bruto no formato "00000-000".
     */
    const formatCep = (text: string): string => {
        const raw = text.replace(/\D/g, '');
        return raw.length > 5 ? raw.replace(/^(\d{5})(\d)/, '$1-$2') : raw;
    };

    /**
     * Busca o endereço no ViaCEP e chama o callback com o resultado.
     * @param rawCep CEP somente números (8 dígitos)
     * @param onAddress Callback chamado com o endereço formatado
     */
    const fetchAddressFromCep = async (
        rawCep: string,
        onAddress: (address: string) => void
    ): Promise<void> => {
        if (rawCep.length !== 8) return;

        setLoadingCep(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
            const data = await response.json();

            if (!data.erro) {
                // Formato limpo: "Rua das Flores - Centro, São Paulo - SP"
                // (o número deve ser adicionado manualmente pelo usuário)
                onAddress(`${data.logradouro} - ${data.bairro}, ${data.localidade} - ${data.uf}`);
            } else {
                Alert.alert('Erro', 'CEP não encontrado.');
            }
        } catch {
            Alert.alert('Erro', 'Falha ao buscar o CEP. Verifique sua conexão.');
        } finally {
            setLoadingCep(false);
        }
    };

    return { loadingCep, fetchAddressFromCep, formatCep };
}
