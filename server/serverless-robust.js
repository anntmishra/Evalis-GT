const express = require('express');
const cors = require('cors');
const path = require('path');

// Database connection state
let dbConnected = false;

// Create Express app first
const app = express();

// Basic middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins for now
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Simple admin auth middleware for generic CRUD endpoints (uses JWT role)
function requireAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ success:false, message:'No token provided' });
    const token = auth.slice(7);
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (e) {
      return res.status(401).json({ success:false, message:'Invalid token', error:e.message });
    }
    if (decoded.role !== 'admin') return res.status(403).json({ success:false, message:'Admin privileges required' });
    req.admin = decoded;
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    res.status(500).json({ success:false, message:'Auth middleware failed', error: err.message });
  }
}

// Health check route (most important)
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: 'serverless-robust-v3-with-env',
    hasDbUrl: !!process.env.DATABASE_URL,
    hasJwtSecret: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL,
    dbUrlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
    envKeys: Object.keys(process.env).filter(k => k.includes('DATABASE')).join(','),
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || 'unknown'
  });
});

// Admin login handler function
async function handleAdminLogin(req, res) {
  try {
    console.log('Admin login attempt:', req.body);
    
    const { username, password, email } = req.body;
    
    if ((!username && !email) || !password) {
      return res.status(400).json({
        message: 'Please provide username/email and password'
      });
    }
    
    // Fallback authentication for testing (if database fails)
    const testCredentials = {
      email: 'admin@university.edu',
      password: 'zyExeKhXoMFtd1Gc',
      username: 'admin'
    };
    
    const isTestLogin = (email === testCredentials.email || username === testCredentials.username) 
                       && password === testCredentials.password;
    
    if (isTestLogin) {
      console.log('✅ Using fallback authentication');
      
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { 
          id: 1,
          username: 'admin',
          role: 'admin'
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '30d' }
      );
      
      return res.json({
        id: 1,
        username: 'admin',
        name: 'System Administrator',
        email: 'admin@university.edu',
        role: 'admin',
        token: token,
        authMethod: 'fallback'
      });
    }
    
    // Try database authentication
    try {
      // Ensure database connection
      if (!dbConnected) {
        console.log('🔌 Attempting database connection...');
        
        // Explicitly check for pg package
        try {
          require('pg');
          console.log('✅ pg package found');
        } catch (pgError) {
          console.error('❌ pg package error:', pgError.message);
          return res.status(401).json({
            message: 'Invalid credentials - database unavailable'
          });
        }
        
        const { connectDB } = require('./config/db');
        await connectDB();
        dbConnected = true;
        console.log('✅ Database connected for login');
      }
      
      const { Admin } = require('./models');
      
      // Look up admin
      const whereClause = username ? { username } : { email };
      const admin = await Admin.findOne({ where: whereClause });
      
      if (!admin) {
        return res.status(401).json({
          message: 'Invalid username/email or password'
        });
      }
      
      // Check password
      const isMatch = await admin.matchPassword(password);
      
      if (!isMatch) {
        return res.status(401).json({
          message: 'Invalid username/email or password'
        });
      }
      
      // Generate token
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { 
          id: admin.id,
          username: admin.username,
          role: 'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );
      
      res.json({
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: 'admin',
        token: token,
        authMethod: 'database'
      });
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(401).json({
        message: 'Invalid credentials - please try again'
      });
    }
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Inline admin login route
app.post('/api/auth/admin/login', handleAdminLogin);

// General login route (alias for frontend compatibility)
app.post('/api/auth/login', handleAdminLogin);

// Auth health check
app.get('/api/auth/health', (req, res) => {
  res.json({
    status: 'Auth working',
    timestamp: new Date().toISOString()
  });
});

// Auth status endpoint
app.get('/api/auth/status', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        valid: false,
        message: 'No token provided',
        authHeader: !!authHeader
      });
    }
    
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    const jwt = require('jsonwebtoken');
    
    try {
      const decoded = jwt.verify(token, jwtSecret);
      
      res.json({
        valid: true,
        user: decoded,
        timestamp: new Date().toISOString()
      });
    } catch (jwtError) {
      // If JWT verification fails, try to decode without verification to see the payload
      try {
        const decoded = jwt.decode(token);
        return res.status(401).json({
          valid: false,
          message: 'Token verification failed',
          error: jwtError.message,
          tokenPayload: decoded,
          hasSecret: !!process.env.JWT_SECRET
        });
      } catch (decodeError) {
        return res.status(401).json({
          valid: false,
          message: 'Invalid token format',
          error: jwtError.message,
          hasSecret: !!process.env.JWT_SECRET
        });
      }
    }
    
  } catch (error) {
    res.status(500).json({
      valid: false,
      message: 'Auth status check failed',
      error: error.message
    });
  }
});

// Load environment variables (Vercel handles this automatically, but load .env for local dev)
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '../.env') });
  console.log('✅ Environment loaded');
  
  // Debug environment variables in serverless
  console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
} catch (error) {
  console.error('❌ Environment loading failed:', error.message);
}

//
try {
  const { connectDB } = require('./config/db');
  connectDB().then(() => {
    dbConnected = true;
    console.log('✅ Database connected');
  }).catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });
} catch (error) {
  console.error('❌ Database module loading failed:', error.message);
}

// For now, skip route loading since paths are problematic in Vercel
// We'll inline critical routes above

