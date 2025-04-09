import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Table, 
  Button, 
  Spinner, 
  Alert, 
  Modal, 
  Form,
  Badge
} from 'react-bootstrap';
import { FaSort, FaSortUp, FaSortDown, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { getBatches, createBatch, updateBatch, deleteBatch, getBatchStudents } from '../api';
import EditBatch from './EditBatch';
import * as XLSX from 'xlsx';
import axios from 'axios';

const BatchList = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(null);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    startYear: '',
    endYear: '',
    active: true
  });
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch batches when component mounts
  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getBatches();
      setBatches(response.data);
    } catch (err) {
      console.error('Error fetching batches:', err);
      setError('Failed to load batches. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchStudents = async (batchId) => {
    try {
      setStudentsLoading(true);
      const response = await getBatchStudents(batchId);
      setStudents(response.data);
    } catch (err) {
      console.error('Error fetching students for batch:', err);
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedBatches = [...batches].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Render sort icon
  const renderSortIcon = (field) => {
    if (sortField !== field) return <FaSort />;
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  // Form handling
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Add batch handlers
  const handleShowAddModal = () => {
    setFormData({
      name: '',
      department: '',
      startYear: new Date().getFullYear(),
      endYear: new Date().getFullYear() + 4,
      active: true
    });
    setShowAddModal(true);
  };

  const handleAddBatch = async () => {
    try {
      setLoading(true);
      await createBatch(formData);
      await fetchBatches();
      setShowAddModal(false);
      setError(null);
    } catch (err) {
      console.error('Error adding batch:', err);
      setError('Failed to add batch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Edit batch handlers
  const handleShowEditModal = (batch) => {
    setCurrentBatch(batch);
    setFormData({
      name: batch.name,
      department: batch.department,
      startYear: batch.startYear,
      endYear: batch.endYear,
      active: batch.active
    });
    setShowEditModal(true);
  };

  const handleEditBatch = async () => {
    try {
      setLoading(true);
      await updateBatch(currentBatch._id, formData);
      await fetchBatches();
      setShowEditModal(false);
      setError(null);
    } catch (err) {
      console.error('Error updating batch:', err);
      setError('Failed to update batch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete batch handlers
  const handleShowDeleteModal = (batch) => {
    setCurrentBatch(batch);
    setShowDeleteModal(true);
  };

  const handleDeleteBatch = async () => {
    try {
      setLoading(true);
      await deleteBatch(currentBatch._id);
      await fetchBatches();
      setShowDeleteModal(false);
      setError(null);
    } catch (err) {
      console.error('Error deleting batch:', err);
      setError('Failed to delete batch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudents = (batch) => {
    setSelectedBatch(batch);
    fetchBatchStudents(batch.id);
  };

  const handleExcelImport = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedBatch) return;

    try {
      setImportLoading(true);
      setImportError(null);
      setImportSuccess(false);

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          // Read the Excel file
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Process data and send to server
          const formData = new FormData();
          formData.append('file', file);
          formData.append('batchId', selectedBatch.id);

          // Use axios directly for multipart form data
          const response = await axios.post(
            'http://localhost:5000/api/students/import-excel', 
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
              }
            }
          );

          // Refresh students list
          fetchBatchStudents(selectedBatch.id);
          setImportSuccess(true);
        } catch (err) {
          console.error('Error processing Excel file:', err);
          setImportError('Failed to process Excel file. Please check the file format.');
        } finally {
          setImportLoading(false);
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('Error importing Excel file:', err);
      setImportError('Failed to import Excel file. Please try again.');
      setImportLoading(false);
    }
    
    // Clear the file input
    e.target.value = null;
  };

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Batches</h2>
        <Button variant="primary" onClick={handleShowAddModal}>
          <FaPlus className="me-2" /> Add Batch
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading && !batches.length ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <Table responsive striped hover>
          <thead>
            <tr>
              <th onClick={() => handleSort('_id')} style={{ cursor: 'pointer' }}>
                ID {renderSortIcon('_id')}
              </th>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                Name {renderSortIcon('name')}
              </th>
              <th onClick={() => handleSort('department')} style={{ cursor: 'pointer' }}>
                Department {renderSortIcon('department')}
              </th>
              <th onClick={() => handleSort('startYear')} style={{ cursor: 'pointer' }}>
                Start Year {renderSortIcon('startYear')}
              </th>
              <th onClick={() => handleSort('endYear')} style={{ cursor: 'pointer' }}>
                End Year {renderSortIcon('endYear')}
              </th>
              <th onClick={() => handleSort('active')} style={{ cursor: 'pointer' }}>
                Status {renderSortIcon('active')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedBatches.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center">No batches found</td>
              </tr>
            ) : (
              sortedBatches.map((batch) => (
                <tr key={batch._id}>
                  <td>{batch._id}</td>
                  <td>{batch.name}</td>
                  <td>{batch.department}</td>
                  <td>{batch.startYear}</td>
                  <td>{batch.endYear}</td>
                  <td>
                    <Badge bg={batch.active ? 'success' : 'secondary'}>
                      {batch.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      className="me-2"
                      onClick={() => handleShowEditModal(batch)}
                    >
                      <FaEdit />
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => handleShowDeleteModal(batch)}
                    >
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}

      {/* Add Batch Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Batch</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Batch Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., BTech 2022-26"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Department</Form.Label>
              <Form.Control
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                placeholder="e.g., Computer Science"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Start Year</Form.Label>
              <Form.Control
                type="number"
                name="startYear"
                value={formData.startYear}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>End Year</Form.Label>
              <Form.Control
                type="number"
                name="endYear"
                value={formData.endYear}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="active"
                label="Active"
                checked={formData.active}
                onChange={handleInputChange}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddBatch} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Add Batch'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Batch Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Batch</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Batch Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Department</Form.Label>
              <Form.Control
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Start Year</Form.Label>
              <Form.Control
                type="number"
                name="startYear"
                value={formData.startYear}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>End Year</Form.Label>
              <Form.Control
                type="number"
                name="endYear"
                value={formData.endYear}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="active"
                label="Active"
                checked={formData.active}
                onChange={handleInputChange}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleEditBatch} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the batch "{currentBatch?.name}"? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteBatch} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Students Section */}
      {selectedBatch && (
        <div className="mt-8 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">
              Students in {selectedBatch.name}
              {!studentsLoading && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({students.length} students)
                </span>
              )}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleExcelImport}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm flex items-center"
                disabled={importLoading}
              >
                {importLoading ? 'Importing...' : 'Import from Excel'}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls" 
                className="hidden" 
              />
            </div>
          </div>

          {importSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">Excel data imported successfully!</span>
            </div>
          )}

          {importError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{importError}</span>
            </div>
          )}

          {studentsLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-500">Loading students...</div>
            </div>
          ) : students.length === 0 ? (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">No students found in this batch.</span>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white shadow-md rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.section}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Container>
  );
};

export default BatchList; 