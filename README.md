# Evalis - University Grading and Submission Portal

Evalis is a comprehensive university grading and submission portal that provides a platform for students, teachers, and administrators to manage academic activities efficiently.

## Features

- **Student Portal**: View submissions, grades, and academic progress
- **Teacher Portal**: Manage subjects, grade submissions, track student performance
- **Admin Dashboard**: Manage teachers, subjects, batches, and student data
- **Excel Import**: Import student data easily from Excel files
- **MongoDB Database**: Secure storage of all academic data

## Prerequisites

- Node.js (v18.x or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/anantmishra/evalis.git
   cd evalis
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   NODE_ENV=development
   PORT=5000
   ```

## Database Setup

1. Create a MongoDB database (local or MongoDB Atlas)
2. Update the `.env` file with your MongoDB connection string
3. Seed the database with initial data:
   ```bash
   npm run data:import
   ```

## Running the Application

### Development Mode

1. Start the backend server:
   ```bash
   npm run server:dev
   ```

2. In a separate terminal, start the frontend development server:
   ```bash
   npm run dev
   ```

### Production Mode

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm run server
   ```

## API Endpoints

### Authentication
- `POST /api/auth/student/login` - Student login
- `POST /api/auth/teacher/login` - Teacher login
- `POST /api/auth/admin/login` - Admin login
- `GET /api/auth/profile` - Get user profile

### Students
- `GET /api/students` - Get all students (Admin only)
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create a new student (Admin only)
- `PUT /api/students/:id` - Update student (Admin only)
- `DELETE /api/students/:id` - Delete student (Admin only)
- `GET /api/students/:id/submissions` - Get student submissions
- `POST /api/students/import` - Import students from Excel (Admin only)

### Teachers
- `GET /api/teachers` - Get all teachers (Admin only)
- `GET /api/teachers/:id` - Get teacher by ID (Admin only)
- `POST /api/teachers` - Create a new teacher (Admin only)
- `PUT /api/teachers/:id` - Update teacher (Admin only)
- `DELETE /api/teachers/:id` - Delete teacher (Admin only)
- `POST /api/teachers/:id/subjects` - Assign subject to teacher (Admin only)
- `DELETE /api/teachers/:id/subjects/:subjectId` - Remove subject from teacher (Admin only)

### Subjects
- `GET /api/subjects` - Get all subjects
- `GET /api/subjects/:id` - Get subject by ID
- `POST /api/subjects` - Create a new subject (Admin only)
- `PUT /api/subjects/:id` - Update subject (Admin only)
- `DELETE /api/subjects/:id` - Delete subject (Admin only)

### Batches
- `GET /api/batches` - Get all batches
- `GET /api/batches/:id` - Get batch by ID
- `POST /api/batches` - Create a new batch (Admin only)
- `PUT /api/batches/:id` - Update batch (Admin only)
- `DELETE /api/batches/:id` - Delete batch (Admin only)
- `GET /api/batches/:id/students` - Get students in a batch

## Demo Credentials

### Student Login
- ID: E23CSE001
- Password: anant123

### Teacher Login
- ID: T001
- Password: smith123

### Admin Login
- Username: admin
- Password: admin123

## License

This project is licensed under the ISC License.