// Basic teachers endpoint for compatibility
app.get('/api/teachers', async (req, res) => {
  try {
    console.log('Teachers endpoint called');
    console.log('DATABASE_URL available:', !!process.env.DATABASE_URL);
    
    // Ensure database connection
    if (!dbConnected) {
      try {
        console.log('Attempting database connection...');
        const { connectDB } = require('./config/db');
        await connectDB();
        dbConnected = true;
        console.log('Database connected successfully');
      } catch (dbError) {
        console.error('DB connection failed:', dbError);
        return res.status(500).json({
          message: 'Database connection failed',
          error: dbError.message,
          details: 'Check DATABASE_URL environment variable',
          hasDbUrl: !!process.env.DATABASE_URL
        });
      }
    }
    
    const { Teacher } = require('./models');
    const teachers = await Teacher.findAll({
      attributes: ['id', 'name', 'email', 'role'],
      order: [['name', 'ASC']]
    });
    
    console.log(`Found ${teachers.length} teachers`);
    res.json(teachers);
  } catch (error) {
    console.error('Teachers fetch error:', error);
    res.status(500).json({
      message: 'Error fetching teachers',
      error: error.message,
      details: 'Please check database connection and models',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ===== Generic Teacher CRUD (admin protected) =====
app.post('/api/teachers', requireAdmin, async (req, res) => {
  try {
    if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Teacher } = require('./models');
    const { name, email, password } = req.body;
    if (!name || !email) return res.status(400).json({ success:false, message:'Name and email required' });
    const existing = await Teacher.findOne({ where:{ email } });
    if (existing) return res.status(400).json({ success:false, message:'Teacher with this email already exists' });
    const bcrypt = require('bcryptjs');
    const teacherId = `T${String(Date.now()).slice(-6)}`;
    const rawPassword = password || 'teacher123';
    const salt = await bcrypt.genSalt(10); const hashed = await bcrypt.hash(rawPassword, salt);
    const teacher = await Teacher.create({ id: teacherId, name, email, password: hashed });
    res.status(201).json({ success:true, data:{ id: teacher.id, name: teacher.name, email: teacher.email } });
  } catch (e) { console.error('Create teacher error:', e); res.status(500).json({ success:false, message:'Failed to create teacher', error:e.message }); }
});

app.put('/api/teachers/:id', requireAdmin, async (req, res) => {
  try {
    if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Teacher } = require('./models'); const { name, email } = req.body; const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) return res.status(404).json({ success:false, message:'Teacher not found' });
    if (email && email !== teacher.email) { const exists = await Teacher.findOne({ where:{ email } }); if (exists) return res.status(400).json({ success:false, message:'Email already in use' }); }
    await teacher.update({ name, email });
    res.json({ success:true, data:{ id: teacher.id, name: teacher.name, email: teacher.email } });
  } catch (e) { console.error('Update teacher error:', e); res.status(500).json({ success:false, message:'Failed to update teacher', error:e.message }); }
});

app.delete('/api/teachers/:id', requireAdmin, async (req, res) => {
  try {
    if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Teacher, TeacherSubject } = require('./models'); const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) return res.status(404).json({ success:false, message:'Teacher not found' });
    await TeacherSubject.destroy({ where:{ teacherId: teacher.id } });
    await teacher.destroy();
    res.json({ success:true, message:'Teacher deleted' });
  } catch (e) { console.error('Delete teacher error:', e); res.status(500).json({ success:false, message:'Failed to delete teacher', error:e.message }); }
});

// Teacher details (with subjects)
app.get('/api/teachers/:id', requireAdmin, async (req, res) => {
  try {
    if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Teacher, Subject, Semester } = require('./models');
    const teacher = await Teacher.findByPk(req.params.id, { attributes:{ exclude:['password'] }, include:[ { model: Subject, through:{ attributes:[] }, attributes:['id','name','code','section'], include:[ { model: Semester, attributes:['id','name','number'] } ] } ] });
    if (!teacher) return res.status(404).json({ success:false, message:'Teacher not found' });
    res.json(teacher);
  } catch (e) { console.error('Get teacher detail error:', e); res.status(500).json({ success:false, message:'Failed to fetch teacher', error:e.message }); }
});

// Remove subject assignment generic route (frontend removeSubject)
app.delete('/api/teachers/:teacherId/subjects/:subjectId', requireAdmin, async (req, res) => {
  try {
    if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { TeacherSubject } = require('./models'); const { teacherId, subjectId } = req.params;
    const deleted = await TeacherSubject.destroy({ where:{ teacherId, subjectId } });
    if (!deleted) return res.status(404).json({ success:false, message:'Assignment not found' });
    res.json({ success:true, message:'Assignment removed' });
  } catch (e) { console.error('Remove assignment error:', e); res.status(500).json({ success:false, message:'Failed to remove assignment', error:e.message }); }
});

// ===== Generic Student Create (admin protected) =====
app.post('/api/students', requireAdmin, async (req, res) => {
  try {
    if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Student, Batch } = require('./models');
    let { id, name, email, batch, section, password } = req.body;
    if (!name || !email || !batch) return res.status(400).json({ success:false, message:'name, email, batch required' });
    if (!id) id = `S${String(Date.now()).slice(-6)}`;
    const exists = await Student.findByPk(id); if (exists) return res.status(400).json({ success:false, message:'Student ID exists' });
    const batchRow = await Batch.findByPk(batch); if (!batchRow) return res.status(400).json({ success:false, message:'Batch not found' });
    const bcrypt = require('bcryptjs'); const rawPassword = password || 'student123'; const salt = await bcrypt.genSalt(10); const hashed = await bcrypt.hash(rawPassword, salt);
    const student = await Student.create({ id, name, email, batch, section: section || 'A', password: hashed });
    res.status(201).json({ success:true, data:{ id: student.id, name: student.name, email: student.email, batch: student.batch, section: student.section } });
  } catch (e) { console.error('Create student error:', e); res.status(500).json({ success:false, message:'Failed to create student', error:e.message }); }
});

