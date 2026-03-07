import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { useCartStore } from '../../store/cartStore';
import { Minus, Plus, Trash2 } from 'lucide-react-native';

export default function CartScreen() {
    const { items, addItem, removeItem, getTotalPrice, clearCart } = useCartStore();

    const total = getTotalPrice();

    if (items.length === 0) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50 pt-12 px-5">
                <Text className="text-xl font-bold text-gray-400 mb-2">
                    Carrinho vazio
                </Text>
                <Text className="text-gray-400 text-center">
                    Adicione pratos no cardápio para começar seu pedido.
                </Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50 pt-12">
            <View className="px-5 mb-4 flex-row justify-between items-center">
                <Text className="text-2xl font-extrabold text-gray-800">Seu Pedido</Text>
                <TouchableOpacity onPress={clearCart}>
                    <Text className="text-red-500 font-bold">Limpar</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                renderItem={({ item }) => (
                    <View className="flex-row items-center bg-white p-3 rounded-xl mb-3 shadow-sm border border-gray-100">
                        <Image
                            source={{ uri: item.imageUrl }}
                            className="h-16 w-16 rounded-lg bg-gray-200"
                        />
                        <View className="flex-1 ml-3">
                            <Text className="font-bold text-gray-800" numberOfLines={1}>
                                {item.name}
                            </Text>
                            <Text className="text-red-600 font-medium mt-1">
                                R$ {item.price.toFixed(2).replace('.', ',')}
                            </Text>
                        </View>

                        <View className="flex-row items-center bg-gray-100 rounded-lg px-2 py-1">
                            <TouchableOpacity
                                onPress={() => removeItem(item.id)}
                                className="p-1"
                            >
                                {item.quantity === 1 ? (
                                    <Trash2 size={16} color="#666" />
                                ) : (
                                    <Minus size={16} color="#666" />
                                )}
                            </TouchableOpacity>
                            <Text className="mx-3 font-bold">{item.quantity}</Text>
                            <TouchableOpacity onPress={() => addItem(item)} className="p-1">
                                <Plus size={16} color="#666" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />

            <View className="bg-white p-6 border-t border-gray-200 rounded-t-3xl shadow-lg">
                <View className="flex-row justify-between mb-4">
                    <Text className="text-gray-500 font-medium">Total do Pedido</Text>
                    <Text className="text-xl font-extrabold text-gray-900">
                        R$ {total.toFixed(2).replace('.', ',')}
                    </Text>
                </View>

                <TouchableOpacity className="bg-red-500 py-4 rounded-xl items-center flex-row justify-center shadow-md shadow-red-500/30">
                    <Text className="text-white font-bold text-lg">Finalizar Pedido</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
