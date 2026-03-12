import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { LogOut, LayoutDashboard, Utensils, Settings } from 'lucide-react-native';

export default function MasterHomeScreen() {
    const { user, logout } = useAuthStore();
    const router = useRouter();

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            Alert.alert("Erro", error.message);
        } else {
            logout();
            router.replace('/(auth)/login');
        }
    };

    return (
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 pt-16 px-5">
            <View className="flex-row items-center justify-between mb-8">
                <View>
                    <Text className="text-2xl font-extrabold text-gray-900 dark:text-white">Painel Geral</Text>
                    <Text className="text-gray-500 dark:text-gray-400">Logado como: {user?.name}</Text>
                </View>

                <TouchableOpacity
                    onPress={handleLogout}
                    className="p-2 bg-red-50 rounded-full"
                >
                    <LogOut size={24} color="#EF4444" />
                </TouchableOpacity>
            </View>

            {/* Cards de Ação */}
            <View className="flex-row flex-wrap justify-between">
                <TouchableOpacity
                    onPress={() => router.push('/(master)/menu')}
                    className="bg-white dark:bg-gray-800 w-[48%] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 mb-4 items-center justify-center py-8"
                >
                    <View className="bg-violet-100 p-3 rounded-full mb-3">
                        <Utensils size={32} color="#8B5CF6" />
                    </View>
                    <Text className="font-bold text-gray-800 dark:text-white text-base">Meu Cardápio</Text>
                    <Text className="text-gray-400 dark:text-gray-400 text-xs mt-1 text-center">Adicionar Lanches</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/(master)/orders')}
                    className="bg-white dark:bg-gray-800 w-[48%] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 mb-4 items-center justify-center py-8"
                >
                    <View className="bg-emerald-100 p-3 rounded-full mb-3">
                        <LayoutDashboard size={32} color="#10B981" />
                    </View>
                    <Text className="font-bold text-gray-800 dark:text-white text-base">Pedidos</Text>
                    <Text className="text-gray-400 dark:text-gray-400 text-xs mt-1 text-center">Ver e Aceitar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/(master)/settings')}
                    className="bg-white dark:bg-gray-800 w-[48%] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 mb-4 items-center justify-center py-8"
                >
                    <View className="bg-orange-100 p-3 rounded-full mb-3">
                        <Settings size={32} color="#F97316" />
                    </View>
                    <Text className="font-bold text-gray-800 dark:text-white text-base">Configurações</Text>
                    <Text className="text-gray-400 dark:text-gray-400 text-xs mt-1 text-center">Horários e Loja</Text>
                </TouchableOpacity>
            </View>

            <View className="mt-8 bg-violet-600 p-5 rounded-2xl flex-row items-center relative overflow-hidden">
                <View className="flex-1 z-10">
                    <Text className="text-white font-extrabold text-xl mb-1">Modo Mestre</Text>
                    <Text className="text-violet-200">Você agora tem controle total sobre o restaurante.</Text>
                </View>
                <View className="absolute right-[-20px] top-[-10px] opacity-20">
                    <LayoutDashboard size={100} color="white" />
                </View>
            </View>
        </View>
    );
}
