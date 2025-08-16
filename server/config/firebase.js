// Server-side Firebase configuration for authentication
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { 
  initializeApp: initializeClientApp,
  cert: clientCert
} = require('firebase/app');
const { 
  getAuth: getClientAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} = require('firebase/auth');
const path = require('path');
const fs = require('fs');

// Load Firebase Admin SDK service account key
const serviceAccountPath = path.join(__dirname, '../../Firebase Admin SDK.json');
let serviceAccount;

try {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  console.log('✓ Firebase Admin SDK service account loaded successfully');
} catch (error) {
  console.error('Error loading Firebase Admin SDK service account:', error);
  console.log('Service account path:', serviceAccountPath);
}

// Initialize Firebase Admin SDK (for server-side operations like creating users)
let adminApp, adminAuth;
try {
  adminApp = initializeApp({
    credential: cert(serviceAccount),
    projectId: "evalis-d16f2"
  });
  adminAuth = getAuth(adminApp);
  console.log('✓ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
}

// Client Firebase configuration (for client-side auth operations)
const firebaseConfig = {
  apiKey: "AIzaSyDOyFOhXSYbtWrFCZMBwsF-7upRxYRlE9k",
  authDomain: "evalis-d16f2.firebaseapp.com",
  projectId: "evalis-d16f2",
  storageBucket: "evalis-d16f2.firebasestorage.app",
  messagingSenderId: "993676113888",
  appId: "1:993676113888:web:21e93b506a90e0544e5d85",
  measurementId: "G-CHPDVY165C"
};

// Initialize Client Firebase (for client-side auth operations)
const clientApp = initializeClientApp(firebaseConfig);
const clientAuth = getClientAuth(clientApp);

// Authentication helper functions using client SDK (for verification)
const loginWithEmailAndPassword = async (email, password) => {
  try {
    return await signInWithEmailAndPassword(clientAuth, email, password);
  } catch (error) {
    console.error("Firebase authentication error:", error.code, error.message);
    
    // Provide more helpful error messages based on the error code
    if (error.code === 'auth/invalid-credential') {
      throw new Error('Invalid email or password. Please check your credentials and try again.');
    } else if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email. Please register first.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password. Please try again.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later or reset your password.');
    } else {
      throw error;
    }
  }
};

// Use Admin SDK for creating users (server-side only)
const createFirebaseUser = async (email, password, displayName = null) => {
  try {
    if (!adminAuth) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    const userRecord = await adminAuth.createUser({
      email: email,
      password: password,
      displayName: displayName,
      emailVerified: false
    });

    console.log('✓ Firebase user created successfully:', userRecord.uid);
    return {
      success: true,
      uid: userRecord.uid,
      email: userRecord.email
    };
  } catch (error) {
    console.error('Error creating Firebase user:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate custom password reset link using Admin SDK
const generatePasswordResetLink = async (email) => {
  try {
    if (!adminAuth) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    const link = await adminAuth.generatePasswordResetLink(email);
    console.log('✓ Password reset link generated successfully for:', email);
    return {
      success: true,
      resetLink: link
    };
  } catch (error) {
    console.error('Error generating password reset link:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const registerWithEmailAndPassword = async (email, password) => {
  return await createUserWithEmailAndPassword(clientAuth, email, password);
};

const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(clientAuth, email);
    return { 
      success: true, 
      message: "Password reset email sent successfully" 
    };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return {
      success: false,
      message: error.message || "Failed to send password reset email"
    };
  }
};

module.exports = {
  app: clientApp,
  auth: clientAuth,
  adminApp,
  adminAuth,
  loginWithEmailAndPassword,
  registerWithEmailAndPassword,
  createFirebaseUser,
  generatePasswordResetLink,
  sendPasswordReset
};