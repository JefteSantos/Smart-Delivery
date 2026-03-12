import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Modal, TextInput, Switch } from 'react-native';
import { Plus, X, Pencil, Trash2, FolderEdit, ChevronUp, ChevronDown, Camera, Image as ImageIcon } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';

// Nomes e tipos baseados no BD
interface Category { id: string; name: string; sort_order: number; }
interface Product { id: string; name: string; price: number; description: string; image_url: string; is_offer: boolean; category_id: string; available_days?: number[] | null; }

export default function MasterMenuScreen() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    // Produto UI States
    const [modalVisible, setModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);

    // Categoria UI States
    const [catModalVisible, setCatModalVisible] = useState(false);
    const [savingCat, setSavingCat] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [editingCatId, setEditingCatId] = useState<string | null>(null);

    // Product Form
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [isOffer, setIsOffer] = useState(false);
    const [availableDays, setAvailableDays] = useState<number[]>([]);

    const DAYS_OF_WEEK = [
        { id: null, name: 'Todos' },
        { id: 0, name: 'Dom' },
        { id: 1, name: 'Seg' },
        { id: 2, name: 'Ter' },
        { id: 3, name: 'Qua' },
        { id: 4, name: 'Qui' },
        { id: 5, name: 'Sex' },
        { id: 6, name: 'Sáb' },
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: catData, error: catError } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
            if (catError) throw catError;
            setCategories(catData || []);
            if (catData && catData.length > 0 && !categoryId) setCategoryId(catData[0].id);

            const { data: prodData, error: prodError } = await supabase.from('products').select('*');
            if (prodError) throw prodError;
            setProducts(prodData || []);
        } catch (error: any) {
            Alert.alert("Erro", "Não foi possível carregar os dados. " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async (useCamera: boolean = false) => {
        let result;
        if (useCamera) {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) return Alert.alert("Câmera Recusada", "Dê permissão nas configurações!");
            result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
            });
        } else {
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
            });
        }

        if (!result.canceled) {
            try {
                setLoading(true);
                // Converter para WebP e Redimensionar
                const manipResult = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 800 } }],
                    { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP, base64: true }
                );

                const base64Data = manipResult.base64;
                if (!base64Data) throw new Error("Falha ao processar imagem");

                const fileName = `prod_${Date.now()}.webp`;

                const { data, error } = await supabase.storage
                    .from('products')
                    .upload(fileName, decode(base64Data), { contentType: 'image/webp' });

                if (error) {
                    if (error.message.includes('Bucket') || error.message.includes('security')) {
                        // Fallback temporário usando Base64 direto (sem Storage)
                        setImageUrl(`data:image/webp;base64,${base64Data}`);
                        Alert.alert("Aviso de Armazenamento", "A foto foi salva incorporada porque o Storage não foi configurado ou encontrado.\nIsso funciona muito bem por agora, mas depois crie um bucket público 'products' no Supabase.");
                        return;
                    }
                    throw error;
                }

                const publicUrl = supabase.storage.from('products').getPublicUrl(fileName).data.publicUrl;
                setImageUrl(publicUrl);
            } catch (err: any) {
                Alert.alert("Erro de Upload", "Não foi possível processar a imagem: " + err.message);
            } finally {
                setLoading(false);
            }
        }
    };

    // === GERENCIAR PRODUTOS ===
    const openNewProduct = () => {
        setEditingProductId(null);
        setName('');
        setPrice('');
        setDescription('');
        setImageUrl('');
        setIsOffer(false);
        setAvailableDays([]);
        // CORRECAO: garante reset da categoria mesmo quando categories já estava carregado
        setCategoryId(categories.length > 0 ? categories[0].id : '');
        setModalVisible(true);
    };

    const openEditProduct = (p: Product) => {
        setEditingProductId(p.id);
        setName(p.name || '');
        setPrice(p.price != null ? String(p.price) : '');
        setDescription(p.description || '');
        setImageUrl(p.image_url || '');
        setCategoryId(p.category_id || (categories.length > 0 ? categories[0].id : ''));
        setIsOffer(p.is_offer || false);
        setAvailableDays(p.available_days || []);
        setModalVisible(true);
    }

    const handleSaveProduct = async () => {
        if (!name || !price || !categoryId) {
            Alert.alert("Erro", "Nome, Preço e Categoria são obrigatórios.");
            return;
        }

        let numericPrice = price;
        if (typeof numericPrice === 'string') {
            numericPrice = numericPrice.replace(',', '.');
        }
        const numericFinal = parseFloat(numericPrice);

        if (isNaN(numericFinal)) {
            Alert.alert("Erro", "O formato do preço é inválido.");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name,
                description,
                price: numericFinal,
                image_url: imageUrl,
                is_offer: isOffer,
                category_id: categoryId,
                available_days: availableDays.length > 0 ? availableDays : null
            };

            if (editingProductId) {
                // UPDATE
                const { error } = await supabase.from('products').update(payload).eq('id', editingProductId);
                if (error) throw error;
                Alert.alert("Sucesso", "Produto atualizado com sucesso!");
            } else {
                // INSERT
                const { error } = await supabase.from('products').insert([payload]);
                if (error) throw error;
                Alert.alert("Sucesso", "Produto inserido no cardápio!");
            }

            setModalVisible(false);
            fetchData();
        } catch (error: any) {
            Alert.alert("Erro ao salvar", error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProduct = (id: string, name: string) => {
        Alert.alert("Apagar Produto", `Tem certeza que quer remover "${name}" do cardápio?`, [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Apagar",
                style: "destructive",
                onPress: async () => {
                    const { error } = await supabase.from('products').delete().eq('id', id);
                    if (error) {
                        Alert.alert("Erro", error.message);
                    } else {
                        fetchData();
                    }
                }
            }
        ]);
    };

    // === GERENCIAR CATEGORIAS ===
    const handleSaveCategory = async () => {
        if (!newCatName.trim()) return;

        setSavingCat(true);
        try {
            if (editingCatId) {
                const { error } = await supabase.from('categories').update({ name: newCatName.trim() }).eq('id', editingCatId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('categories').insert([{ name: newCatName.trim(), sort_order: categories.length + 1 }]);
                if (error) throw error;
            }
            setNewCatName('');
            setEditingCatId(null);
            fetchData(); // recarrega 
        } catch (error: any) {
            Alert.alert("Erro", "Não foi possível salvar categoria: " + error.message);
        } finally {
            setSavingCat(false);
        }
    };

    const handleEditCategory = (c: Category) => {
        setEditingCatId(c.id);
        setNewCatName(c.name);
    };

    const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
        if (index === 0 && direction === 'up') return;
        if (index === categories.length - 1 && direction === 'down') return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const currentCat = categories[index];
        const targetCat = categories[targetIndex];

        // Swap UI optimistic
        const newCats = [...categories];
        newCats[index] = { ...currentCat, sort_order: targetCat.sort_order };
        newCats[targetIndex] = { ...targetCat, sort_order: currentCat.sort_order };

        // Ordena
        newCats.sort((a, b) => a.sort_order - b.sort_order);
        setCategories(newCats);

        // Update Backend
        await supabase.from('categories').update({ sort_order: targetCat.sort_order }).eq('id', currentCat.id);
        await supabase.from('categories').update({ sort_order: currentCat.sort_order }).eq('id', targetCat.id);
    };

    const handleDeleteCategory = (id: string, name: string) => {
        const hasProducts = products.some(p => p.category_id === id);
        if (hasProducts) {
            Alert.alert("Atenção", "Você não pode apagar uma Categoria que ainda possui produtos. Mude os produtos de categoria antes ou apague-os.");
            return;
        }

        Alert.alert("Apagar Categoria", `Tem certeza que quer remover a categoria "${name}"?`, [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Apagar",
                style: "destructive",
                onPress: async () => {
                    const { error } = await supabase.from('categories').delete().eq('id', id);
                    if (error) {
                        Alert.alert("Erro", error.message);
                    } else {
                        fetchData();
                    }
                }
            }
        ]);
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900 pt-16">
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Buscando cardápio no servidor...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 pt-16">
            <View className="px-5 mb-6 flex-row items-center justify-between">
                <View>
                    <Text className="text-2xl font-extrabold text-gray-900 dark:text-white">Gerenciar</Text>
                    <Text className="text-gray-500 dark:text-gray-400">Seu Cardápio Inteligente</Text>
                </View>
                <View className="flex-row space-x-2">
                    <TouchableOpacity
                        onPress={() => setCatModalVisible(true)}
                        className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mr-2"
                    >
                        <FolderEdit size={24} color="#8B5CF6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={openNewProduct}
                        className="p-3 bg-violet-600 rounded-xl"
                    >
                        <Plus size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
                {categories.map((cat) => {
                    // Produtos DESSA categoria especifica
                    const catProducts = products.filter(p => p.category_id === cat.id);

                    if (catProducts.length === 0) return null; // Esconde a aba se tiver vazia na visão geral

                    return (
                        <View key={cat.id} className="mb-8">
                            <Text className="text-lg font-bold text-gray-800 dark:text-white mb-3 ml-1">{cat.name}</Text>

                            {catProducts.map(p => (
                                <View key={p.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl mb-3 flex-row shadow-sm border border-gray-100 dark:border-gray-800">
                                    <View className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden relative">
                                        <Image
                                            source={p.image_url ? { uri: p.image_url } : require('../../assets/images/placeholder-meal.webp')}
                                            className="w-full h-full"
                                        />
                                        {p.is_offer && (
                                            <View className="absolute bottom-0 w-full bg-red-500 py-0.5 items-center">
                                                <Text className="text-white text-[9px] font-bold">OFERTA</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View className="ml-3 flex-1 justify-center">
                                        <Text className="font-bold text-gray-800 dark:text-white" numberOfLines={1}>{p.name}</Text>
                                        <Text className="text-violet-600 font-bold mt-1">R$ {Number(p.price).toFixed(2).replace('.', ',')}</Text>
                                        {p.available_days && p.available_days.length > 0 && (
                                            // CORRECAO: Object.keys(DAYS_OF_WEEK) em array era codigo morto - removido
                                            <Text className="text-xs text-orange-600 font-bold mt-1">Somente: {p.available_days.map((dId: number) => DAYS_OF_WEEK.find(day => day.id === dId)?.name).join(', ')}</Text>
                                        )}
                                    </View>
                                    <View className="flex-row items-center ml-2 space-x-2">
                                        <TouchableOpacity className="p-2 bg-gray-50 dark:bg-gray-900 rounded-full" onPress={() => openEditProduct(p)}>
                                            <Pencil size={18} color="#6B7280" />
                                        </TouchableOpacity>
                                        <TouchableOpacity className="p-2 bg-red-50 rounded-full" onPress={() => handleDeleteProduct(p.id, p.name)}>
                                            <Trash2 size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    );
                })}
                <View className="h-10" />
            </ScrollView>

            {/* MODAL DE PRODUTO */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white dark:bg-gray-800 rounded-t-3xl pt-5 pb-10 px-6 max-h-[90%]">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900 dark:text-white">{editingProductId ? "Editar Produto" : "Novo Produto"}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full">
                                <X size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text className="font-bold text-gray-700 dark:text-white mb-1">Nome do Produto</Text>
                            <TextInput
                                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white mb-4"
                                placeholder="Ex: Batata Frita Grande"
                                value={name} onChangeText={setName}
                            />

                            <View className="flex-row space-x-4 mb-4">
                                <View className="flex-1 mr-2">
                                    <Text className="font-bold text-gray-700 dark:text-white mb-1">Preço (R$)</Text>
                                    <TextInput
                                        className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white"
                                        placeholder="25.90" keyboardType="numeric"
                                        value={price} onChangeText={setPrice}
                                    />
                                </View>

                                <View className="flex-1">
                                    <Text className="font-bold text-gray-700 dark:text-white mb-1">Categoria (ID)</Text>
                                    {/* Scroll Horizontal fake dropdown */}
                                    <View className="border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 px-3 h-[48px] justify-center">
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {categories.map(c => (
                                                <TouchableOpacity
                                                    key={c.id}
                                                    onPress={() => setCategoryId(c.id)}
                                                    className={`mr-2 px-3 py-1.5 rounded-lg border ${categoryId === c.id ? 'bg-violet-100 border-violet-500' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                                                >
                                                    <Text className={categoryId === c.id ? 'text-violet-700 font-bold text-xs' : 'text-gray-500 dark:text-gray-400 text-xs'}>{c.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            </View>

                            <View className="mb-4">
                                <Text className="font-bold text-gray-700 dark:text-white mb-1">Dias Especiais (Ex: Prato do Dia)</Text>
                                <View className="border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 px-3 h-[48px] justify-center">
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <TouchableOpacity
                                            onPress={() => setAvailableDays([])}
                                            className={`mr-2 px-3 py-1.5 rounded-lg border ${availableDays.length === 0 ? 'bg-orange-100 border-orange-500' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                                        >
                                            <Text className={availableDays.length === 0 ? 'text-orange-700 font-bold text-xs' : 'text-gray-500 dark:text-gray-400 text-xs'}>Todos</Text>
                                        </TouchableOpacity>

                                        {DAYS_OF_WEEK.filter(d => d.id !== null).map(d => {
                                            const isSelected = availableDays.includes(d.id as number);
                                            return (
                                                <TouchableOpacity
                                                    key={d.id}
                                                    onPress={() => {
                                                        if (isSelected) {
                                                            setAvailableDays(availableDays.filter(day => day !== d.id));
                                                        } else {
                                                            setAvailableDays([...availableDays, d.id as number].sort());
                                                        }
                                                    }}
                                                    className={`mr-2 px-3 py-1.5 rounded-lg border ${isSelected ? 'bg-orange-100 border-orange-500' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                                                >
                                                    <Text className={isSelected ? 'text-orange-700 font-bold text-xs' : 'text-gray-500 dark:text-gray-400 text-xs'}>{d.name}</Text>
                                                </TouchableOpacity>
                                            )
                                        })}
                                    </ScrollView>
                                </View>
                            </View>

                            <Text className="font-bold text-gray-700 dark:text-white mb-1">Descrição</Text>
                            <TextInput
                                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white mb-4 h-24"
                                placeholder="Breve descrição do prato para dar fome!"
                                multiline textAlignVertical="top"
                                value={description} onChangeText={setDescription}
                            />

                            <Text className="font-bold text-gray-700 dark:text-white mb-1">Foto do Produto (Automático para .webp)</Text>
                            <View className="mb-4">
                                {imageUrl ? (
                                    <View className="relative h-40 w-full rounded-xl overflow-hidden mb-2 border border-gray-200 dark:border-gray-700">
                                        <Image source={{ uri: imageUrl }} className="w-full h-full bg-gray-100" />
                                        <TouchableOpacity
                                            onPress={() => setImageUrl('')}
                                            className="absolute top-2 right-2 bg-black/60 p-2 rounded-full"
                                        >
                                            <Trash2 size={16} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View className="h-40 w-full rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 items-center justify-center bg-gray-50 dark:bg-gray-900 mb-2">
                                        <ImageIcon size={32} color="#9CA3AF" />
                                        <Text className="text-gray-400 dark:text-gray-500 mt-2 font-medium">Nenhuma foto selecionada</Text>
                                    </View>
                                )}

                                <View className="flex-row gap-2">
                                    <TouchableOpacity
                                        onPress={() => pickImage(false)}
                                        className="flex-1 flex-row items-center justify-center py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
                                    >
                                        <ImageIcon size={20} color="#8B5CF6" />
                                        <Text className="ml-2 font-bold text-gray-700 dark:text-white">Galeria</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => pickImage(true)}
                                        className="flex-1 flex-row items-center justify-center py-3 bg-white dark:bg-gray-800 border border-violet-200 rounded-xl"
                                    >
                                        <Camera size={20} color="#8B5CF6" />
                                        <Text className="ml-2 font-bold text-gray-700 dark:text-white">Tirar Foto</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View className="flex-row items-center justify-between bg-orange-50 p-4 rounded-xl border border-orange-100 mb-8">
                                <View>
                                    <Text className="font-bold text-orange-900">Destaque: Oferta do Dia?</Text>
                                    <Text className="text-orange-700 text-xs mt-1">Isso joga o produto para o topo da tela inicial.</Text>
                                </View>
                                <Switch
                                    value={isOffer}
                                    onValueChange={setIsOffer}
                                    trackColor={{ false: "#d1d5db", true: "#f97316" }}
                                    thumbColor="white"
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleSaveProduct} disabled={saving}
                                className={`py-4 rounded-xl flex-row justify-center items-center shadow-md mb-2 ${saving ? 'bg-violet-400 shadow-violet-400/30' : 'bg-violet-600 shadow-violet-600/30'}`}
                            >
                                {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">{editingProductId ? 'Salvar Alterações' : 'Adicionar Produto'}</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* MODAL DE CATEGORIAS */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={catModalVisible}
                onRequestClose={() => setCatModalVisible(false)}
            >
                <View className="flex-1 justify-center bg-black/50 px-5">
                    <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-h-[80%]">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900 dark:text-white">Categorias</Text>
                            <TouchableOpacity onPress={() => setCatModalVisible(false)} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full">
                                <X size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="mb-6 border border-gray-100 dark:border-gray-800 rounded-xl max-h-48" showsVerticalScrollIndicator={true}>
                            {categories.map((c, index) => (
                                <View key={c.id} className={`flex-row justify-between items-center p-4 ${index !== categories.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}>
                                    <View className="flex-row items-center mr-3">
                                        <TouchableOpacity onPress={() => handleMoveCategory(index, 'up')} disabled={index === 0} className={`p-1 ${index === 0 ? 'opacity-30' : ''}`}>
                                            <ChevronUp size={20} color="#6B7280" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleMoveCategory(index, 'down')} disabled={index === categories.length - 1} className={`p-1 ${index === categories.length - 1 ? 'opacity-30' : ''}`}>
                                            <ChevronDown size={20} color="#6B7280" />
                                        </TouchableOpacity>
                                    </View>
                                    <View className="flex-1 mr-2">
                                        <Text className="font-bold text-gray-800 dark:text-white text-base">{c.name}</Text>
                                    </View>
                                    <View className="flex-row items-center space-x-2">
                                        <TouchableOpacity onPress={() => handleEditCategory(c)} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-full mr-2">
                                            <Pencil size={18} color="#6B7280" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteCategory(c.id, c.name)} className="p-2 bg-red-50 rounded-full">
                                            <Trash2 size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                            {categories.length === 0 && (
                                <View className="p-4 items-center">
                                    <Text className="text-gray-400 dark:text-gray-400">Nenhuma categoria cadastrada.</Text>
                                </View>
                            )}
                        </ScrollView>

                        <View className="flex-row justify-between items-center mb-1">
                            <Text className="font-bold text-gray-700 dark:text-white">{editingCatId ? "Editando Categoria" : "Nova Categoria"}</Text>
                            {editingCatId && (
                                <TouchableOpacity onPress={() => { setEditingCatId(null); setNewCatName(''); }}>
                                    <Text className="text-violet-600 text-xs font-bold">Cancelar Edição</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <View className="flex-row gap-2">
                            <TextInput
                                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white"
                                placeholder="Ex: Pizzas"
                                value={newCatName} onChangeText={setNewCatName}
                            />
                            <TouchableOpacity
                                onPress={handleSaveCategory}
                                disabled={savingCat || !newCatName.trim()}
                                className={`px-4 justify-center items-center rounded-xl bg-violet-600 opacity-${!newCatName.trim() ? '50' : '100'}`}
                            >
                                {savingCat ? <ActivityIndicator color="white" size="small" /> : (editingCatId ? <Pencil size={20} color="white" /> : <Plus size={24} color="white" />)}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
