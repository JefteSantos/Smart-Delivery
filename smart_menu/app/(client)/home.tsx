import { ScrollView, View, Image, Text as RNText, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useCartStore, Product } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { Plus } from 'lucide-react-native';
import { Card } from '../../components/ui/card';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Category {
    id: string;
    name: string;
}

export default function Catalog() {
    const user = useAuthStore((state) => state.user);
    const addItem = useCartStore((state) => state.addItem);

    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMenuData();
    }, []);

    const fetchMenuData = async () => {
        try {
            // Busca as Categorias
            const { data: catData, error: catError } = await supabase
                .from('categories')
                .select('*')
                .order('sort_order', { ascending: true });

            if (catError) throw catError;

            // Busca os Produtos ligados às Categorias
            const { data: prodData, error: prodError } = await supabase
                .from('products')
                .select('id, name, description, price, image_url, is_offer, category_id, available_days');

            if (prodError) throw prodError;

            if (catData) setCategories(catData);

            // Se houver categorias, seleciona a primeira por padrão
            if (catData && catData.length > 0) {
                setSelectedCategoryId(catData[0].id);
            }

            // Descobrindo qual é o dia atual (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
            const currentDay = new Date().getDay();

            if (prodData) {
                const formattedProducts: Product[] = [];
                for (let p of prodData) {
                    // Verifica se o produto tem restrição de dias
                    if (p.available_days && p.available_days.length > 0) {
                        // Se hoje não estiver dentro da lista de dias disponíveis, a gente pula (não adiciona na lista)
                        if (!p.available_days.includes(currentDay)) {
                            continue;
                        }
                    }

                    formattedProducts.push({
                        id: p.id,
                        name: p.name,
                        description: p.description || '',
                        price: p.price,
                        imageUrl: p.image_url || '', // placeholder local tratado no renderProduct
                        isOfferOfTheDay: p.is_offer,
                        categoryId: p.category_id
                    } as Product & { categoryId: string });
                }

                setProducts(formattedProducts);
            }

        } catch (error: any) {
            console.error('Erro ao buscar cardápio FULL DETAIL:', JSON.stringify(error, null, 2));
            Alert.alert("Erro de API", error?.message + " " + error?.details + " " + error?.hint);
        } finally {
            setLoading(false);
        }
    };

    const offersOfTheDay = products.filter((p) => p.isOfferOfTheDay);

    // Filtramos os produtos normais para mostrar APENAS os da categoria selecionada (e que não sejam a oferta destacada)
    const filteredProducts = products.filter(
        (p: any) => p.categoryId === selectedCategoryId && !p.isOfferOfTheDay
    );

    const renderProduct = (item: Product, highlight: boolean = false) => (
        <Card key={item.id} className={`mb-4 overflow-hidden rounded-xl ${highlight ? 'border-2 border-red-500' : ''}`}>
            <View className="flex-row p-3">
                <Image
                    source={
                        (item as any).imageUrl
                            ? { uri: (item as any).imageUrl }
                            : require('../../assets/images/placeholder-meal.webp')
                    }
                    className="rounded-lg bg-gray-200 dark:bg-gray-700"
                    style={{ width: 80, height: 80 }}
                    resizeMode="cover"
                />
                <View className="ml-3 flex-1 justify-between">
                    <View>
                        <View className="flex-row items-center justify-between">
                            <RNText className="font-bold text-lg text-gray-800 dark:text-white flex-1 mr-2" numberOfLines={1}>
                                {item.name}
                            </RNText>
                            {highlight && (
                                <View className="bg-red-500 px-2 py-0.5 rounded-full">
                                    <RNText className="text-white text-xs font-bold">HOJE</RNText>
                                </View>
                            )}
                        </View>
                        <RNText className="text-sm text-gray-500 dark:text-gray-400 mt-1" numberOfLines={2}>
                            {item.description}
                        </RNText>
                    </View>
                    <View className="flex-row items-center justify-between mt-2">
                        <RNText className="font-bold text-base text-gray-900 dark:text-white">
                            R$ {Number(item.price).toFixed(2).replace('.', ',')}
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

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
                <ActivityIndicator size="large" color="#EF4444" />
                <RNText className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Buscando cardápio fresquinho...</RNText>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 pt-12">
            <View className="px-5 mb-4">
                <RNText className="text-2xl font-extrabold text-gray-800 dark:text-white">
                    Olá, {user?.name || 'Cliente'}! 👋
                </RNText>
                <RNText className="text-gray-500 dark:text-gray-400">
                    O que vamos pedir hoje?
                </RNText>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

                {offersOfTheDay.length > 0 && (
                    <View className="px-5 mb-6 mt-2">
                        <RNText className="text-lg font-bold text-gray-800 dark:text-white mb-3">
                            Ofertas do Dia 🔥
                        </RNText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5" contentContainerStyle={{ paddingRight: 40 }}>
                            {offersOfTheDay.map(offer => (
                                <View key={offer.id} style={{ width: 280 }} className="mr-4">
                                    {renderProduct(offer, true)}
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Filtro Dinâmico de Categorias (Scrool Horizontal) */}
                <View className="mb-4">
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20 }}
                    >
                        {categories.map((cat) => {
                            const isSelected = cat.id === selectedCategoryId;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => setSelectedCategoryId(cat.id)}
                                    className={`mr-3 px-5 py-2.5 rounded-full ${isSelected ? 'bg-red-500' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}
                                >
                                    <RNText className={`font-bold ${isSelected ? 'text-white' : 'text-gray-600 dark:text-white'}`}>
                                        {cat.name}
                                    </RNText>
                                </TouchableOpacity>
                            )
                        })}
                    </ScrollView>
                </View>

                {/* Lista dos Produtos da Categoria Selecionada */}
                <View className="px-5 mb-8">
                    {filteredProducts.length === 0 ? (
                        <View className="py-10 items-center justify-center">
                            <RNText className="text-gray-400 dark:text-gray-400 text-center text-base">Nenhum produto nesta categoria ainda.</RNText>
                        </View>
                    ) : (
                        filteredProducts.map((p) => renderProduct(p))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