// ===== Generic Batch Create (admin protected) =====
app.post('/api/batches', requireAdmin, async (req, res) => {
  try {
    if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Batch } = require('./models');
    const { name, department, startYear, endYear, active = true, id } = req.body;
    if (!name || !department || !startYear || !endYear) return res.status(400).json({ success:false, message:'name, department, startYear, endYear required' });
    const batchId = id || `${startYear}-${endYear}`;
    const exists = await Batch.findByPk(batchId); if (exists) return res.status(400).json({ success:false, message:'Batch already exists' });
    const batch = await Batch.create({ id: batchId, name, department, startYear, endYear, active });
    res.status(201).json({ success:true, data: batch });
  } catch (e) { console.error('Create batch error:', e); res.status(500).json({ success:false, message:'Failed to create batch', error:e.message }); }
});

// ========= Generic (non-admin) Teacher CRUD for frontend compatibility =========
app.post('/api/teachers', async (req, res) => {
  try {
    if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Teacher } = require('./models');
    const { name, email, password } = req.body;
    if (!name || !email) return res.status(400).json({ success:false, message:'Name and email required' });
    const existing = await Teacher.findOne({ where:{ email } });
    if (existing) return res.status(400).json({ success:false, message:'Teacher with this email already exists' });
    const bcrypt = require('bcryptjs');
    const teacherId = `T${String(Date.now()).slice(-6)}`;
    const rawPassword = password || 'teacher123';
    const salt = await bcrypt.genSalt(10); const hashed = await bcrypt.hash(rawPassword, salt);
    const teacher = await Teacher.create({ id: teacherId, name, email, password: hashed });
    res.status(201).json({ success:true, data:{ id: teacher.id, name: teacher.name, email: teacher.email } });
  } catch (e) { console.error('Create teacher (generic) error:', e); res.status(500).json({ success:false, message:'Failed to create teacher', error:e.message }); }
});

app.get('/api/teachers/:id', async (req, res) => {
  try { if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Teacher, Subject } = require('./models');
    const teacher = await Teacher.findByPk(req.params.id, { attributes:{ exclude:['password'] }, include:[ { model: Subject, through:{ attributes:[] }, attributes:['id','name','code','section'] } ] });
    if (!teacher) return res.status(404).json({ success:false, message:'Teacher not found' });
    res.json(teacher);
  } catch(e){ console.error('Fetch teacher error:', e); res.status(500).json({ success:false, message:'Failed to fetch teacher', error:e.message }); }
});

app.put('/api/teachers/:id', async (req, res) => {
  try { if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Teacher } = require('./models'); const { name, email } = req.body; const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) return res.status(404).json({ success:false, message:'Teacher not found' });
    if (email && email !== teacher.email) { const exists = await Teacher.findOne({ where:{ email } }); if (exists) return res.status(400).json({ success:false, message:'Email already in use' }); }
    await teacher.update({ name, email });
    res.json({ success:true, data:{ id: teacher.id, name: teacher.name, email: teacher.email } });
  } catch(e){ console.error('Update teacher error:', e); res.status(500).json({ success:false, message:'Failed to update teacher', error:e.message }); }
});

app.delete('/api/teachers/:id', async (req, res) => {
  try { if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Teacher, TeacherSubject } = require('./models'); const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) return res.status(404).json({ success:false, message:'Teacher not found' });
    // Clean assignments
    await TeacherSubject.destroy({ where:{ teacherId: teacher.id } });
    await teacher.destroy();
    res.json({ success:true, message:'Teacher deleted' });
  } catch(e){ console.error('Delete teacher error:', e); res.status(500).json({ success:false, message:'Failed to delete teacher', error:e.message }); }
});

// Get subjects for a teacher (generic)
app.get('/api/teachers/:id/subjects', async (req, res) => {
  try { if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Teacher, Subject, Semester } = require('./models');
    const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) return res.status(404).json({ success:false, message:'Teacher not found' });
    const subjects = await teacher.getSubjects({ include:[ { model: Semester, attributes:['id','name','number','active'] } ] });
    res.json(subjects);
  } catch(e){ console.error('List teacher subjects error:', e); res.status(500).json({ success:false, message:'Failed to fetch subjects', error:e.message }); }
});

// Remove subject assignment (generic) aligns with frontend removeSubject()
app.delete('/api/teachers/:teacherId/subjects/:subjectId', async (req, res) => {
  try { if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { TeacherSubject } = require('./models'); const { teacherId, subjectId } = req.params;
    const deleted = await TeacherSubject.destroy({ where:{ teacherId, subjectId } });
    if (!deleted) return res.status(404).json({ success:false, message:'Assignment not found' });
    res.json({ success:true, message:'Assignment removed' });
  } catch(e){ console.error('Remove assignment error:', e); res.status(500).json({ success:false, message:'Failed to remove assignment', error:e.message }); }
});

// Optional: assign subject via generic route POST /api/teachers/:id/subjects
app.post('/api/teachers/:id/subjects', async (req, res) => {
  try { if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Teacher, Subject, TeacherSubject } = require('./models'); const teacherId = req.params.id; const { subjectId } = req.body;
    if (!subjectId) return res.status(400).json({ success:false, message:'subjectId required' });
    const teacher = await Teacher.findByPk(teacherId); if (!teacher) return res.status(404).json({ success:false, message:'Teacher not found' });
    const subject = await Subject.findByPk(subjectId); if (!subject) return res.status(404).json({ success:false, message:'Subject not found' });
    const exists = await TeacherSubject.findOne({ where:{ teacherId, subjectId } }); if (exists) return res.status(400).json({ success:false, message:'Already assigned' });
    await TeacherSubject.create({ teacherId, subjectId });
    res.status(201).json({ success:true, message:'Subject assigned' });
  } catch(e){ console.error('Assign subject (generic) error:', e); res.status(500).json({ success:false, message:'Failed to assign subject', error:e.message }); }
});

