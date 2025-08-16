const { Student } = require('./models');
const { admin } = require('./utils/firebaseUtils');

async function checkStudentsAndFirebase() {
    console.log('🔍 Checking Students in Database vs Firebase Authentication');
    console.log('==================================================');
    
    try {
        // Get all students from database
        console.log('📋 Step 1: Getting all students from database...');
        const students = await Student.findAll({
            attributes: ['id', 'name', 'email'],
            raw: true
        });
        
        console.log(`Found ${students.length} students in database:`);
        students.forEach((student, index) => {
            console.log(`   ${index + 1}. ID: ${student.id}, Name: ${student.name}, Email: ${student.email || 'NO EMAIL'}`);
        });
        
        // Get all users from Firebase
        console.log('\n📋 Step 2: Getting all users from Firebase Authentication...');
        const firebaseUsers = [];
        let nextPageToken;
        
        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            firebaseUsers.push(...listUsersResult.users);
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);
        
        console.log(`Found ${firebaseUsers.length} users in Firebase Authentication:`);
        firebaseUsers.forEach((user, index) => {
            console.log(`   ${index + 1}. Email: ${user.email}, UID: ${user.uid}`);
        });
        
        // Cross-reference: Find students in database that still have Firebase accounts
        console.log('\n🔍 Step 3: Cross-referencing database students with Firebase users...');
        const studentsWithFirebaseAccounts = [];
        
        for (const student of students) {
            if (student.email) {
                const firebaseUser = firebaseUsers.find(user => user.email === student.email);
                if (firebaseUser) {
                    studentsWithFirebaseAccounts.push({
                        student,
                        firebaseUID: firebaseUser.uid
                    });
                }
            }
        }
        
        if (studentsWithFirebaseAccounts.length > 0) {
            console.log(`\n⚠️  Found ${studentsWithFirebaseAccounts.length} students that still have Firebase accounts:`);
            studentsWithFirebaseAccounts.forEach((match, index) => {
                console.log(`   ${index + 1}. Student ID: ${match.student.id}, Name: ${match.student.name}, Email: ${match.student.email}, Firebase UID: ${match.firebaseUID}`);
            });
        } else {
            console.log('\n✅ No students found with Firebase accounts - all properly deleted!');
        }
        
    } catch (error) {
        console.error('❌ Error checking students and Firebase:', error);
    }
}

checkStudentsAndFirebase();
