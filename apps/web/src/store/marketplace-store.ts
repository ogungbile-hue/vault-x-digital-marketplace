import { create } from 'zustand';

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
}

export interface CheckoutModalState {
  isOpen: boolean;
  productId: string | null;
  productTitle: string;
  price: bigint;
  availableStock: number;
}

export interface RevealModalState {
  isOpen: boolean;
  orderId: string | null;
  items: Array<{
    stockItemId: string;
    productId: string;
    productTitle: string;
    decryptedPayload: string;
    price: bigint;
  }>;
}

interface MarketplaceStore {
  // Session
  user: UserSession;
  setUserRole: (role: 'USER' | 'ADMIN') => void;

  // Catalog Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategoryId: string | null;
  setSelectedCategoryId: (catId: string | null) => void;
  selectedBadge: string | null;
  setSelectedBadge: (badge: string | null) => void;

  // Modals
  checkoutModal: CheckoutModalState;
  openCheckoutModal: (product: { id: string; title: string; price: bigint; availableStock: number }) => void;
  closeCheckoutModal: () => void;

  revealModal: RevealModalState;
  openRevealModal: (orderId: string, items: any[]) => void;
  closeRevealModal: () => void;

  isTopupModalOpen: boolean;
  setTopupModalOpen: (open: boolean) => void;
}

export const useMarketplaceStore = create<MarketplaceStore>((set) => ({
  // Default test user
  user: {
    userId: 'user-default-buyer',
    email: 'buyer@marketplace.io',
    name: 'Alex Buyer',
    role: 'USER',
  },
  setUserRole: (role) =>
    set((state) => ({
      user: {
        ...state.user,
        role,
        name: role === 'ADMIN' ? 'Admin Operator' : 'Alex Buyer',
        email: role === 'ADMIN' ? 'admin@marketplace.io' : 'buyer@marketplace.io',
      },
    })),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectedCategoryId: null,
  setSelectedCategoryId: (catId) => set({ selectedCategoryId: catId }),
  selectedBadge: null,
  setSelectedBadge: (badge) => set({ selectedBadge: badge }),

  checkoutModal: {
    isOpen: false,
    productId: null,
    productTitle: '',
    price: 0n,
    availableStock: 0,
  },
  openCheckoutModal: (product) =>
    set({
      checkoutModal: {
        isOpen: true,
        productId: product.id,
        productTitle: product.title,
        price: product.price,
        availableStock: product.availableStock,
      },
    }),
  closeCheckoutModal: () =>
    set((state) => ({
      checkoutModal: { ...state.checkoutModal, isOpen: false },
    })),

  revealModal: {
    isOpen: false,
    orderId: null,
    items: [],
  },
  openRevealModal: (orderId, items) =>
    set({
      revealModal: {
        isOpen: true,
        orderId,
        items,
      },
    }),
  closeRevealModal: () =>
    set((state) => ({
      revealModal: { ...state.revealModal, isOpen: false },
    })),

  isTopupModalOpen: false,
  setTopupModalOpen: (open) => set({ isTopupModalOpen: open }),
}));
