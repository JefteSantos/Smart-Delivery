import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useState } from 'react';

export default function LoginScreen() {
    const login = useAuthStore((state) => state.login);
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = () => {
        // Para simplificar agora, faremos um mock de login.
        // Em breve, isso irá chamar a API do Supabase!
        if (email && password) {
            login({
                id: '123',
                name: 'Cliente Vip',
                email,
                role: 'client',
            });
            router.replace('/(client)/home'); // Vai para a área do cliente
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white"
        >
            <View className="flex-1 justify-center px-8">
                <View className="items-center mb-10">
                    <View className="h-24 w-24 bg-red-500 rounded-3xl items-center justify-center mb-6 shadow-xl shadow-red-500/30">
                        <Text className="text-white text-4xl font-extrabold">🍴</Text>
                    </View>
                    <Text className="text-3xl font-extrabold text-gray-900 mb-2">Bem-vindo(a)!</Text>
                    <Text className="text-gray-500 text-center text-base">
                        Faça login para acessar o cardápio e fazer os seus pedidos com facilidade.
                    </Text>
                </View>

                <View className="space-y-4 mb-8">
                    <View>
                        <Text className="text-gray-700 font-bold mb-2 ml-1">E-mail</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-4 focus:border-red-500 focus:bg-white transition-colors"
                            placeholder="Digite seu e-mail"
                            placeholderTextColor="#9ca3af"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>

                    <View className="mt-4">
                        <Text className="text-gray-700 font-bold mb-2 ml-1">Senha</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-4 focus:border-red-500 focus:bg-white transition-colors"
                            placeholder="Sua senha secreta"
                            placeholderTextColor="#9ca3af"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>

                    <TouchableOpacity className="items-end mt-2">
                        <Text className="text-red-500 font-bold">Esqueceu a senha?</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    className="bg-red-500 py-4 rounded-xl items-center shadow-md shadow-red-500/30"
                    onPress={handleLogin}
                >
                    <Text className="text-white font-bold text-lg">Entrar</Text>
                </TouchableOpacity>

                <View className="flex-row justify-center mt-8">
                    <Text className="text-gray-500 text-base">Novo por aqui? </Text>
                    <TouchableOpacity>
                        <Text className="text-red-500 font-bold text-base">Cadastre-se</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
