import { View, Text, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { Bell, Moon, Smartphone, ShieldCheck } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useColorScheme } from 'nativewind';

export default function ClientSettingsScreen() {
    const router = useRouter();

    const [pushNotifications, setPushNotifications] = useState(true);
    const [promoEmails, setPromoEmails] = useState(false);
    const { colorScheme, toggleColorScheme } = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    useEffect(() => {
        const fetchPreferences = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata) {
                if (user.user_metadata.push_notifications !== undefined) {
                    setPushNotifications(user.user_metadata.push_notifications);
                }
                if (user.user_metadata.promo_emails !== undefined) {
                    setPromoEmails(user.user_metadata.promo_emails);
                }
            }
        };
        fetchPreferences();
    }, []);

    const togglePush = async (value: boolean) => {
        setPushNotifications(value);
        await supabase.auth.updateUser({ data: { push_notifications: value } });
    };

    const togglePromo = async (value: boolean) => {
        setPromoEmails(value);
        await supabase.auth.updateUser({ data: { promo_emails: value } });
    };

    return (
        <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900 pt-16 px-5" showsVerticalScrollIndicator={false}>
            <View className="mb-8 flex-row items-center border-b border-gray-200 dark:border-gray-700 pb-4">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Text className="text-red-500 font-bold text-lg">{'< Voltar'}</Text>
                </TouchableOpacity>
                <View>
                    <Text className="text-2xl font-extrabold text-gray-900 dark:text-white">Preferências</Text>
                    <Text className="text-gray-500 dark:text-gray-400 text-sm">Ajustes do aplicativo</Text>
                </View>
            </View>

            {/* NOTIFICAÇÕES */}
            <View className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 mb-6">
                <View className="flex-row items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                    <Bell size={20} color="#EF4444" />
                    <Text className="font-bold text-gray-800 dark:text-white ml-2 text-lg">Notificações</Text>
                </View>

                <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-1 mr-4">
                        <Text className="font-bold text-gray-800 dark:text-white text-base">Status do Pedido (Push)</Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-xs">Receba alertas no celular quando seu pedido sair para entrega.</Text>
                    </View>
                    <Switch
                        value={pushNotifications}
                        onValueChange={togglePush}
                        trackColor={{ false: "#d1d5db", true: "#EF4444" }}
                    />
                </View>

                <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-gray-900">
                    <View className="flex-1 mr-4">
                        <Text className="font-bold text-gray-800 dark:text-white text-base">Ofertas por E-mail</Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-xs">Cupons e promoções do dia.</Text>
                    </View>
                    <Switch
                        value={promoEmails}
                        onValueChange={togglePromo}
                        trackColor={{ false: "#d1d5db", true: "#10B981" }}
                    />
                </View>
            </View>

            {/* APLICATIVO */}
            <View className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 mb-8">
                <View className="flex-row items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                    <Smartphone size={20} color="#6B7280" />
                    <Text className="font-bold text-gray-800 dark:text-white ml-2 text-lg">Aplicativo</Text>
                </View>

                <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                        <Moon size={18} color={isDarkMode ? "#FCD34D" : "#4B5563"} />
                        <View className="ml-2">
                            <Text className="font-bold text-gray-800 dark:text-white text-base">Modo Escuro</Text>
                        </View>
                    </View>
                    <Switch
                        value={isDarkMode}
                        onValueChange={toggleColorScheme}
                        trackColor={{ false: "#d1d5db", true: "#8B5CF6" }}
                    />
                </View>

                <TouchableOpacity
                    className="flex-row items-center justify-between mt-4 border-t border-gray-50 dark:border-gray-900 pt-4"
                    onPress={() => router.push('/(client)/privacy' as any)}
                >
                    <View className="flex-row items-center">
                        <ShieldCheck size={18} color="#4B5563" />
                        <View className="ml-2">
                            <Text className="font-bold text-gray-800 dark:text-white text-sm">Política de Privacidade</Text>
                        </View>
                    </View>
                    <Text className="text-gray-400 dark:text-gray-400 text-xs">Ler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-row items-center justify-between mt-4 border-t border-gray-50 dark:border-gray-900 pt-4"
                    onPress={() => router.push('/(client)/terms' as any)}
                >
                    <View className="flex-row items-center">
                        <ShieldCheck size={18} color="#4B5563" />
                        <View className="ml-2">
                            <Text className="font-bold text-gray-800 dark:text-white text-sm">Termos de Uso</Text>
                        </View>
                    </View>
                    <Text className="text-gray-400 dark:text-gray-400 text-xs">Ler</Text>
                </TouchableOpacity>

            </View>

            <View className="items-center pb-10">
                <Text className="text-gray-400 dark:text-gray-400 text-xs">Smart Delivery v1.0.0</Text>
            </View>
        </ScrollView>
    );
}
