const admin = require('firebase-admin');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

if (!admin.apps.length) {
  try {
    // Check environment variables first
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      console.log('Initializing Firebase Admin SDK with environment variables');
      
      // Format the private key correctly if it exists
      const privateKey = process.env.FIREBASE_PRIVATE_KEY ? 
        process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : 
        undefined;
      
      console.log(`Using Firebase project: ${process.env.FIREBASE_PROJECT_ID}`);
      console.log(`Using Firebase client email: ${process.env.FIREBASE_CLIENT_EMAIL}`);
      console.log('Private key found (first 12 chars):', privateKey ? privateKey.substring(0, 12) + '...' : 'undefined');
      
      if (!privateKey) {
        console.error('Private key is undefined or empty. Check your environment variables.');
        throw new Error('Firebase private key is missing or invalid');
      }
        
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            type: "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key: privateKey,
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
          })
        });
        console.log('Firebase Admin SDK initialized successfully with env variables');
        firebaseInitialized = true;
      } catch (certError) {
        console.error('Error creating credential certificate:', certError);
        throw certError;
      }
    } 
    // If env vars not complete, try service account file
    else {
      console.log('Environment variables incomplete, trying service account file');
      // Check for both naming conventions of the service account JSON file
      const possibleServiceAccountPaths = [
        path.join(__dirname, '..', '..', 'Evalis Firebase Admin SDK.json'),
        path.join(__dirname, '..', '..', 'evalis-firebase-admin-sdk.json'),
        path.join(__dirname, '..', '..', 'firebase-admin-sdk.json')
      ];
      
      let serviceAccount;
      let usedFilePath;
      for (const filePath of possibleServiceAccountPaths) {
        if (fs.existsSync(filePath)) {
          try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            serviceAccount = JSON.parse(fileContent);
            usedFilePath = filePath;
            console.log(`Loaded Firebase Admin SDK from: ${filePath}`);
            
            // Verify essential fields
            if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
              console.error(`Found service account file at ${filePath} but it's missing required fields`);
              serviceAccount = null;
              continue;
            }
            
            break;
          } catch (err) {
            console.warn(`Failed to load from ${filePath}:`, err.message);
          }
        }
      }
      
      if (serviceAccount) {
        try {
          console.log(`Using Firebase project from file: ${serviceAccount.project_id}`);
          console.log(`Using Firebase client email from file: ${serviceAccount.client_email}`);
          console.log('Private key found in file (first 12 chars):', 
            serviceAccount.private_key ? serviceAccount.private_key.substring(0, 12) + '...' : 'undefined');
            
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
          console.log('Firebase Admin SDK initialized successfully with JSON file');
          firebaseInitialized = true;
        } catch (err) {
          console.error('Error initializing Firebase with service account:', err);
          // Check for specific issues with service account
          if (err.code === 'auth/invalid-credential') {
            console.error('The credential is invalid or malformed. Check your service account.');
          } else if (err.code === 'auth/project-not-found') {
            console.error('The specified Firebase project was not found.');
          }
        }
      } else {
        console.warn('Could not find Firebase Admin SDK JSON file or environment variables');
      }
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
  }
  
  if (!firebaseInitialized) {
    console.warn('⚠️ Running without Firebase Admin SDK functionality');
  } else {
    // Test Firebase connection
    admin.auth().listUsers(1)
      .then(() => {
        console.log('✅ Firebase Admin SDK connection test successful');
      })
      .catch(error => {
        console.error('❌ Firebase Admin SDK connection test failed:', error);
        firebaseInitialized = false;
      });
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
  if (!firebaseInitialized) {
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
  if (!firebaseInitialized) {
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
  if (!firebaseInitialized) {
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
  if (!firebaseInitialized) {
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