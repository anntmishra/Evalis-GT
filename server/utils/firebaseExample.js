// Example usage of simple Firebase Admin SDK setup
// This shows how you can use your snippet approach in practice

const { admin, getAuth, initializeFirebase } = require('./simpleFirebase');

// Example: Create a user
async function createUser(email, password, displayName) {
  try {
    const app = initializeFirebase();
    if (!app) {
      throw new Error('Firebase not initialized');
    }

    const userRecord = await getAuth().createUser({
      email: email,
      password: password,
      displayName: displayName,
    });

    console.log('Successfully created new user:', userRecord.uid);
    return userRecord;
  } catch (error) {
    console.error('Error creating new user:', error);
    throw error;
  }
}

// Example: Verify a token
async function verifyToken(idToken) {
  try {
    const app = initializeFirebase();
    if (!app) {
      throw new Error('Firebase not initialized');
    }

    const decodedToken = await getAuth().verifyIdToken(idToken);
    console.log('Token verified for user:', decodedToken.uid);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying token:', error);
    throw error;
  }
}

// Example: Delete a user
async function deleteUser(uid) {
  try {
    const app = initializeFirebase();
    if (!app) {
      throw new Error('Firebase not initialized');
    }

    await getAuth().deleteUser(uid);
    console.log('Successfully deleted user:', uid);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

module.exports = {
  createUser,
  verifyToken,
  deleteUser
};

// Test the setup if this file is run directly
if (require.main === module) {
  console.log('Testing Firebase setup...');
  const app = initializeFirebase();
  if (app) {
    console.log('✅ Firebase Admin SDK is working!');
  } else {
    console.log('❌ Firebase Admin SDK setup failed');
  }
}
