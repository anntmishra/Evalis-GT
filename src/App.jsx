import { useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import StudentList from './components/StudentList';
import BatchList from './components/BatchList';
import TeacherList from './components/TeacherList';
import SubjectList from './components/SubjectList';

// Placeholder components - these would be replaced with real components
const StudentDashboard = () => <div className="p-4"><h1 className="text-2xl font-bold">Student Dashboard</h1></div>;
const TeacherDashboard = () => <div className="p-4"><h1 className="text-2xl font-bold">Teacher Dashboard</h1></div>;

// Admin Dashboard with tabs
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('students');
  
  // Tab content components
  const BatchesTab = () => (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Batch Management</h2>
      <BatchList />
    </div>
  );
  
  const SubjectsTab = () => (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Subject Management</h2>
      <SubjectList />
    </div>
  );
  
  const TeachersTab = () => (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Teacher Management</h2>
      <TeacherList />
    </div>
  );
  
  const StudentsTab = () => (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Student Management</h2>
      <StudentList />
    </div>
  );
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-3 py-2 font-medium text-sm ${activeTab === 'students' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Students
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-3 py-2 font-medium text-sm ${activeTab === 'teachers' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Teachers
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-3 py-2 font-medium text-sm ${activeTab === 'subjects' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Subjects
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`px-3 py-2 font-medium text-sm ${activeTab === 'batches' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Batches
          </button>
        </nav>
      </div>
      
      {/* Tab content */}
      {activeTab === 'students' && <StudentsTab />}
      {activeTab === 'teachers' && <TeachersTab />}
      {activeTab === 'subjects' && <SubjectsTab />}
      {activeTab === 'batches' && <BatchesTab />}
    </div>
  );
};

function App() {
  const { currentUser, isStudent, isTeacher, isAdmin } = useAuth();
  const location = useLocation();
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Determine which routes to render based on user role
  let routesToRender;
  
  if (isStudent) {
    routesToRender = (
      <Routes>
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    );
  } else if (isTeacher) {
    routesToRender = (
      <Routes>
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    );
  } else if (isAdmin) {
    routesToRender = (
      <Routes>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    );
  } else {
    // Default - should never reach here due to protected routes
    routesToRender = <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Evalis</h1>
          <div>
            <span className="mr-4">{currentUser.name || currentUser.username}</span>
            <button 
              onClick={() => useAuth().logout()}
              className="text-sm bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {routesToRender}
      </main>
    </div>
  );
}

export default App; 