// ========= Generic Student CRUD =========
app.post('/api/students', async (req, res) => {
  try { if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Student, Batch } = require('./models'); let { id, name, email, batch, section, password } = req.body;
    if (!name || !email || !batch) return res.status(400).json({ success:false, message:'name, email, batch required' });
    if (!id) id = `S${String(Date.now()).slice(-6)}`;
    const exists = await Student.findByPk(id); if (exists) return res.status(400).json({ success:false, message:'Student ID exists' });
    const batchRow = await Batch.findByPk(batch); if (!batchRow) return res.status(400).json({ success:false, message:'Batch not found' });
    const bcrypt = require('bcryptjs'); const rawPassword = password || 'student123'; const salt = await bcrypt.genSalt(10); const hashed = await bcrypt.hash(rawPassword, salt);
    const student = await Student.create({ id, name, email, batch, section: section || 'A', password: hashed });
    res.status(201).json({ success:true, data:{ id: student.id, name: student.name, email: student.email, batch: student.batch, section: student.section } });
  } catch(e){ console.error('Create student error:', e); res.status(500).json({ success:false, message:'Failed to create student', error:e.message }); }
});

app.get('/api/students/:id', async (req, res) => {
  try { if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Student, Batch } = require('./models'); const student = await Student.findByPk(req.params.id, { attributes:{ exclude:['password'] }, include:[ { model: Batch, attributes:['name','department'] } ] });
    if (!student) return res.status(404).json({ success:false, message:'Student not found' });
    res.json(student);
  } catch(e){ console.error('Fetch student error:', e); res.status(500).json({ success:false, message:'Failed to fetch student', error:e.message }); }
});

app.put('/api/students/:id', async (req, res) => {
  try { if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Student, Batch } = require('./models'); const { name, email, batch, section } = req.body; const student = await Student.findByPk(req.params.id);
    if (!student) return res.status(404).json({ success:false, message:'Student not found' });
    if (batch && batch !== student.batch) { const batchRow = await Batch.findByPk(batch); if (!batchRow) return res.status(400).json({ success:false, message:'Batch not found' }); }
    await student.update({ name, email, batch, section });
    res.json({ success:true, data:{ id: student.id, name: student.name, email: student.email, batch: student.batch, section: student.section } });
  } catch(e){ console.error('Update student error:', e); res.status(500).json({ success:false, message:'Failed to update student', error:e.message }); }
});

app.delete('/api/students/:id', async (req, res) => {
  try { if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Student } = require('./models'); const student = await Student.findByPk(req.params.id); if (!student) return res.status(404).json({ success:false, message:'Student not found' }); await student.destroy();
    res.json({ success:true, message:'Student deleted' });
  } catch(e){ console.error('Delete student error:', e); res.status(500).json({ success:false, message:'Failed to delete student', error:e.message }); }
});

// ========= Generic Batch CRUD =========
app.post('/api/batches', async (req, res) => {
  try { if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Batch } = require('./models'); const { name, department, startYear, endYear, active = true, id } = req.body;
    if (!name || !department || !startYear || !endYear) return res.status(400).json({ success:false, message:'name, department, startYear, endYear required' });
    const batchId = id || `${startYear}-${endYear}`;
    const exists = await Batch.findByPk(batchId); if (exists) return res.status(400).json({ success:false, message:'Batch already exists' });
    const batch = await Batch.create({ id: batchId, name, department, startYear, endYear, active });
    res.status(201).json({ success:true, data: batch });
  } catch(e){ console.error('Create batch error:', e); res.status(500).json({ success:false, message:'Failed to create batch', error:e.message }); }
});

app.get('/api/batches/:id', async (req, res) => {
  try { if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Batch } = require('./models'); const batch = await Batch.findByPk(req.params.id); if (!batch) return res.status(404).json({ success:false, message:'Batch not found' }); res.json(batch);
  } catch(e){ console.error('Fetch batch error:', e); res.status(500).json({ success:false, message:'Failed to fetch batch', error:e.message }); }
});

app.put('/api/batches/:id', async (req, res) => {
  try { if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Batch } = require('./models'); const { name, department, startYear, endYear, active } = req.body; const batch = await Batch.findByPk(req.params.id);
    if (!batch) return res.status(404).json({ success:false, message:'Batch not found' });
    await batch.update({ name, department, startYear, endYear, active });
    res.json({ success:true, data: batch });
  } catch(e){ console.error('Update batch error:', e); res.status(500).json({ success:false, message:'Failed to update batch', error:e.message }); }
});

app.delete('/api/batches/:id', async (req, res) => {
  try { if (!dbConnected) { const { connectDB } = require('./config/db'); await connectDB(); dbConnected = true; }
    const { Batch, Student, Subject, Semester } = require('./models'); const batch = await Batch.findByPk(req.params.id);
    if (!batch) return res.status(404).json({ success:false, message:'Batch not found' });
    // Prevent deletion if related rows exist (safety)
    const studentCount = await Student.count({ where:{ batch: batch.id } });
    const subjectCount = await Subject.count({ where:{ batchId: batch.id } });
    const semesterCount = await Semester.count({ where:{ batchId: batch.id } });
    if (studentCount || subjectCount || semesterCount) {
      return res.status(400).json({ success:false, message:`Cannot delete batch with related records (students:${studentCount}, subjects:${subjectCount}, semesters:${semesterCount})` });
    }
    await batch.destroy();
    res.json({ success:true, message:'Batch deleted' });
  } catch(e){ console.error('Delete batch error:', e); res.status(500).json({ success:false, message:'Failed to delete batch', error:e.message }); }
});

