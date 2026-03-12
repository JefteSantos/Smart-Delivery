import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function TermsOfUseScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 pt-16 px-5">
            <View className="mb-6 flex-row items-center border-b border-gray-200 dark:border-gray-700 pb-4">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Text className="text-red-500 font-bold text-lg">{'< Voltar'}</Text>
                </TouchableOpacity>
                <View>
                    <Text className="text-xl font-extrabold text-gray-900 dark:text-white">Termos de Uso</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-10 contentContainerStyle={{ paddingBottom: 40 }}">
                <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">1. Aceitação</Text>
                <Text className="text-gray-600 dark:text-white mb-6 leading-relaxed">
                    Ao criar uma conta ou utilizar o nosso aplicativo de delivery, você concorda legalmente em respeitar e seguir
                    nossos Termos de Serviço. Se não concordar, infelizmente você não poderá utilizar a plataforma.
                </Text>

                <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">2. Oferta de Produtos</Text>
                <Text className="text-gray-600 dark:text-white mb-6 leading-relaxed">
                    O aplicativo apresenta um cardápio digital onde todos os itens listados estão sujeitos à disponibilidade
                    em nosso estoque. Algumas fotos são ilustrativas, e o prato entregue pode não ser idêntico à imagem referencial.
                    A Oferta do Dia também pode ser interrompida sem aviso prévio.
                </Text>

                <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">3. Tempo de Entrega e Pedidos</Text>
                <Text className="text-gray-600 dark:text-white mb-6 leading-relaxed">
                    Nós informamos o status atual no momento que você realiza a compra. Em horários de pico ou
                    chuva intensa, o tempo de entrega poderá sofrer alterações além do previsto originalmente no aplicativo.
                    Nós não nos responsabilizamos por perdas provenientes do atraso na entrega.
                </Text>

                <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">4. Conduta do Usuário</Text>
                <Text className="text-gray-600 dark:text-white mb-6 leading-relaxed">
                    Ao fazer um pedido e o modo "Entregar no meu Endereço" estiver ativado, o usuário
                    assume a responsabilidade civil por receber o motoboy. Múltiplos registros de pedidos
                    não recebidos (fraudes conhecidas pelo termo "pedido fantasma") acarretarão no banimento
                    eterno do CPF / Conta associada do sistema.
                </Text>

                <Text className="font-bold text-gray-800 dark:text-white text-lg mb-2">5. Cancelamentos e Reembolsos</Text>
                <Text className="text-gray-600 dark:text-white mb-6 leading-relaxed">
                    Pedidos só podem ser cancelados através do botão de Cancelamento se o status interno da loja
                    estiver marcado como "Aguardando Confirmação". Assim que passarem para o fluxo "Preparando", o cancelamento
                    somente poderá ocorrer via contato direto conosco justificando os motivos.
                </Text>

                <Text className="text-gray-400 dark:text-gray-400 text-xs text-center mt-4 mb-10">
                    Última atualização: Março de 2026
                </Text>
            </ScrollView>
        </View>
    );
}
