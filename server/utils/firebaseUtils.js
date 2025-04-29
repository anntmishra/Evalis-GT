const admin = require('firebase-admin');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Try to load the service account from a JSON file if it exists
let serviceAccount;
try {
  // Check for both naming conventions of the service account JSON file
  const possibleServiceAccountPaths = [
    path.join(__dirname, '..', '..', 'Evalis Firebase Admin SDK.json'),
    path.join(__dirname, '..', '..', 'evalis-firebase-admin-sdk.json'),
    path.join(__dirname, '..', '..', 'firebase-admin-sdk.json')
  ];
  
  for (const filePath of possibleServiceAccountPaths) {
    if (fs.existsSync(filePath)) {
      serviceAccount = require(filePath);
      console.log(`Loaded Firebase Admin SDK from: ${filePath}`);
      break;
    }
  }
  
  if (!serviceAccount) {
    console.warn('Could not find Firebase Admin SDK JSON file');
  }
} catch (error) {
  console.error('Error loading Firebase Admin SDK from file:', error);
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // If we have the service account from JSON file, use it directly
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized successfully with JSON file');
    } else {
      // Otherwise, try to use environment variables (fallback)
      console.log('Trying to initialize Firebase Admin SDK with environment variables');
      admin.initializeApp({
        credential: admin.credential.cert({
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: process.env.FIREBASE_AUTH_URI,
          token_uri: process.env.FIREBASE_TOKEN_URI,
          auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
          client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
        })
      });
      console.log('Firebase Admin SDK initialized successfully with env variables');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    // Continue running the app without Firebase Admin
    console.warn('Running without Firebase Admin SDK functionality');
  }
}

/**
 * Create a new user in Firebase Authentication
 * @param {string} email - User's email
 * @param {string} password - Initial password
 * @param {Object} userData - Additional user data
 * @returns {Promise<Object>} - Firebase user record
 */
const createFirebaseUser = async (email, password, userData = {}) => {
  if (!admin.apps.length) {
    console.error('Firebase Admin SDK not initialized, cannot create user');
    throw new Error('Firebase Admin SDK not initialized');
  }
  
  try {
    // Create user with email and password
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: userData.name,
      disabled: false,
    });

    // Set custom claims if needed (role-based access)
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'student',
      studentId: userData.id
    });

    console.log(`Successfully created Firebase user: ${userRecord.uid}`);
    return userRecord;
  } catch (error) {
    console.error('Error creating Firebase user:', error);
    throw error;
  }
};

/**
 * Send password reset email to user
 * @param {string} email - User's email
 * @returns {Promise<string>} - Password reset link
 */
const sendPasswordResetEmail = async (email) => {
  if (!admin.apps.length) {
    console.error('Firebase Admin SDK not initialized, cannot send password reset');
    throw new Error('Firebase Admin SDK not initialized');
  }
  
  try {
    const resetLink = await admin.auth().generatePasswordResetLink(email);
    console.log(`Password reset link generated for: ${email}`);
    return resetLink;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Update a Firebase user
 * @param {string} uid - Firebase user ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Updated user record
 */
const updateFirebaseUser = async (uid, updateData) => {
  if (!admin.apps.length) {
    console.error('Firebase Admin SDK not initialized, cannot update user');
    throw new Error('Firebase Admin SDK not initialized');
  }
  
  try {
    // If uid is not provided but email is, try to find user by email
    if (!uid && updateData.email) {
      try {
        const userRecord = await admin.auth().getUserByEmail(updateData.email);
        uid = userRecord.uid;
      } catch (error) {
        console.error(`User with email ${updateData.email} not found:`, error);
        throw new Error(`User with email ${updateData.email} not found`);
      }
    }
    
    if (!uid) {
      throw new Error('User ID (uid) is required for update');
    }
    
    const userRecord = await admin.auth().updateUser(uid, updateData);
    console.log(`Successfully updated Firebase user: ${userRecord.uid}`);
    return userRecord;
  } catch (error) {
    console.error('Error updating Firebase user:', error);
    throw error;
  }
};

/**
 * Delete a Firebase user
 * @param {string} uid - Firebase user ID
 * @returns {Promise<void>}
 */
const deleteFirebaseUser = async (uid) => {
  if (!admin.apps.length) {
    console.error('Firebase Admin SDK not initialized, cannot delete user');
    throw new Error('Firebase Admin SDK not initialized');
  }
  
  try {
    await admin.auth().deleteUser(uid);
    console.log(`Successfully deleted Firebase user: ${uid}`);
  } catch (error) {
    console.error('Error deleting Firebase user:', error);
    throw error;
  }
};

module.exports = {
  createFirebaseUser,
  sendPasswordResetEmail,
  updateFirebaseUser,
  deleteFirebaseUser,
  admin
}; 