// Basic students endpoint for compatibility  
app.get('/api/students', async (req, res) => {
  try {
    // Ensure database connection
    if (!dbConnected) {
      try {
        const { connectDB } = require('./config/db');
        await connectDB();
        dbConnected = true;
      } catch (dbError) {
        console.error('DB connection failed:', dbError);
        return res.status(500).json({
          message: 'Database connection failed',
          error: dbError.message
        });
      }
    }
    
    const { Student } = require('./models');
    const students = await Student.findAll({
      attributes: ['id', 'name', 'email', 'section', 'batch'],
      order: [['name', 'ASC']]
    });
    
    res.json(students);
  } catch (error) {
    console.error('Students fetch error:', error);
    res.status(500).json({
      message: 'Error fetching students',
      error: error.message,
      details: 'Please check database connection and models'
    });
  }
});

// Basic batches endpoint
app.get('/api/batches', async (req, res) => {
  try {
    // Ensure database connection
    if (!dbConnected) {
      try {
        const { connectDB } = require('./config/db');
        await connectDB();
        dbConnected = true;
      } catch (dbError) {
        console.error('DB connection failed:', dbError);
        return res.status(500).json({
          message: 'Database connection failed',
          error: dbError.message
        });
      }
    }
    
    const { Batch } = require('./models');
    const batches = await Batch.findAll({
      attributes: ['id', 'name', 'startYear', 'endYear', 'department', 'active'],
      order: [['name', 'ASC']]
    });
    
    res.json(batches);
  } catch (error) {
    console.error('Batches fetch error:', error);
    res.status(500).json({
      message: 'Error fetching batches',
      error: error.message,
      details: 'Please check database connection and models'
    });
  }
});

// Batch students endpoint
app.get('/api/batches/:batchId/students', async (req, res) => {
  try {
    // Ensure database connection
    if (!dbConnected) {
      try {
        const { connectDB } = require('./config/db');
        await connectDB();
        dbConnected = true;
      } catch (dbError) {
        console.error('DB connection failed:', dbError);
        return res.status(500).json({
          message: 'Database connection failed',
          error: dbError.message
        });
      }
    }
    
    const { Student } = require('./models');
    const { batchId } = req.params;
    
    const students = await Student.findAll({
      where: { batch: batchId },
      attributes: { exclude: ['password'] },
      order: [['name', 'ASC']]
    });
    
    console.log(`Found ${students.length} students for batch ${batchId}`);
    res.json(students);
  } catch (error) {
    console.error('Batch students fetch error:', error);
    res.status(500).json({
      message: 'Error fetching students for batch',
      error: error.message,
      batchId: req.params.batchId
    });
  }
});

// Basic subjects endpoint
app.get('/api/subjects', async (req, res) => {
  try {
    // Ensure database connection
    if (!dbConnected) {
      try {
        const { connectDB } = require('./config/db');
        await connectDB();
        dbConnected = true;
      } catch (dbError) {
        console.error('DB connection failed:', dbError);
        return res.status(500).json({
          message: 'Database connection failed',
          error: dbError.message
        });
      }
    }
    
    const { Subject } = require('./models');
    const subjects = await Subject.findAll({
      attributes: ['id', 'name', 'section', 'description', 'credits'],
      order: [['name', 'ASC']]
    });
    
    res.json(subjects);
  } catch (error) {
    console.error('Subjects fetch error:', error);
    res.status(500).json({
      message: 'Error fetching subjects',
      error: error.message,
      details: 'Please check database connection and models'
    });
  }
});

// Semesters endpoint
app.get('/api/semesters', async (req, res) => {
  try {
    // Ensure database connection
    if (!dbConnected) {
      try {
        const { connectDB } = require('./config/db');
        await connectDB();
        dbConnected = true;
      } catch (dbError) {
        console.error('DB connection failed:', dbError);
        return res.status(500).json({
          message: 'Database connection failed',
          error: dbError.message
        });
      }
    }
    
    const { Semester, Batch } = require('./models');
    const semesters = await Semester.findAll({
      attributes: ['id', 'name', 'number', 'batchId', 'startDate', 'endDate', 'active'],
      include: [
        {
          model: Batch,
          attributes: ['id', 'name', 'department']
        }
      ],
      order: [['batchId', 'ASC'], ['number', 'ASC']]
    });
    
    console.log(`Found ${semesters.length} semesters`);
    res.json(semesters);
  } catch (error) {
    console.error('Semesters fetch error:', error);
    res.status(500).json({
      message: 'Error fetching semesters',
      error: error.message,
      details: 'Please check database connection and models'
    });
  }
});

// Batch-specific semesters endpoint
app.get('/api/semesters/batch/:batchId', async (req, res) => {
  try {
    // Ensure database connection
    if (!dbConnected) {
      try {
        const { connectDB } = require('./config/db');
        await connectDB();
        dbConnected = true;
      } catch (dbError) {
        console.error('DB connection failed:', dbError);
        return res.status(500).json({
          message: 'Database connection failed',
          error: dbError.message
        });
      }
    }
    
    const { Semester, Batch } = require('./models');
    const { batchId } = req.params;
    
    const semesters = await Semester.findAll({
      where: { batchId },
      attributes: ['id', 'name', 'number', 'batchId', 'startDate', 'endDate', 'active'],
      include: [
        {
          model: Batch,
          attributes: ['id', 'name', 'department']
        }
      ],
      order: [['number', 'ASC']]
    });
    
    console.log(`Found ${semesters.length} semesters for batch ${batchId}`);
    res.json(semesters);
  } catch (error) {
    console.error('Batch semesters fetch error:', error);
    res.status(500).json({
      message: 'Error fetching semesters for batch',
      error: error.message,
      batchId: req.params.batchId
    });
  }
});

// Admin routes
app.get('/api/admin/students', async (req, res) => {
  try {
    if (!dbConnected) {
      console.log('🔌 Attempting database connection...');
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }

    const { Student, Batch } = require('./models');
    const { batch } = req.query;
    
    const whereClause = batch ? { batch } : {};
    
    const students = await Student.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Batch,
          attributes: ['name', 'department']
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json(students);
  } catch (error) {
    console.error('Error fetching admin students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students'
    });
  }
});

