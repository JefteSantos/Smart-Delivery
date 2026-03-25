import { useCartStore, Product } from './cartStore';

// Produto mock para testes
const burgerMock: Product = {
    id: 'p1',
    name: 'X-Burger',
    description: 'Pão, carne e queijo',
    price: 15.00,
    imageUrl: 'mock.jpg'
};

const friesMock: Product = {
    id: 'p2',
    name: 'Batata Frita',
    description: 'Porção Média',
    price: 10.00,
    imageUrl: 'mock2.jpg'
};

describe('Lógica do Carrinho (cartStore.ts)', () => {
    
    // Limpa o carrinho antes de cada teste para evitar que um teste suje o outro
    beforeEach(() => {
        useCartStore.getState().clearCart();
    });

    it('deve adicionar um novo produto com quantidade 1', () => {
        const store = useCartStore.getState();
        store.addItem(burgerMock);

        const updatedState = useCartStore.getState();
        expect(updatedState.items.length).toBe(1);
        expect(updatedState.items[0].id).toBe('p1');
        expect(updatedState.items[0].quantity).toBe(1);
    });

    it('deve somar a quantidade do mesmo produto ao adicioná-lo de novo', () => {
        const store = useCartStore.getState();
        store.addItem(burgerMock);
        store.addItem(burgerMock); // Adicionando de novo

        const updatedState = useCartStore.getState();
        expect(updatedState.items.length).toBe(1); // Continua tendo apenas uma entrada no carrinho
        expect(updatedState.items[0].quantity).toBe(2); // Quantidade vira 2
    });

    it('deve reduzir a quantidade de um produto caso ele tenha mais que 1', () => {
        const store = useCartStore.getState();
        store.addItem(burgerMock);
        store.addItem(burgerMock);
        
        // Remove 1
        store.removeItem(burgerMock.id);

        const updatedState = useCartStore.getState();
        expect(updatedState.items.length).toBe(1);
        expect(updatedState.items[0].quantity).toBe(1); // Caiu para 1
    });

    it('deve remover fisicamente o produto se a quantidade chegar a zero', () => {
        const store = useCartStore.getState();
        store.addItem(burgerMock);
        store.removeItem(burgerMock.id); // Remove o único que tem

        const updatedState = useCartStore.getState();
        expect(updatedState.items.length).toBe(0); // Carrinho ficou vazio
    });

    it('deve calcular o valor total com extrema exatidão', () => {
        const store = useCartStore.getState();
        
        // (15.00 * 2) = 30.00
        store.addItem(burgerMock);
        store.addItem(burgerMock);
        
        // (10.00 * 1) = 10.00
        store.addItem(friesMock);

        // Preço final deve ser R$ 40,00
        expect(useCartStore.getState().getTotalPrice()).toBe(40.00);
    });

    it('deve esvaziar o carrinho instantaneamente no clearCart()', () => {
        const store = useCartStore.getState();
        store.addItem(burgerMock);
        store.addItem(friesMock);
        
        expect(useCartStore.getState().items.length).toBe(2);

        // Limpa!
        useCartStore.getState().clearCart();
        expect(useCartStore.getState().items.length).toBe(0);
        expect(useCartStore.getState().getTotalPrice()).toBe(0.00);
    });
});
