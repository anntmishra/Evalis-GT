import axios from 'axios';
import config from '../config/environment';

const API_URL = config.API_ENDPOINTS.BATCHES;

// Get token from storage
const getToken = () => {
  const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
  return token;
};

// Set auth header
const authConfig = () => {
  const token = getToken();
  if (!token) {
    console.warn('No authentication token found');
  }
  
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
  };
};

// Get all batches
export const getAllBatches = async () => {
  try {
    const response = await axios.get(API_URL, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get batch by ID
export const getBatchById = async (id: string) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Create batch
export const createBatch = async (batch: {
  name: string;
  department: string;
  startYear: number;
  endYear: number;
  active?: boolean;
}) => {
  try {
    const response = await axios.post(API_URL, batch, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update batch
export const updateBatch = async (id: string, batch: {
  name: string;
  department: string;
  startYear: number;
  endYear: number;
  active?: boolean;
}) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, batch, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete batch
export const deleteBatch = async (id: string) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Seed batches function
interface SeedResults {
  succeeded: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

export const seedBatches = async (): Promise<SeedResults> => {
  const results: SeedResults = {
    succeeded: 0,
    failed: 0,
    errors: []
  };

  // Import BATCHES here to avoid circular dependencies
  const { BATCHES } = await import('../data/universityData');

  for (const batch of BATCHES) {
    try {
      // Parse years from the batch ID (format: 2023-2027)
      const [startYear, endYear] = batch.id.split('-').map(year => parseInt(year, 10));
      
      const batchData = {
        name: batch.name,
        department: 'BTech', // Default department
        startYear,
        endYear,
        active: true
      };

      await createBatch(batchData);
      results.succeeded++;
    } catch (error: any) {
      // Skip if batch already exists (expected error)
      if (error.response?.data?.message?.includes('already exists')) {
        results.succeeded++;
      } else {
        console.error('Error creating batch:', error.response?.data || error.message);
        results.failed++;
        results.errors.push({
          id: batch.id,
          error: error.response?.data?.message || error.message
        });
      }
    }
  }

  return results;
};

export default {
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  seedBatches
}; 