import { create } from 'zustand';

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    isOfferOfTheDay?: boolean;
}

export interface CartItem extends Product {
    quantity: number;
}

interface CartStore {
    items: CartItem[];
    addItem: (product: Product) => void;
    removeItem: (productId: string) => void;
    clearCart: () => void;
    getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
    items: [],
    addItem: (product) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((item) => item.id === product.id);

        if (existingItem) {
            set({
                items: currentItems.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                ),
            });
        } else {
            set({ items: [...currentItems, { ...product, quantity: 1 }] });
        }
    },
    removeItem: (productId) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((item) => item.id === productId);

        if (existingItem && existingItem.quantity > 1) {
            set({
                items: currentItems.map((item) =>
                    item.id === productId
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                ),
            });
        } else {
            set({ items: currentItems.filter((item) => item.id !== productId) });
        }
    },
    clearCart: () => set({ items: [] }),
    getTotalPrice: () => {
        return get().items.reduce(
            (total, item) => total + item.price * item.quantity,
            0
        );
    },
}));
