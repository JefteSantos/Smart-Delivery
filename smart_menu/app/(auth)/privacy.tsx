import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function PrivacyScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-white dark:bg-gray-800 pt-12">
            <View className="px-5 mb-4 flex-row items-center border-b border-gray-100 dark:border-gray-800 pb-4">
                <TouchableOpacity
                    onPress={() => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.replace('/(auth)/register');
                        }
                    }}
                    className="p-2 bg-gray-50 dark:bg-gray-900 rounded-full mr-4"
                >
                    <ArrowLeft size={20} color="#1F2937" />
                </TouchableOpacity>
                <Text className="text-xl font-extrabold text-gray-900 dark:text-white">Política de Privacidade</Text>
            </View>

            <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
                <Text className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed text-sm">
                    A privacidade é parte da nossa entrega no Smart Delivery. A presente Política de Privacidade explica como a plataforma coleta, usa, protege e compartilha as suas informações e dados pessoais.
                </Text>

                <View className="mb-6">
                    <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">1. O que é o tratamento de dados pessoais?</Text>
                    <Text className="text-gray-600 dark:text-white leading-relaxed mb-2 text-justify">
                        O tratamento de dados pessoais significa qualquer operação realizada com informações que identificam ou podem identificar uma pessoa. Você, cliente do Smart Delivery, é titular desses dados e respeitamos profundamente sua privacidade e segurança.
                    </Text>
                </View>

                <View className="mb-6">
                    <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">2. Quais dados são coletados?</Text>
                    <Text className="text-gray-600 dark:text-white leading-relaxed mb-2 text-justify">
                        <Text className="font-bold">Dados que você nos fornece:</Text> Coletamos informações do seu perfil como nome, e-mail e outras informações da sua conta (tais como preferências de recebimento de ofertas).
                    </Text>
                    <Text className="text-gray-600 dark:text-white leading-relaxed mb-2 text-justify">
                        <Text className="font-bold">Dados de localização e endereço:</Text> Para realizarmos a entrega do seu pedido, é essencial processarmos as informações do endereço do local onde gostaria que fosse a entrega (CEP e endereço completo).
                    </Text>
                    <Text className="text-gray-600 dark:text-white leading-relaxed mb-2 text-justify">
                        <Text className="font-bold">Dados gerados e transacionais:</Text> Identificadores online, histórico de pedidos e comunicação efetuada pela plataforma durante o serviço. Todos os dados sensíveis de pagamento são mascarados e protegidos apropriadamente.
                    </Text>
                </View>

                <View className="mb-6">
                    <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">3. Como protegemos seus dados?</Text>
                    <Text className="text-gray-600 dark:text-white leading-relaxed mb-2 text-justify">
                        O Smart Delivery adota medidas de segurança, técnicas e administrativas para proteger os dados pessoais de acessos não autorizados e de situações acidentais ou ilícitas de destruição, perda, alteração ou comunicação, contando com os mais altos níveis de criptografia e gerenciamento de banco de dados e senhas.
                    </Text>
                </View>

                <View className="mb-6">
                    <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">4. Como os dados são compartilhados?</Text>
                    <Text className="text-gray-600 dark:text-white leading-relaxed mb-2 text-justify">
                        Nós poderemos compartilhar seus dados relativos à entrega de pedidos (como Nome e Endereço) de forma estritamente necessária com provedores parceiros do estabelecimento e de entregas. Exigimos o mesmo nível de controle e adequação dos processadores envolvidos.
                    </Text>
                </View>

                <View className="mb-10">
                    <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">5. Quais são os seus direitos e como exercê-los?</Text>
                    <Text className="text-gray-600 dark:text-white leading-relaxed mb-2 text-justify">
                        Você possui o direito à portabilidade de dados, à revogação de consentimento, correção, ajuste de dados incompletos ou ainda pedir a exclusão total da sua conta, bem como entrar em contato com autoridades responsáveis nos canais listados na plataforma correspondentes à conformidade.
                    </Text>
                </View>

                <View className="h-10" />
            </ScrollView>
        </View>
    );
}
