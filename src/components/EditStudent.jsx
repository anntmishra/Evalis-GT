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
  const [initialPassword, setInitialPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
      
      let response;
      if (studentId) {
        // Update existing student
        response = await updateStudent(studentId, student);
      } else {
        // Create new student
        response = await createStudent(student);
      }
      
      // Check if initialPassword was returned
      if (response.initialPassword) {
        setInitialPassword(response.initialPassword);
        setShowPassword(true);
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      if (response.initialPassword) {
        // Don't close the modal if we have a password to show
      } else if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error saving student:', err);
      setError(err.response?.data?.message || 'Failed to save student. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(initialPassword);
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

      {/* Password notification if available */}
      {initialPassword && (
        <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-md">
          <h3 className="font-semibold mb-2">Student Created Successfully!</h3>
          <p className="mb-2">An email with login instructions has been sent to {student.email}.</p>
          <div className="flex items-center mt-3 bg-white p-2 rounded border border-green-300">
            <span className="mr-2 font-medium">Password:</span>
            <input 
              type={showPassword ? "text" : "password"} 
              value={initialPassword} 
              readOnly 
              className="flex-grow border-0 focus:ring-0"
            />
            <button 
              onClick={() => setShowPassword(!showPassword)} 
              className="text-blue-600 hover:text-blue-800 px-2"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
            <button 
              onClick={copyToClipboard} 
              className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              Copy
            </button>
          </div>
          <p className="text-xs mt-2">Please keep this password secure.</p>
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
            <p className="mt-1 text-xs text-gray-500">
              {!studentId && "If provided, a login email with credentials will be sent to this address."}
            </p>
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
              placeholder={studentId ? "Leave blank to keep current password" : "Leave blank for auto-generated password"}
            />
            <p className="mt-1 text-xs text-gray-500">
              {studentId 
                ? "Leave blank to keep the current password." 
                : "If left blank, a random password will be generated if email is provided, otherwise the student ID will be used."}
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