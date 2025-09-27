import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Package, 
  TrendingUp, 
  Users, 
  DollarSign,
  Download,
  Filter
} from 'lucide-react';
import { getAllRedemptions, getRedemptionStatusColor } from '../api/merchandiseService';

interface RedemptionStats {
  totalRedemptions: number;
  totalTokensRedeemed: number;
  totalSavingsProvided: number;
  byCategory: {
    [category: string]: {
      count: number;
      tokens: number;
      savings: number;
    };
  };
}

interface Redemption {
  id: string;
  userId: string;
  userRole: string;
  itemId: string;
  itemName: string;
  tokenAmount: string;
  originalPrice: number;
  discountPrice: number;
  discountAmount: number;
  quantity: number;
  redemptionCode: string;
  status: string;
  createdAt: string;
  metadata?: any;
}

const MerchandiseAdminDashboard: React.FC = () => {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [stats, setStats] = useState<RedemptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    dateFrom: '',
    dateTo: '',
    limit: 100
  });

  useEffect(() => {
    loadRedemptions();
  }, [filters]);

  const loadRedemptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getAllRedemptions(filters);
      setRedemptions(data.redemptions || []);
      setStats(data.stats || null);
    } catch (err: any) {
      console.error('Error loading redemptions:', err);
      if (err.response?.status === 403) {
        setError('Admin access required to view redemption data');
      } else {
        setError(err.response?.data?.message || 'Failed to load redemption data');
      }
    } finally {
      setLoading(false);
    }
  };

  const exportRedemptions = () => {
    const csvContent = [
      ['Date', 'User ID', 'Role', 'Item', 'Tokens Spent', 'Original Price', 'Discount Price', 'Savings', 'Status', 'Redemption Code'].join(','),
      ...redemptions.map(r => [
        new Date(r.createdAt).toLocaleDateString(),
        r.userId,
        r.userRole,
        r.itemName,
        r.tokenAmount,
        r.originalPrice,
        r.discountPrice,
        r.discountAmount,
        r.status,
        r.redemptionCode
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redemptions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading redemption data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            Merchandise Store Analytics
          </CardTitle>
          <CardDescription>
            Monitor token redemptions and merchandise performance
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Redemptions</p>
                  <p className="text-2xl font-bold">{stats.totalRedemptions}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tokens Redeemed</p>
                  <p className="text-2xl font-bold">{stats.totalTokensRedeemed.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Student Savings</p>
                  <p className="text-2xl font-bold">${stats.totalSavingsProvided.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Categories</p>
                  <p className="text-2xl font-bold">{Object.keys(stats.byCategory).length}</p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Breakdown */}
      {stats && Object.keys(stats.byCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Redemptions by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats.byCategory).map(([category, data]) => (
                <div key={category} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium capitalize">{category}</h4>
                    <Badge variant="secondary">{data.count}</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>Tokens: {data.tokens.toLocaleString()}</div>
                    <div>Savings: ${data.savings.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-md"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="claimed">Claimed</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-md"
              >
                <option value="">All Categories</option>
                <option value="apparel">Apparel</option>
                <option value="accessories">Accessories</option>
                <option value="stationery">Stationery</option>
                <option value="services">Services</option>
                <option value="academic">Academic</option>
                <option value="events">Events</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-md"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={loadRedemptions} variant="outline" size="sm">
              Apply Filters
            </Button>
            <Button 
              onClick={() => setFilters({ status: '', category: '', dateFrom: '', dateTo: '', limit: 100 })}
              variant="outline" 
              size="sm"
            >
              Clear
            </Button>
            <Button onClick={exportRedemptions} variant="outline" size="sm" className="ml-auto">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Redemptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Redemptions</CardTitle>
          <CardDescription>
            {redemptions.length} redemptions found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">User</th>
                  <th className="text-left py-2">Item</th>
                  <th className="text-left py-2">Tokens</th>
                  <th className="text-left py-2">Savings</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Code</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map(redemption => (
                  <tr key={redemption.id} className="border-b hover:bg-gray-50">
                    <td className="py-2">
                      {new Date(redemption.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      <div>
                        <div className="font-medium">{redemption.userId}</div>
                        <div className="text-sm text-gray-600">{redemption.userRole}</div>
                      </div>
                    </td>
                    <td className="py-2">
                      <div>
                        <div className="font-medium">{redemption.itemName}</div>
                        <div className="text-sm text-gray-600">Qty: {redemption.quantity}</div>
                      </div>
                    </td>
                    <td className="py-2">
                      {redemption.tokenAmount} EVLT
                    </td>
                    <td className="py-2">
                      ${redemption.discountAmount.toFixed(2)}
                    </td>
                    <td className="py-2">
                      <Badge className={getRedemptionStatusColor(redemption.status)}>
                        {redemption.status}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                        {redemption.redemptionCode}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {redemptions.length === 0 && (
              <div className="text-center py-8 text-gray-600">
                No redemptions found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchandiseAdminDashboard;
