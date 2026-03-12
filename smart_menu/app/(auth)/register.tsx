import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAddressFromCep } from '../../lib/useAddressFromCep';

export default function RegisterScreen() {
    const router = useRouter();
    const { loadingCep, fetchAddressFromCep, formatCep } = useAddressFromCep();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [cep, setCep] = useState('');
    const [address, setAddress] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const handleCepChange = async (text: string) => {
        const formatted = formatCep(text);
        setCep(formatted);
        const raw = text.replace(/\D/g, '');
        await fetchAddressFromCep(raw, setAddress);
    };

    const handleRegister = async () => {
        setErrorMessage('');

        if (!name || !email || !address || !password || !confirmPassword) {
            setErrorMessage("Preencha todos os campos!");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage("As senhas não coincidem!");
            return;
        }

        if (!acceptedTerms) {
            setErrorMessage("Você precisa aceitar os Termos e a Política de Privacidade para criar uma conta.");
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name,
                        address: address,
                        cep: cep.replace(/\D/g, ''),
                        push_notifications: true,
                        promo_emails: false
                    }
                }
            });

            if (error) {
                let translatedError = error.message;
                if (error.message.includes('already registered') || error.message.includes('already exists')) {
                    translatedError = "Este e-mail já está cadastrado. Faça o login na tela inicial!";
                } else if (error.message.includes('Password should be')) {
                    translatedError = "A senha é muito fraca. Digite pelo menos 6 caracteres.";
                } else if (error.message.includes('invalid format')) {
                    translatedError = "O formato desse e-mail é inválido.";
                }
                setErrorMessage(translatedError);
            } else {
                Alert.alert("Sucesso!", "Sua conta foi criada. Você já pode fazer login.", [
                    { text: "OK", onPress: () => router.back() }
                ]);
            }
        } catch (err: any) {
            setErrorMessage(err.message || "Ocorreu um erro desconhecido.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white dark:bg-gray-800"
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 40 }}
                className="flex-1 px-8"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View className="mb-8">
                    <Text className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Criar Conta</Text>
                    <Text className="text-gray-500 dark:text-gray-400 text-base">
                        Preencha os dados abaixo para criar sua conta gratuita e fazer seus pedidos!
                    </Text>
                </View>

                <View className="space-y-4 mb-4">
                    <View>
                        <Text className="text-gray-700 dark:text-white font-bold mb-2 ml-1">Como devemos te chamar?</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-4 focus:border-red-500 focus:bg-white transition-colors"
                            placeholder="Seu nome"
                            placeholderTextColor="#9ca3af"
                            autoCapitalize="words"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View className="mt-4">
                        <Text className="text-gray-700 dark:text-white font-bold mb-2 ml-1">E-mail</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-4 focus:border-red-500 focus:bg-white transition-colors"
                            placeholder="Digite seu e-mail"
                            placeholderTextColor="#9ca3af"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>

                    <View className="mt-4">
                        <Text className="text-gray-700 dark:text-white font-bold mb-2 ml-1 flex-row items-center">
                            CEP {loadingCep && <ActivityIndicator size="small" color="#EF4444" className="ml-2" />}
                        </Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-4 focus:border-red-500 focus:bg-white transition-colors"
                            placeholder="00000-000"
                            placeholderTextColor="#9ca3af"
                            keyboardType="numeric"
                            maxLength={9}
                            value={cep}
                            onChangeText={handleCepChange}
                        />
                    </View>

                    <View className="mt-4">
                        <Text className="text-gray-700 dark:text-white font-bold mb-2 ml-1">Endereço de Entrega (Rua, Número, Bairro)</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-4 focus:border-red-500 focus:bg-white transition-colors"
                            placeholder="Ex: Rua das Flores, 123"
                            placeholderTextColor="#9ca3af"
                            value={address}
                            onChangeText={setAddress}
                        />
                    </View>

                    <View className="mt-4">
                        <Text className="text-gray-700 dark:text-white font-bold mb-2 ml-1">Senha</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-4 focus:border-red-500 focus:bg-white transition-colors"
                            placeholder="Sua senha secreta (min. 6 dígitos)"
                            placeholderTextColor="#9ca3af"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>

                    <View className="mt-4">
                        <Text className="text-gray-700 dark:text-white font-bold mb-2 ml-1">Confirmar Senha</Text>
                        <TextInput
                            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-4 focus:border-red-500 focus:bg-white transition-colors"
                            placeholder="Repita sua senha"
                            placeholderTextColor="#9ca3af"
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                    </View>
                </View>

                <View className="h-10 justify-center">
                    {errorMessage ? (
                        <Text className="text-red-500 font-bold text-center text-sm">{errorMessage}</Text>
                    ) : null}
                </View>

                <View className="flex-row items-center justify-center mb-4 mt-2 px-2 flex-wrap">
                    <TouchableOpacity
                        className="flex-row items-center"
                        onPress={() => setAcceptedTerms(!acceptedTerms)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <View className="mr-2">
                            {acceptedTerms ? (
                                <View className="w-5 h-5 bg-red-500 rounded-md border-2 border-red-500 items-center justify-center">
                                    <View className="w-2.5 h-2.5 bg-white dark:bg-gray-800 rounded-sm" />
                                </View>
                            ) : (
                                <View className="w-5 h-5 bg-transparent rounded-md border-2 border-gray-300 dark:border-gray-600" />
                            )}
                        </View>
                        <Text className="text-gray-500 dark:text-gray-400 text-xs text-center flex-row">
                            Eu li e concordo com os{' '}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/(auth)/terms')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text className="text-red-500 font-bold text-xs underline">Termos</Text>
                    </TouchableOpacity>
                    <Text className="text-gray-500 dark:text-gray-400 text-xs text-center flex-row">
                        {' '}e a{' '}
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/privacy')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Text className="text-red-500 font-bold text-xs underline">Política de Privacidade</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    className="bg-red-500 py-4 rounded-xl items-center shadow-md shadow-red-500/30 flex-row justify-center mt-2"
                    onPress={handleRegister}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Cadastrar</Text>
                    )}
                </TouchableOpacity>

                <View className="flex-row justify-center mt-8">
                    <Text className="text-gray-500 dark:text-gray-400 text-base">Já tem uma conta? </Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text className="text-red-500 font-bold text-base">Faça Login</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
