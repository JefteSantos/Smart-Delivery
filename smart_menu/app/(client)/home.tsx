import { ScrollView, View, Image, Text as RNText, TouchableOpacity } from 'react-native';
import { useCartStore, Product } from '../../store/cartStore';
import { Plus } from 'lucide-react-native';
import { Card, CardContent } from '../../components/ui/card';

const DUMMY_PRODUCTS: Product[] = [
    {
        id: '1',
        name: 'Feijoada Completa',
        description: 'Acompanha arroz, couve, farofa, laranja e torresmo.',
        price: 35.9,
        imageUrl: 'https://images.unsplash.com/photo-1632517861962-f7ad96e2f69e?q=80&w=600&auto=format&fit=crop',
        isOfferOfTheDay: true,
    },
    {
        id: '2',
        name: 'Parmegiana de Frango',
        description: 'Frango empanado com molho de tomate, queijo, fritas e arroz.',
        price: 28.5,
        imageUrl: 'https://plus.unsplash.com/premium_photo-1663852297267-827c73e7529e?q=80&w=600&auto=format&fit=crop',
    },
    {
        id: '3',
        name: 'Picanha na Chapa',
        description: 'Picanha grelhada com mandioca frita, vinagrete e farofa.',
        price: 49.9,
        imageUrl: 'https://images.unsplash.com/photo-1558030006-450675393462?q=80&w=600&auto=format&fit=crop',
    },
    {
        id: '4',
        name: 'Suco de Laranja Natural',
        description: '500ml',
        price: 8.0,
        imageUrl: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?q=80&w=600&auto=format&fit=crop',
    },
];

export default function Catalog() {
    const addItem = useCartStore((state) => state.addItem);

    const offerOfTheDay = DUMMY_PRODUCTS.find((p) => p.isOfferOfTheDay);
    const otherProducts = DUMMY_PRODUCTS.filter((p) => !p.isOfferOfTheDay);

    const renderProduct = (item: Product, highlight: boolean = false) => (
        <Card key={item.id} className={`mb-4 overflow-hidden rounded-xl ${highlight ? 'border-2 border-red-500' : ''}`}>
            <View className="flex-row p-3">
                <Image
                    source={{ uri: item.imageUrl }}
                    className="h-24 w-24 rounded-lg bg-gray-200"
                />
                <View className="ml-3 flex-1 justify-between">
                    <View>
                        <View className="flex-row items-center justify-between">
                            <RNText className="font-bold text-lg text-gray-800" numberOfLines={1}>
                                {item.name}
                            </RNText>
                            {highlight && (
                                <View className="bg-red-500 px-2 py-0.5 rounded-full ml-2">
                                    <RNText className="text-white text-xs font-bold">HOJE</RNText>
                                </View>
                            )}
                        </View>
                        <RNText className="text-sm text-gray-500 mt-1" numberOfLines={2}>
                            {item.description}
                        </RNText>
                    </View>
                    <View className="flex-row items-center justify-between mt-2">
                        <RNText className="font-bold text-base text-gray-900">
                            R$ {item.price.toFixed(2).replace('.', ',')}
                        </RNText>
                        <TouchableOpacity
                            onPress={() => addItem(item)}
                            className="bg-red-100 p-2 rounded-full"
                        >
                            <Plus size={20} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Card>
    );

    return (
        <View className="flex-1 bg-gray-50 pt-12">
            <View className="px-5 mb-4">
                <RNText className="text-2xl font-extrabold text-gray-800">
                    Olá, Cliente! 👋
                </RNText>
                <RNText className="text-gray-500">
                    O que vamos pedir hoje?
                </RNText>
            </View>

            <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
                {offerOfTheDay && (
                    <View className="mb-6">
                        <RNText className="text-lg font-bold text-gray-800 mb-3">
                            Oferta do Dia 🔥
                        </RNText>
                        {renderProduct(offerOfTheDay, true)}
                    </View>
                )}

                <View className="mb-8">
                    <RNText className="text-lg font-bold text-gray-800 mb-3">
                        Cardápio
                    </RNText>
                    {otherProducts.map((p) => renderProduct(p))}
                </View>
            </ScrollView>
        </View>
    );
}
