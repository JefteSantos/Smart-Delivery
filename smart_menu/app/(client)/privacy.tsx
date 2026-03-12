import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function PrivacyPolicyScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 pt-16 px-5">
            <View className="mb-6 flex-row items-center border-b border-gray-200 dark:border-gray-700 pb-4">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Text className="text-red-500 font-bold text-lg">{'< Voltar'}</Text>
                </TouchableOpacity>
                <View>
                    <Text className="text-xl font-extrabold text-gray-900 dark:text-white">Política de Privacidade</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-10 contentContainerStyle={{ paddingBottom: 40 }}">
                <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">1. Coleta de Dados</Text>
                <Text className="text-gray-600 dark:text-white mb-6 leading-relaxed">
                    Nós coletamos as informações essenciais para garantir o processamento e a entrega correta do seu pedido.
                    Isso inclui seu nome, e-mail e as preferências de notificação que você define no aplicativo.
                </Text>

                <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">2. Uso das Informações</Text>
                <Text className="text-gray-600 dark:text-white mb-6 leading-relaxed">
                    Utilizamos seus dados estritamente para: {'\n'}
                    • Criar e gerenciar sua conta.{'\n'}
                    • Processar e entregar seus pedidos.{'\n'}
                    • Enviar atualizações sobre o andamento da entrega via notificações Push.{'\n'}
                    • Enviar ofertas exclusivas (caso você tenha autorizado nas configurações).
                </Text>

                <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">3. Segurança dos Dados</Text>
                <Text className="text-gray-600 dark:text-white mb-6 leading-relaxed">
                    Armazenamos suas informações em servidores seguros e criptografados.
                    Suas senhas são mantidas sob forte protocolo de criptografia (através do Supabase Auth) e nós, administradores, não temos acesso a elas.
                </Text>

                <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">4. Compartilhamento</Text>
                <Text className="text-gray-600 dark:text-white mb-6 leading-relaxed">
                    Não vendemos e nem compartilhamos seus dados pessoais com empresas terceiras de publicidade.
                </Text>

                <Text className="text-gray-400 dark:text-gray-400 text-xs text-center mt-4">
                    Última atualização: Março de 2026
                </Text>
                <View className="h-10" />
            </ScrollView>
        </View>
    );
}