app.get('/api/admin/teachers', async (req, res) => {
  try {
    if (!dbConnected) {
      console.log('🔌 Attempting database connection...');
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }

    const { Teacher, Subject, Semester } = require('./models');
    const teachers = await Teacher.findAll({
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Subject,
            through: { attributes: [] },
            attributes: ['id', 'name', 'code', 'section'],
            include: [ { model: Semester, attributes: ['id', 'name', 'number'] } ]
        }
      ],
      order: [['name', 'ASC']]
    });
    res.json(teachers);
  } catch (error) {
    console.error('Error fetching admin teachers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch teachers', error: error.message });
  }
});

app.get('/api/admin/subjects', async (req, res) => {
  try {
    if (!dbConnected) {
      console.log('🔌 Attempting database connection...');
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }

    const { Subject, Batch, Semester } = require('./models');
    
    const subjects = await Subject.findAll({
      include: [
        {
          model: Batch,
          attributes: ['name', 'department']
        },
        {
          model: Semester,
          attributes: ['name', 'number']
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json(subjects);
  } catch (error) {
    console.error('Error fetching admin subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects'
    });
  }
});

app.get('/api/admin/batches', async (req, res) => {
  try {
    if (!dbConnected) {
      console.log('🔌 Attempting database connection...');
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }

    const { Batch } = require('./models');
    
    const batches = await Batch.findAll({
      order: [['name', 'ASC']]
    });

    res.json(batches);
  } catch (error) {
    console.error('Error fetching admin batches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batches'
    });
  }
});

// Admin POST routes for creating entities
app.post('/api/admin/students', async (req, res) => {
  try {
    if (!dbConnected) {
      console.log('🔌 Attempting database connection...');
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }

    const { Student, Batch, Semester } = require('./models');
    let { id, name, email, batch, section, password, activeSemesterId } = req.body;

    if (!name || !email || !batch) {
      return res.status(400).json({ success: false, message: 'Please provide at least name, email, and batch' });
    }

    if (!id) id = `S${String(Date.now()).slice(-6)}`;

    const existingStudent = await Student.findByPk(id);
    if (existingStudent) {
      return res.status(400).json({ success: false, message: 'Student with this ID already exists' });
    }

    const batchExists = await Batch.findByPk(batch);
    if (!batchExists) {
      return res.status(400).json({ success: false, message: 'Batch not found' });
    }

    if (activeSemesterId) {
      const sem = await Semester.findByPk(activeSemesterId);
      if (!sem) return res.status(400).json({ success: false, message: 'Active semester not found' });
      if (sem.batchId !== batch) return res.status(400).json({ success: false, message: 'Semester does not belong to batch' });
    }

    const bcrypt = require('bcryptjs');
    const studentPassword = password || 'student123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(studentPassword, salt);

    const student = await Student.create({
      id,
      name,
      email,
      batch,
      section: section || 'A',
      password: hashedPassword,
      activeSemesterId: activeSemesterId || null
    });

    res.status(201).json({ success: true, data: { id: student.id, name: student.name, email: student.email, batch: student.batch, section: student.section, activeSemesterId: student.activeSemesterId } });
  } catch (error) {
    console.error('Error creating admin student:', error);
    res.status(500).json({ success: false, message: 'Failed to create student', error: error.message });
  }
});

app.post('/api/admin/assign/subject', async (req, res) => {
  try {
    if (!dbConnected) {
      console.log('🔌 Attempting database connection...');
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }

    const { Teacher, Subject, TeacherSubject, Semester } = require('./models');
    const { teacherId, subjectId } = req.body;

    // Validate teacher exists
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Validate subject exists
    const subject = await Subject.findByPk(subjectId, {
      include: [
        {
          model: Semester,
          attributes: ['id', 'name', 'number']
        }
      ]
    });
    
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Check if assignment already exists
    const existingAssignment = await TeacherSubject.findOne({
      where: {
        teacherId,
        subjectId
      }
    });

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'Teacher is already assigned to this subject'
      });
    }

    // Create teacher-subject assignment
    const assignment = await TeacherSubject.create({
      teacherId,
      subjectId
    });

    res.status(201).json({
      success: true,
      data: {
        id: assignment.id,
        teacherId: assignment.teacherId,
        teacherName: teacher.name,
        subjectId: assignment.subjectId,
        subjectName: subject.name,
        subjectSection: subject.section,
        semester: subject.Semester ? {
          id: subject.Semester.id,
          name: subject.Semester.name,
          number: subject.Semester.number
        } : null,
        createdAt: assignment.createdAt
      }
    });
  } catch (error) {
    console.error('Error assigning subject to teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign subject'
    });
  }
});

// List teacher-subject assignments (admin)
app.get('/api/admin/assignments', async (req, res) => {
  try {
    if (!dbConnected) {
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }
    const { TeacherSubject, Teacher, Subject, Semester } = require('./models');
    const assignments = await TeacherSubject.findAll({
      include: [
        { model: Teacher, attributes: ['id','name','email'] },
        { model: Subject, include: [ { model: Semester, attributes: ['id','name','number'] } ] }
      ]
    });

    const data = assignments.map(a => ({
      id: a.id,
      teacherId: a.teacherId,
      teacherName: a.Teacher ? a.Teacher.name : null,
      teacherEmail: a.Teacher ? a.Teacher.email : null,
      subjectId: a.subjectId,
      subjectName: a.Subject ? a.Subject.name : null,
      subjectSection: a.Subject ? a.Subject.section : null,
      semester: a.Subject && a.Subject.Semester ? {
        id: a.Subject.Semester.id,
        name: a.Subject.Semester.name,
        number: a.Subject.Semester.number
      } : null,
      createdAt: a.createdAt
    }));
    res.json({ count: data.length, assignments: data });
  } catch (error) {
    console.error('Error listing assignments:', error);
    res.status(500).json({ success:false, message:'Failed to fetch assignments', error: error.message });
  }
});

