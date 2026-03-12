import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function TermsScreen() {
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
                <Text className="text-xl font-extrabold text-gray-900 dark:text-white">Termos e Condições</Text>
            </View>

            <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
                <Text className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed text-sm">
                    Por favor, leia com atenção os termos e condições. Ao se cadastrar no Smart Delivery você ESTÁ DE ACORDO COM AS CONDIÇÕES E TERMOS da plataforma.
                </Text>

                <View className="mb-6">
                    <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">1. SERVIÇOS OFERECIDOS</Text>
                    <Text className="text-gray-600 dark:text-white leading-relaxed mb-2 text-justify">
                        1.1 Este TERMO se aplica para regular o uso do serviço oferecido aos USUÁRIOS, qual seja, possibilitar a escolha e solicitações para aquisição e entrega em domicílio (ou retirada no local) de produtos fornecidos pelo estabelecimento.
                    </Text>
                    <Text className="text-gray-600 dark:text-white leading-relaxed mb-2 text-justify">
                        1.2 O serviço consiste em facilitar, através do aplicativo, que os USUÁRIOS encaminhem seus pedidos, sendo possível a opção de pagamento on-line ou na entrega.
                    </Text>
                </View>

                <View className="mb-6">
                    <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">2. CADASTRO</Text>
                    <Text className="text-gray-600 dark:text-white leading-relaxed mb-2 text-justify">
                        2.1 O USUÁRIO deverá ter capacidade jurídica para atos civis e deverá prestar as informações exigidas no CADASTRO, assumindo integralmente a responsabilidade pela exatidão e veracidade das informações fornecidas.
                    </Text>
                    <Text className="text-gray-600 dark:text-white leading-relaxed mb-2 text-justify">
                        2.2 Em caso de informações incorretas, ou na hipótese da negativa em corrigi-las, a plataforma se reserva o direito de não concluir o cadastramento, ou bloquear o cadastro já existente.
                    </Text>
                    <Text className="text-gray-600 dark:text-white leading-relaxed mb-2 text-justify">
                        2.3 Efetuado o CADASTRO, o USUÁRIO terá acesso através de seu e-mail e senha, comprometendo-se a não divulgar a terceiros, ficando sob sua responsabilidade qualquer uso desses dados.
                    </Text>
                </View>

                <View className="mb-6">
                    <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">3. OBRIGAÇÕES DO USUÁRIO</Text>
                    <Text className="text-gray-600 dark:text-white leading-relaxed mb-2 text-justify">
                        3.1 É obrigação do USUÁRIO fornecer informações totalmente verídicas, mantendo atualizado o endereço para entrega dos produtos encomendados.
                    </Text>
                    <Text className="text-gray-600 dark:text-white leading-relaxed mb-2 text-justify">
                        3.2 O USUÁRIO se obriga a pagar integralmente o preço dos produtos solicitados.
                    </Text>
                    <Text className="text-gray-600 dark:text-white leading-relaxed mb-2 text-justify">
                        3.3 O USUÁRIO menor de 18 anos está ciente de que não poderá encomendar produtos alcoólicos através do restaurante.
                    </Text>
                </View>

                <View className="mb-6">
                    <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">4. PRIVACIDADE E DADOS</Text>
                    <Text className="text-gray-600 dark:text-white leading-relaxed mb-2 text-justify">
                        4.1 A plataforma está comprometida em proteger, através de práticas seguras, a confidencialidade de todas as informações de cadastro e operação financeira.
                    </Text>
                </View>

                <View className="mb-10">
                    <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">5. ACEITAÇÃO</Text>
                    <Text className="text-gray-600 dark:text-white leading-relaxed mb-2 text-justify">
                        5.1 O USUÁRIO declara ter lido, entendido e que aceita todas as regras, condições e obrigações estabelecidas no presente TERMO para continuar a usar o aplicativo de delivery.
                    </Text>
                </View>

                <View className="h-10" />
            </ScrollView>
        </View>
    );
}
