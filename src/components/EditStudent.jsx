import { useState, useEffect } from 'react';
import { getStudentById, updateStudent, createStudent, getBatches } from '../api';

export default function EditStudent({ studentId, onClose, onSuccess }) {
  const [student, setStudent] = useState({
    id: '',
    name: '',
    section: '',
    batch: '',
    email: '',
    password: '',
  });
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch batches
        const batchesResponse = await getBatches();
        setBatches(batchesResponse.data);
        
        // Fetch student data if editing existing student
        if (studentId) {
          const studentResponse = await getStudentById(studentId);
          setStudent(studentResponse.data);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load student data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStudent(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      if (studentId) {
        // Update existing student
        await updateStudent(studentId, student);
      } else {
        // Create new student
        await createStudent(student);
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error saving student:', err);
      setError(err.response?.data?.message || 'Failed to save student. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-6">
        <div className="text-lg font-medium text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          {studentId ? 'Edit Student' : 'Add New Student'}
        </h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="id" className="block text-sm font-medium text-gray-700">Student ID</label>
            <input
              type="text"
              id="id"
              name="id"
              value={student.id}
              onChange={handleChange}
              required
              disabled={!!studentId} // Disable ID field when editing
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={student.name}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={student.email || ''}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="section" className="block text-sm font-medium text-gray-700">Section</label>
            <input
              type="text"
              id="section"
              name="section"
              value={student.section}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="batch" className="block text-sm font-medium text-gray-700">Batch</label>
            <select
              id="batch"
              name="batch"
              value={student.batch}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select a batch</option>
              {batches.map(batch => (
                <option key={batch.id || batch._id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Password field - shown for both new and editing students */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              {studentId ? 'New Password (optional)' : 'Password'}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={student.password || ''}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder={studentId ? "Leave blank to keep current password" : "Leave blank to use student ID as password"}
              required={!studentId}
            />
            <p className="mt-1 text-xs text-gray-500">
              {studentId 
                ? "Leave blank to keep the current password." 
                : "If left blank, the student ID will be used as the default password."}
            </p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
} 