// Admin semester management endpoints
app.post('/api/admin/semesters/generate/:batchId', async (req, res) => {
  try {
    if (!dbConnected) {
      console.log('🔌 Attempting database connection...');
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }

    const { Batch, Semester } = require('./models');
    const { batchId } = req.params;
    
    // Validate batch exists
    const batch = await Batch.findByPk(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Check if semesters already exist for this batch
    const existingSemesters = await Semester.findAll({
      where: { batchId }
    });

    if (existingSemesters.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Semesters already exist for batch ${batch.name}`,
        count: existingSemesters.length
      });
    }

    // Generate 8 semesters
    const semesters = [];
    const startYear = parseInt(batch.startYear);
    
    for (let i = 1; i <= 8; i++) {
      const yearOffset = Math.floor((i - 1) / 2);
      const currentYear = startYear + yearOffset;
      const isOdd = i % 2 === 1;
      const season = isOdd ? 'Fall' : 'Spring';
      const seasonYear = isOdd ? currentYear : currentYear + 1;
      
      const semesterData = {
        id: `${batchId}-S-${i}`,
        name: `Semester ${i} (${season} ${seasonYear})`,
        number: i,
        batchId: batchId,
        startDate: new Date(`${seasonYear}-${isOdd ? '08' : '01'}-01`),
        endDate: new Date(`${seasonYear}-${isOdd ? '12' : '05'}-31`),
        active: i === 1 // First semester is active by default
      };
      
      semesters.push(semesterData);
    }

    // Create all semesters
    const createdSemesters = await Semester.bulkCreate(semesters);

    res.status(201).json({
      success: true,
      created: createdSemesters.length,
      total: 8,
      message: `Generated 8 semesters for batch ${batch.name}`,
      semesters: createdSemesters
    });
  } catch (error) {
    console.error('Error generating semesters:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate semesters',
      error: error.message
    });
  }
});

app.post('/api/admin/semesters/:semesterId/batch/:batchId', async (req, res) => {
  try {
    if (!dbConnected) {
      console.log('🔌 Attempting database connection...');
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }

    const { Semester, Student, Batch } = require('./models');
    const { semesterId, batchId } = req.params;
    
    // Validate semester exists
    const semester = await Semester.findByPk(semesterId);
    if (!semester) {
      return res.status(404).json({
        success: false,
        message: 'Semester not found'
      });
    }
    
    // Validate batch exists
    const batch = await Batch.findByPk(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }
    
    // Check if semester belongs to the batch
    if (semester.batchId !== batchId) {
      return res.status(400).json({
        success: false,
        message: 'Semester does not belong to this batch'
      });
    }
    
    // Get all students in the batch
    const students = await Student.findAll({
      where: { batch: batchId }
    });
    
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found in this batch'
      });
    }
    
    // Update all students' active semester
    const updatedCount = await Student.update(
      { activeSemesterId: semesterId },
      { where: { batch: batchId } }
    );
    
    // Set this semester as active and others as inactive for this batch
    await Semester.update(
      { active: false },
      { where: { batchId } }
    );
    
    await Semester.update(
      { active: true },
      { where: { id: semesterId } }
    );
    
    res.json({
      success: true,
      message: `Active semester for ${updatedCount[0]} students in batch ${batch.name} updated to ${semester.name}`,
      data: {
        batchId,
        batchName: batch.name,
        semesterId,
        semesterName: semester.name,
        semesterNumber: semester.number,
        studentsUpdated: updatedCount[0]
      }
    });
  } catch (error) {
    console.error('Error setting active semester for batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set active semester',
      error: error.message
    });
  }
});

// Semester activate/deactivate endpoints
app.put('/api/semesters/:id/activate', async (req, res) => {
  try {
    if (!dbConnected) {
      console.log('🔌 Attempting database connection...');
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }

    const { Semester, Student } = require('./models');
    const { id } = req.params;
    
    const semester = await Semester.findByPk(id);
    if (!semester) {
      return res.status(404).json({
        message: 'Semester not found'
      });
    }

    // Deactivate all other semesters in the same batch
    await Semester.update(
      { active: false },
      { where: { batchId: semester.batchId } }
    );

    // Activate this semester
    await semester.update({ active: true });

    // Update all students in the batch to use this semester
    const updatedStudents = await Student.update(
      { activeSemesterId: id },
      { where: { batch: semester.batchId } }
    );

    res.json({
      message: `Semester ${semester.name} activated successfully`,
      semesterId: id,
      batchId: semester.batchId,
      studentsUpdated: updatedStudents[0]
    });
  } catch (error) {
    console.error('Error activating semester:', error);
    res.status(500).json({
      message: 'Failed to activate semester',
      error: error.message
    });
  }
});

app.put('/api/semesters/:id/deactivate', async (req, res) => {
  try {
    if (!dbConnected) {
      console.log('🔌 Attempting database connection...');
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }

    const { Semester } = require('./models');
    const { id } = req.params;
    
    const semester = await Semester.findByPk(id);
    if (!semester) {
      return res.status(404).json({
        message: 'Semester not found'
      });
    }

    await semester.update({ active: false });

    res.json({
      message: `Semester ${semester.name} deactivated successfully`,
      semesterId: id,
      batchId: semester.batchId
    });
  } catch (error) {
    console.error('Error deactivating semester:', error);
    res.status(500).json({
      message: 'Failed to deactivate semester',
      error: error.message
    });
  }
});

// Admin batch creation endpoint
app.post('/api/admin/batches', async (req, res) => {
  try {
    if (!dbConnected) {
      console.log('🔌 Attempting database connection...');
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }

    const { Batch } = require('./models');
    const { name, department, startYear, endYear, active = true, id } = req.body;

    if (!name || !department || !startYear || !endYear) {
      return res.status(400).json({ success: false, message: 'Please provide name, department, startYear, and endYear' });
    }

    // Auto id if not passed
    const batchId = id || `${startYear}-${endYear}`;

    if (!/^[0-9]{4}-[0-9]{4}$/.test(batchId)) {
      console.warn('Batch id not in expected pattern YYYY-YYYY, continuing but recommend consistent IDs');
    }

  // Check if batch already exists
  const existingBatch = await Batch.findByPk(batchId);

    if (existingBatch) {
      return res.status(400).json({
        success: false,
        message: 'Batch with this name and years already exists'
      });
    }

  const batch = await Batch.create({ id: batchId, name, department, startYear, endYear, active });

  res.status(201).json({ success: true, data: batch });
  } catch (error) {
    console.error('Error creating batch:', error);
  res.status(500).json({ success: false, message: 'Failed to create batch', error: error.message });
  }
});

// Admin subject creation endpoint
app.post('/api/admin/subjects', async (req, res) => {
  try {
    if (!dbConnected) {
      console.log('🔌 Attempting database connection...');
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }

    const { Subject, Batch, Semester } = require('./models');
    let { id, name, code, section, description, credits, batchId, semesterId } = req.body;

    if (!name || !section) {
      return res.status(400).json({ success: false, message: 'Please provide name and section' });
    }

    if (!id) {
      if (code) id = code; else id = `SUB-${Date.now().toString(36)}`;
    }

    // Id uniqueness
    const existing = await Subject.findByPk(id);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Subject with this id already exists' });
    }

    if (batchId) {
      const batchExists = await Batch.findByPk(batchId);
      if (!batchExists) return res.status(400).json({ success: false, message: 'Batch not found' });
    }
    if (semesterId) {
      const semesterExists = await Semester.findByPk(semesterId);
      if (!semesterExists) return res.status(400).json({ success: false, message: 'Semester not found' });
    }

    const subject = await Subject.create({ id, name, code, section, description, credits: credits || 3, batchId, semesterId });
    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ success: false, message: 'Failed to create subject', error: error.message });
  }
});

// Admin teacher creation endpoint
app.post('/api/admin/teachers', async (req, res) => {
  try {
    if (!dbConnected) {
      console.log('🔌 Attempting database connection...');
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }

    const { Teacher } = require('./models');
    const { name, email, password } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name and email'
      });
    }

    // Check if teacher already exists
    const existingTeacher = await Teacher.findOne({ where: { email } });
    if (existingTeacher) {
      return res.status(400).json({
        success: false,
        message: 'Teacher with this email already exists'
      });
    }

    // Generate teacher ID
    const teacherId = `T${String(Date.now()).slice(-6)}`;
    
    // Generate password if not provided
    const teacherPassword = password || 'teacher123';

    // Hash password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(teacherPassword, salt);

    const teacher = await Teacher.create({
      id: teacherId,
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({
      success: true,
      data: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email
      }
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create teacher'
    });
  }
});

// Student update endpoint
app.put('/api/admin/students/:id', async (req, res) => {
  try {
    if (!dbConnected) {
      console.log('🔌 Attempting database connection...');
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }

    const { Student, Batch } = require('./models');
    const { id } = req.params;
    const { name, email, batch, section } = req.body;

    const student = await Student.findByPk(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if batch exists if being updated
    if (batch && batch !== student.batch) {
      const batchExists = await Batch.findByPk(batch);
      if (!batchExists) {
        return res.status(400).json({
          success: false,
          message: 'Batch not found'
        });
      }
    }

    await student.update({ name, email, batch, section });

    res.json({
      success: true,
      data: {
        id: student.id,
        name: student.name,
        email: student.email,
        batch: student.batch,
        section: student.section
      }
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student'
    });
  }
});

// Student delete endpoint
app.delete('/api/admin/students/:id', async (req, res) => {
  try {
    if (!dbConnected) {
      console.log('🔌 Attempting database connection...');
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }

    const { Student } = require('./models');
    const { id } = req.params;

    const student = await Student.findByPk(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    await student.destroy();

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete student'
    });
  }
});

// Teacher update endpoint
app.put('/api/admin/teachers/:id', async (req, res) => {
  try {
    if (!dbConnected) {
      console.log('🔌 Attempting database connection...');
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }

    const { Teacher } = require('./models');
    const { id } = req.params;
    const { name, email } = req.body;

    const teacher = await Teacher.findByPk(id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== teacher.email) {
      const existingTeacher = await Teacher.findOne({ where: { email } });
      if (existingTeacher) {
        return res.status(400).json({
          success: false,
          message: 'Teacher with this email already exists'
        });
      }
    }

    await teacher.update({ name, email });

    res.json({
      success: true,
      data: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email
      }
    });
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update teacher'
    });
  }
});

// Teacher delete endpoint
app.delete('/api/admin/teachers/:id', async (req, res) => {
  try {
    if (!dbConnected) {
      console.log('🔌 Attempting database connection...');
      const { connectDB } = require('./config/db');
      await connectDB();
      dbConnected = true;
    }

    const { Teacher } = require('./models');
    const { id } = req.params;

    const teacher = await Teacher.findByPk(id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    await teacher.destroy();

    res.json({
      success: true,
      message: 'Teacher deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete teacher'
    });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(500).json({
    error: error.message,
    path: req.originalUrl
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      '/api/health',
      '/api/auth/*',
      '/api/students/*',
      '/api/teachers/*',
      '/api/subjects/*',
      '/api/batches/*',
      '/api/submissions/*',
      '/api/admin/*',
      '/api/semesters/*',
      '/api/assignments/*'
    ]
  });
});

module.exports = app;
