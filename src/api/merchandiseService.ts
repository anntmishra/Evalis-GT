import axios from 'axios';
import config from '../config/environment';
import { getAuthConfig } from './authUtils';

const API_URL = `${config.API_BASE_URL}/merchandise`;

export interface MerchandiseItem {
  id: string;
  name: string;
  description: string;
  category: string;
  originalPrice: number;
  discountPrice: number;
  tokenCost: number;
  image: string;
  available: boolean;
  maxRedemptions?: number;
  redemptionCount?: number;
  remainingStock?: number;
  inStock: boolean;
}

export interface RedemptionProfile {
  user: {
    id: string;
    name: string;
    walletAddress: string;
  };
  tokenBalance: string;
  balanceFormatted: string;
  totalTokensSpent: number;
  redemptionHistory: RedemptionHistoryItem[];
}

export interface RedemptionHistoryItem {
  id: string;
  itemId: string;
  itemName: string;
  tokenAmount: string;
  discountAmount: number;
  status: 'pending' | 'completed' | 'claimed' | 'expired' | 'cancelled';
  redemptionCode: string;
  createdAt: string;
}

export interface RedemptionResult {
  message: string;
  redemption: {
    id: string;
    redemptionCode: string;
    item: {
      name: string;
      description: string;
      category: string;
    };
    pricing: {
      originalPrice: number;
      discountPrice: number;
      savings: number;
      tokensSpent: number;
    };
    quantity: number;
    instructions: string;
  };
}

// Get merchandise catalog
export const getMerchandiseCatalog = async (category?: string, available?: boolean): Promise<{
  catalog: MerchandiseItem[];
  categories: string[];
}> => {
  try {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (available !== undefined) params.append('available', available.toString());

    const response = await axios.get(`${API_URL}/catalog?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching merchandise catalog:', error);
    throw error;
  }
};

// Get user's redemption profile (token balance + history)
export const getRedemptionProfile = async (): Promise<RedemptionProfile> => {
  try {
    const response = await axios.get(`${API_URL}/profile`, getAuthConfig());
    return response.data;
  } catch (error: any) {
    console.error('Error fetching redemption profile:', error);
    throw error;
  }
};

// Redeem tokens for merchandise/discount
export const redeemTokens = async (itemId: string, quantity: number = 1): Promise<RedemptionResult> => {
  try {
    const response = await axios.post(
      `${API_URL}/redeem`,
      { itemId, quantity },
      getAuthConfig()
    );
    return response.data;
  } catch (error: any) {
    console.error('Error redeeming tokens:', error);
    throw error;
  }
};

// Get all redemptions (admin only)
export const getAllRedemptions = async (filters?: {
  status?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}) => {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await axios.get(`${API_URL}/admin/redemptions?${params.toString()}`, getAuthConfig());
    return response.data;
  } catch (error: any) {
    console.error('Error fetching all redemptions:', error);
    throw error;
  }
};

// Utility functions for merchandise management
export const calculateSavings = (originalPrice: number, discountPrice: number): number => {
  return originalPrice - discountPrice;
};

export const calculateSavingsPercentage = (originalPrice: number, discountPrice: number): number => {
  return Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
};

export const formatTokenAmount = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(2);
};

export const getCategoryDisplayName = (category: string): string => {
  const categoryMap: { [key: string]: string } = {
    'apparel': 'Apparel & Clothing',
    'accessories': 'Accessories',
    'stationery': 'Stationery & Supplies',
    'services': 'Campus Services',
    'academic': 'Academic Resources',
    'events': 'Events & Activities'
  };
  return categoryMap[category] || category;
};

export const getRedemptionStatusColor = (status: string): string => {
  const statusColors: { [key: string]: string } = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-green-100 text-green-800',
    'claimed': 'bg-blue-100 text-blue-800',
    'expired': 'bg-red-100 text-red-800',
    'cancelled': 'bg-gray-100 text-gray-800'
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};
