// Simple Firebase Admin SDK initialization using service account JSON
// This is an alternative to the more complex firebaseUtils.js

const admin = require("firebase-admin");

// Option 1: Direct require (if you place the file in your project)
// const serviceAccount = require("./firebase-admin-sdk.json");

// Option 2: Using fs to read the file
const fs = require('fs');
const path = require('path');

let firebaseApp = null;

function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp; // Already initialized
  }

  try {
    // Try to find service account file
    const possiblePaths = [
      path.join(__dirname, '..', '..', 'firebase-admin-sdk.json'),
      path.join(__dirname, '..', '..', 'evalis-firebase-admin-sdk.json'),
      path.join(__dirname, '..', '..', 'Evalis Firebase Admin SDK.json'),
      path.join(__dirname, '..', '..', 'Firebase Admin SDK.json')
    ];

    let serviceAccount = null;
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        serviceAccount = require(filePath);
        console.log(`✅ Firebase Admin SDK loaded from: ${filePath}`);
        break;
      }
    }

    if (!serviceAccount) {
      console.error('❌ No Firebase service account file found');
      console.log('📋 Place your service account JSON file in project root as:');
      console.log('   - firebase-admin-sdk.json');
      console.log('   - evalis-firebase-admin-sdk.json');
      console.log('   - Evalis Firebase Admin SDK.json');
      return null;
    }

    // Initialize Firebase Admin SDK
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });

    console.log('🔥 Firebase Admin SDK initialized successfully');
    return firebaseApp;

  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error.message);
    return null;
  }
}

// Export functions
module.exports = {
  initializeFirebase,
  admin,
  getAuth: () => admin.auth(),
  getFirestore: () => admin.firestore(),
  getStorage: () => admin.storage()
};

// Auto-initialize when module is loaded
initializeFirebase();
