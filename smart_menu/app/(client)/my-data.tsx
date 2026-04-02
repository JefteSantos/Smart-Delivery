import { View, Text, TouchableOpacity, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { ArrowLeft, User, Mail, Check, MapPin, Phone } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAddressFromCep } from '../../lib/useAddressFromCep';

export default function MyDataScreen() {
    const { user, login } = useAuthStore();
    const router = useRouter();
    const { loadingCep, fetchAddressFromCep, formatCep } = useAddressFromCep();

    const [name, setName] = useState(user?.name || '');
    const [cep, setCep] = useState(user?.cep || '');
    const [address, setAddress] = useState(user?.address || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [saving, setSaving] = useState(false);

    const handleCepChange = async (text: string) => {
        const formatted = formatCep(text);
        setCep(formatted);
        const raw = text.replace(/\D/g, '');
        await fetchAddressFromCep(raw, setAddress);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert("Aviso", "O nome não pode ficar vazio.");
            return;
        }

        if (!address.trim()) {
            Alert.alert("Aviso", "O endereço não pode ficar vazio.");
            return;
        }

        if (name === user?.name && address === user?.address && cep === user?.cep && phone === user?.phone) {
            Alert.alert("Aviso", "Nenhuma alteração feita.");
            return;
        }

        setSaving(true);

        // Atualiza os metadados no Supabase
        const { data, error } = await supabase.auth.updateUser({
            data: { name: name, address: address, cep: cep.replace(/\D/g, ''), phone: phone.replace(/\D/g, '') }
        });

        setSaving(false);

        if (error) {
            Alert.alert("Erro", "Não foi possível atualizar seus dados. Tente novamente.");
            setName(user?.name || '');
        } else if (data.user) {
            if (user) {
                login({
                    ...user,
                    name: name,
                    address: address,
                    cep: cep.replace(/\D/g, ''),
                    phone: phone.replace(/\D/g, '')
                });
                Alert.alert("Sucesso", "Seus dados foram atualizados com sucesso!", [
                    { text: "OK", onPress: () => router.back() }
                ]);
            }
        }
    };

    if (!user) return null;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-gray-50 dark:bg-gray-900 pt-12"
        >
            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                {/* Header com botão de voltar */}
                <View className="flex-row items-center justify-between px-5 mb-6">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm"
                    >
                        <ArrowLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-800 dark:text-white">Meus Dados</Text>
                    <View className="w-10" /> {/* Espaçador invisível para centralizar o título */}
                </View>

                <View className="px-5">
                    <View className="space-y-4 mb-8">
                        {/* Campo de Nome (Editável) */}
                        <View>
                            <Text className="text-gray-700 dark:text-white font-bold mb-2 ml-1 flex-row items-center">
                                <User size={16} color="#6B7280" /> Nome de Exibição
                            </Text>
                            <TextInput
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-4 focus:border-red-500 transition-colors"
                                placeholder="Seu nome"
                                placeholderTextColor="#9ca3af"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        {/* Campo de CEP (Editável com Busca Automática) */}
                        <View className="mt-5">
                            <Text className="text-gray-700 dark:text-white font-bold mb-2 ml-1 flex-row items-center">
                                <MapPin size={16} color="#6B7280" /> CEP de Entrega {loadingCep && <ActivityIndicator size="small" color="#EF4444" className="ml-2" />}
                            </Text>
                            <TextInput
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-4 focus:border-red-500 transition-colors"
                                placeholder="00000-000"
                                placeholderTextColor="#9ca3af"
                                keyboardType="numeric"
                                maxLength={9}
                                value={cep}
                                onChangeText={handleCepChange}
                            />
                        </View>

                        {/* Campo de Telefone (Editável) */}
                        <View className="mt-5">
                            <Text className="text-gray-700 dark:text-white font-bold mb-2 ml-1 flex-row items-center">
                                <Phone size={16} color="#6B7280" /> Telefone (Celular)
                            </Text>
                            <TextInput
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-4 focus:border-red-500 transition-colors"
                                placeholder="(11) 99999-9999"
                                placeholderTextColor="#9ca3af"
                                keyboardType="phone-pad"
                                value={phone}
                                onChangeText={setPhone}
                            />
                        </View>

                        {/* Campo de Endereço (Editável) */}
                        <View className="mt-5">
                            <Text className="text-gray-700 dark:text-white font-bold mb-2 ml-1 flex-row items-center">
                                <MapPin size={16} color="#6B7280" /> Endereço Padrão de Entrega (Rua, Número, Bairro)
                            </Text>
                            <TextInput
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-4 focus:border-red-500 transition-colors"
                                placeholder="Ex: Rua das Flores, 120"
                                placeholderTextColor="#9ca3af"
                                value={address}
                                onChangeText={setAddress}
                            />
                        </View>

                        {/* Campo de Email (Protegido/Não editável de forma simples aqui) */}
                        <View className="mt-5">
                            <Text className="text-gray-700 dark:text-white font-bold mb-2 ml-1 flex-row items-center">
                                <Mail size={16} color="#6B7280" /> E-mail
                            </Text>
                            <TextInput
                                className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-xl px-4 py-4"
                                value={user.email}
                                editable={false}
                            />
                            <Text className="text-xs text-gray-400 dark:text-gray-400 mt-1 ml-1 text-center">Para alterar o e-mail, entre em contato com o suporte.</Text>
                        </View>
                    </View>

                    {/* Botão de Salvar */}
                    <TouchableOpacity
                        className={`py-4 rounded-xl items-center shadow-md flex-row justify-center mb-10 ${saving || (name === user.name && address === user.address && cep === user.cep && phone === user.phone) ? 'bg-gray-400 shadow-gray-400/30' : 'bg-red-500 shadow-red-500/30'}`}
                        onPress={handleSave}
                        disabled={saving || (name === user.name && address === user.address && cep === user.cep && phone === user.phone)}
                    >
                        {saving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Check size={20} color="white" />
                                <Text className="text-white font-bold text-lg ml-2">Salvar Alterações</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
