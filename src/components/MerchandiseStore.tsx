import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  ShoppingCart, 
  Coins, 
  Gift, 
  Star, 
  Clock, 
  CheckCircle,
  Package,
  GraduationCap,
  Car,
  BookOpen
} from 'lucide-react';
import axios from 'axios';
import config from '../config/environment';
import { getAuthConfig } from '../api/authUtils';

interface MerchandiseItem {
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

interface RedemptionProfile {
  user: {
    id: string;
    name: string;
    walletAddress: string;
  };
  tokenBalance: string;
  balanceFormatted: string;
  totalTokensSpent: number;
  redemptionHistory: any[];
}

const MerchandiseStore: React.FC = () => {
  const [catalog, setCatalog] = useState<MerchandiseItem[]>([]);
  const [profile, setProfile] = useState<RedemptionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const categories = [
    { id: 'all', name: 'All Items', icon: Package },
    { id: 'apparel', name: 'Apparel', icon: Gift },
    { id: 'accessories', name: 'Accessories', icon: Star },
    { id: 'stationery', name: 'Stationery', icon: BookOpen },
    { id: 'services', name: 'Services', icon: CheckCircle },
    { id: 'academic', name: 'Academic', icon: GraduationCap },
    { id: 'events', name: 'Events', icon: Car }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load catalog and profile in parallel
      const [catalogRes, profileRes] = await Promise.all([
        axios.get(`${config.API_BASE_URL}/merchandise/catalog`),
        axios.get(`${config.API_BASE_URL}/merchandise/profile`, getAuthConfig())
      ]);

      setCatalog(catalogRes.data.catalog || []);
      setProfile(profileRes.data);
    } catch (err: any) {
      console.error('Error loading merchandise data:', err);
      if (err.response?.status === 401) {
        setError('Please log in to access the merchandise store');
      } else if (err.response?.status === 400 && err.response?.data?.message?.includes('wallet')) {
        setError('Please link your wallet first to use token features');
      } else {
        setError(err.response?.data?.message || 'Failed to load merchandise store');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (item: MerchandiseItem) => {
    if (!profile) {
      setError('Please link your wallet first');
      return;
    }

    const currentBalance = parseFloat(profile.balanceFormatted);
    if (currentBalance < item.tokenCost) {
      setError(`Insufficient tokens. You need ${item.tokenCost} EVLT but only have ${currentBalance.toFixed(2)} EVLT`);
      return;
    }

    if (!item.inStock) {
      setError('This item is currently out of stock');
      return;
    }

    const confirmMessage = `Redeem ${item.tokenCost} EVLT tokens for ${item.name}?\n\nYou'll pay $${item.discountPrice} instead of $${item.originalPrice} (Save $${item.originalPrice - item.discountPrice})`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setRedeeming(item.id);
      
      const response = await axios.post(
        `${config.API_BASE_URL}/merchandise/redeem`,
        { itemId: item.id, quantity: 1 },
        getAuthConfig()
      );

      alert(`Redemption successful!\n\nRedemption Code: ${response.data.redemption.redemptionCode}\n\n${response.data.redemption.instructions}`);
      
      // Reload data to update balances
      await loadData();
      
    } catch (err: any) {
      console.error('Redemption error:', err);
      setError(err.response?.data?.message || 'Redemption failed');
    } finally {
      setRedeeming(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(c => c.id === category);
    const Icon = categoryData?.icon || Package;
    return <Icon className="h-4 w-4" />;
  };

  const filteredCatalog = selectedCategory === 'all' 
    ? catalog 
    : catalog.filter(item => item.category === selectedCategory);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading merchandise store...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Token Balance */}
      <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            College Merchandise Store
          </CardTitle>
          <CardDescription>
            Redeem your EVLT tokens for exclusive college merchandise and service discounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-yellow-600" />
                  <span className="font-semibold">{parseFloat(profile.balanceFormatted).toFixed(2)} EVLT</span>
                </div>
                <div className="text-sm text-gray-600">
                  Total Spent: {profile.totalTokensSpent} EVLT
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Wallet: {profile.user.walletAddress.slice(0, 6)}...{profile.user.walletAddress.slice(-4)}
              </div>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                Please link your wallet to view your token balance and make redemptions.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => setError(null)}
              className="ml-2 p-0 h-auto text-red-600"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
            className="flex items-center gap-2"
          >
            <category.icon className="h-4 w-4" />
            {category.name}
          </Button>
        ))}
      </div>

      {/* Merchandise Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCatalog.map(item => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              {getCategoryIcon(item.category)}
              <span className="ml-2 text-sm text-gray-600">{item.category}</span>
            </div>
            
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>

                {/* Pricing */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-green-600">
                        ${item.discountPrice}
                      </span>
                      <span className="text-sm text-gray-500 line-through">
                        ${item.originalPrice}
                      </span>
                    </div>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      Save ${item.originalPrice - item.discountPrice}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium">{item.tokenCost} EVLT tokens</span>
                  </div>
                </div>

                {/* Stock Status */}
                {item.maxRedemptions && (
                  <div className="text-xs text-gray-600">
                    {item.inStock ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {item.remainingStock} remaining
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-red-500" />
                        Out of stock
                      </span>
                    )}
                  </div>
                )}

                {/* Redeem Button */}
                <Button
                  onClick={() => handleRedeem(item)}
                  disabled={
                    !profile || 
                    !item.available || 
                    !item.inStock ||
                    parseFloat(profile.balanceFormatted) < item.tokenCost ||
                    redeeming === item.id
                  }
                  className="w-full"
                  variant={item.inStock ? "default" : "secondary"}
                >
                  {redeeming === item.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Redeeming...
                    </>
                  ) : !item.available ? (
                    'Unavailable'
                  ) : !item.inStock ? (
                    'Out of Stock'
                  ) : !profile ? (
                    'Link Wallet First'
                  ) : parseFloat(profile.balanceFormatted) < item.tokenCost ? (
                    `Need ${item.tokenCost - parseFloat(profile.balanceFormatted)} more EVLT`
                  ) : (
                    `Redeem for ${item.tokenCost} EVLT`
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCatalog.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No items found in this category</p>
          </CardContent>
        </Card>
      )}

      {/* Redemption History */}
      {profile && profile.redemptionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Redemptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profile.redemptionHistory.slice(0, 5).map(redemption => (
                <div key={redemption.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{redemption.itemName}</div>
                    <div className="text-sm text-gray-600">
                      {redemption.tokenAmount} EVLT • {new Date(redemption.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant={redemption.status === 'completed' ? 'default' : 'secondary'}>
                    {redemption.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MerchandiseStore;
