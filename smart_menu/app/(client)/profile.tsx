import { View, Text, TouchableOpacity } from 'react-native';
import { User, Settings, Bell, ChevronRight, LogOut } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
    const { user, logout } = useAuthStore();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.replace('/');
    };

    const options = [
        { id: 1, title: 'Meus Dados', icon: User },
        { id: 2, title: 'Meus Pedidos', icon: Bell },
        { id: 3, title: 'Configurações', icon: Settings },
    ];

    if (!user) return null;

    return (
        <View className="flex-1 bg-gray-50 pt-16 px-5">
            <View className="items-center mb-8">
                <View className="h-24 w-24 bg-red-100 rounded-full items-center justify-center mb-4">
                    <User size={40} color="#EF4444" />
                </View>
                <Text className="text-2xl font-bold text-gray-800">{user.name}</Text>
                <Text className="text-gray-500">{user.email}</Text>
            </View>

            <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-6">
                {options.map((option, index) => (
                    <TouchableOpacity
                        key={option.id}
                        className={`flex-row items-center justify-between p-4 ${index !== options.length - 1 ? 'border-b border-gray-100' : ''
                            }`}
                    >
                        <View className="flex-row items-center">
                            <View className="bg-gray-50 p-2 rounded-lg mr-3">
                                <option.icon size={20} color="#4B5563" />
                            </View>
                            <Text className="text-gray-700 font-medium text-lg">
                                {option.title}
                            </Text>
                        </View>
                        <ChevronRight size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                className="flex-row items-center justify-center bg-red-50 p-4 rounded-xl border border-red-100 mt-auto mb-8"
                onPress={handleLogout}
            >
                <LogOut size={20} color="#EF4444" />
                <Text className="text-red-500 font-bold text-lg ml-2">Sair da Conta</Text>
            </TouchableOpacity>
        </View>
    );
}
