import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { mapSessionToUser, isValidEmail } from '@/lib/utils';

export default function LoginScreen() {
    const loginStore = useAuthStore((state) => state.login);
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingReset, setLoadingReset] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleLogin = async () => {
        setErrorMessage('');

        if (!email || !password) {
            setErrorMessage("Preencha seu e-mail e senha!");
            return;
        }

        const trimmedEmail = email.trim().toLowerCase();
        if (!isValidEmail(trimmedEmail)) {
            setErrorMessage("O formato do e-mail é inválido (exemplo@email.com).");
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: trimmedEmail,
                password,
            });

            if (error) {
                let translatedError = error.message;
                if (error.message.includes('Invalid login credentials')) {
                    translatedError = "E-mail ou senha incorretos!";
                } else if (error.message.includes('Email not confirmed')) {
                    translatedError = "Por favor, confirme seu e-mail antes de fazer login.";
                }
                setErrorMessage(translatedError);
            } else if (data.session) {
                // SEGURANÇA: role lido somente de user_metadata via mapSessionToUser.
                // Removida brecha onde email.includes('admin') concedia acesso master.
                const userObj = mapSessionToUser(data.session);
                loginStore(userObj);

                if (userObj.role === 'master') {
                    router.replace('/(master)/home');
                } else {
                    router.replace('/(client)/home');
                }
            }
        } catch (err: any) {
            setErrorMessage(err.message || "Erro desconhecido ao logar.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setErrorMessage("Digite um e-mail válido no campo acima para recuperar a senha.");
            return;
        }

        setLoadingReset(true);
        setErrorMessage('');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
            if (error) {
                setErrorMessage("Não foi possível enviar o e-mail de recuperação. Verifique o endereço.");
            } else {
                Alert.alert(
                    "E-mail Enviado!",
                    `Enviamos um link de redefinição de senha para ${trimmedEmail}. Verifique sua caixa de entrada (e spam).`
                );
            }
        } catch {
            setErrorMessage("Erro ao enviar e-mail de recuperação.");
        } finally {
            setLoadingReset(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white dark:bg-gray-800"
        >
            <View className="flex-1 justify-center px-8">
                <View className="items-center mb-10">
                    <View className="h-24 w-24 bg-red-500 rounded-3xl items-center justify-center mb-6 shadow-xl shadow-red-500/30">
                        <Text className="text-white text-4xl font-extrabold">🍴</Text>
                    </View>
                    <Text className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Bem-vindo(a)!</Text>
                    <Text className="text-gray-500 dark:text-gray-400 text-center text-base">
                        Faça login para acessar o cardápio e fazer os seus pedidos com facilidade.
                    </Text>
                </View>

                <View className="space-y-4 mb-4">
                    <View>
                        <Text className="text-gray-700 dark:text-white font-bold mb-2 ml-1">E-mail</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-4 focus:border-red-500 focus:bg-white dark:focus:bg-gray-800 transition-colors"
                            placeholder="Digite seu e-mail"
                            placeholderTextColor="#9ca3af"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>

                    <View className="mt-4">
                        <Text className="text-gray-700 dark:text-white font-bold mb-2 ml-1">Senha</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-4 focus:border-red-500 focus:bg-white dark:focus:bg-gray-800 transition-colors"
                            placeholder="Sua senha secreta"
                            placeholderTextColor="#9ca3af"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>

                    {/* CORREÇÃO: "Esqueceu a senha?" agora funciona */}
                    <TouchableOpacity
                        className="items-end mt-2"
                        onPress={handleForgotPassword}
                        disabled={loadingReset}
                    >
                        {loadingReset ? (
                            <ActivityIndicator color="#EF4444" size="small" />
                        ) : (
                            <Text className="text-red-500 font-bold">Esqueceu a senha?</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View className="h-10 justify-center">
                    {errorMessage ? (
                        <Text className="text-red-500 font-bold text-center text-sm">{errorMessage}</Text>
                    ) : null}
                </View>

                <TouchableOpacity
                    className="bg-red-500 py-4 rounded-xl items-center shadow-md shadow-red-500/30 flex-row justify-center mt-2"
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Entrar</Text>
                    )}
                </TouchableOpacity>

                <View className="flex-row justify-center mt-8">
                    <Text className="text-gray-500 dark:text-gray-400 text-base">Novo por aqui? </Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                        <Text className="text-red-500 font-bold text-base">Cadastre-se</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
