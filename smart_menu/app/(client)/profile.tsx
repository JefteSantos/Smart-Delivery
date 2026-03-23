import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { User, Settings, Bell, ChevronRight, LogOut, Camera } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';

export default function ProfileScreen() {
    const { user, logout } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signOut();
        setLoading(false);

        if (error) {
            console.error("Erro no logout da API:", error);
            // Mostrar aviso, mas continuar o fluxo de desconexão local
        }
        
        // Força a limpeza da store local e redireciona (ignora falhas de rede/CORS na API)
        logout(); 
        router.replace('/(auth)/login');
    };

    const pickAvatar = async () => {
        Alert.alert(
            "Foto de Perfil",
            "Escolha onde quer buscar a foto",
            [
                { text: "Galeria", onPress: () => processImage(false) },
                { text: "Câmera", onPress: () => processImage(true) },
                { text: "Cancelar", style: "cancel" }
            ]
        );
    };

    const processImage = async (useCamera: boolean) => {
        let result;
        if (useCamera) {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) return Alert.alert("Câmera Recusada", "Dê permissão nas configurações!");
            result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true, aspect: [1, 1], quality: 1,
            });
        } else {
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true, aspect: [1, 1], quality: 1,
            });
        }

        if (!result.canceled && user) {
            try {
                setLoading(true);
                const manipResult = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 400 } }], // Imagem pequena para perfil
                    { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP, base64: true }
                );

                const base64Data = manipResult.base64;
                if (!base64Data) throw new Error("A imagem não pôde ser redimensionada.");

                // CORREÇÃO: Nome fixo por usuário + upsert para não acumular arquivos no Storage
                const fileName = `avatar_${user.id}.webp`;
                const { error } = await supabase.storage.from('avatars').upload(fileName, decode(base64Data), { contentType: 'image/webp', upsert: true });

                let newUrl = '';
                if (error) {
                    if (error.message.includes('Bucket') || error.message.includes('security')) {
                        // Imagem embutida em base64 se storage não existir
                        newUrl = `data:image/webp;base64,${base64Data}`;
                    } else throw error;
                } else {
                    newUrl = supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
                }

                // Salva a nova foto na base de contas Auth do Supabase e na memória cache
                await supabase.auth.updateUser({ data: { avatar_url: newUrl } });
                useAuthStore.getState().login({ ...user, avatar_url: newUrl });
            } catch (err: any) {
                Alert.alert("Erro", "Falha ao enviar sua foto de perfil.");
            } finally {
                setLoading(false);
            }
        }
    };

    const options = [
        { id: 1, title: 'Meus Dados', icon: User, route: '/(client)/my-data' },
        { id: 2, title: 'Meus Pedidos', icon: Bell, route: '/(client)/my-orders' },
        { id: 3, title: 'Configurações', icon: Settings, route: '/(client)/settings' },
    ];

    if (!user) return null;

    return (
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 pt-16 px-5">
            <View className="items-center mb-8">
                <TouchableOpacity onPress={pickAvatar} disabled={loading} className="mb-4 relative rounded-full shadow-sm">
                    {user.avatar_url ? (
                        <Image source={{ uri: user.avatar_url }} className="h-28 w-28 rounded-full border-4 border-white dark:border-gray-800" />
                    ) : (
                        <View className="h-28 w-28 bg-red-100 rounded-full items-center justify-center border-4 border-white dark:border-gray-800">
                            <User size={48} color="#EF4444" />
                        </View>
                    )}
                    <View className="absolute bottom-0 right-0 bg-violet-600 p-2 rounded-full border-2 border-white dark:border-gray-800">
                        <Camera size={14} color="white" />
                    </View>
                </TouchableOpacity>

                <View className="flex-row items-center mb-1">
                    <Text className="text-2xl font-bold text-gray-800 dark:text-white">{user.name}</Text>
                </View>
                <Text className="text-gray-500 dark:text-gray-400">{user.email}</Text>
            </View>

            <View className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-2 mb-6">
                {options.map((option, index) => (
                    <TouchableOpacity
                        key={option.id}
                        onPress={() => {
                            if (option.route) router.push(option.route as any);
                        }}
                        className={`flex-row items-center justify-between p-4 ${index !== options.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                            }`}
                    >
                        <View className="flex-row items-center">
                            <View className="bg-gray-50 dark:bg-gray-900 p-2 rounded-lg mr-3">
                                <option.icon size={20} color="#4B5563" />
                            </View>
                            <Text className="text-gray-700 dark:text-white font-medium text-lg">
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
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#EF4444" />
                ) : (
                    <>
                        <LogOut size={20} color="#EF4444" />
                        <Text className="text-red-500 font-bold text-lg ml-2">Sair da Conta</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}
