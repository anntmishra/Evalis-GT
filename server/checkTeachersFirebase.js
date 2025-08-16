const { Teacher } = require('./models');
const { getFirebaseUserByEmail, admin } = require('./utils/firebaseUtils');

async function checkTeachersAndFirebase() {
    console.log('🔍 Checking Teachers in Database vs Firebase Authentication');
    console.log('==================================================');
    
    try {
        // Get all teachers from database
        console.log('📋 Step 1: Getting all teachers from database...');
        const teachers = await Teacher.findAll({
            attributes: ['id', 'name', 'email'],
            raw: true
        });
        
        console.log(`Found ${teachers.length} teachers in database:`);
        teachers.forEach((teacher, index) => {
            console.log(`   ${index + 1}. ID: ${teacher.id}, Name: ${teacher.name}, Email: ${teacher.email || 'NO EMAIL'}`);
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
        
        // Cross-reference: Find teachers in database that still have Firebase accounts
        console.log('\n🔍 Step 3: Cross-referencing database teachers with Firebase users...');
        const teachersWithFirebaseAccounts = [];
        
        for (const teacher of teachers) {
            if (teacher.email) {
                const firebaseUser = firebaseUsers.find(user => user.email === teacher.email);
                if (firebaseUser) {
                    teachersWithFirebaseAccounts.push({
                        teacher,
                        firebaseUID: firebaseUser.uid
                    });
                }
            }
        }
        
        if (teachersWithFirebaseAccounts.length > 0) {
            console.log(`\n⚠️  Found ${teachersWithFirebaseAccounts.length} teachers that still have Firebase accounts:`);
            teachersWithFirebaseAccounts.forEach((match, index) => {
                console.log(`   ${index + 1}. Teacher ID: ${match.teacher.id}, Name: ${match.teacher.name}, Email: ${match.teacher.email}, Firebase UID: ${match.firebaseUID}`);
            });
        } else {
            console.log('\n✅ No teachers found with Firebase accounts - all properly deleted!');
        }
        
        // Find Firebase users that don't correspond to any teacher
        console.log('\n🔍 Step 4: Finding Firebase users that are not teachers...');
        const orphanedFirebaseUsers = [];
        
        for (const firebaseUser of firebaseUsers) {
            const correspondingTeacher = teachers.find(teacher => teacher.email === firebaseUser.email);
            if (!correspondingTeacher) {
                orphanedFirebaseUsers.push(firebaseUser);
            }
        }
        
        if (orphanedFirebaseUsers.length > 0) {
            console.log(`\n📝 Found ${orphanedFirebaseUsers.length} Firebase users that are not current teachers:`);
            orphanedFirebaseUsers.forEach((user, index) => {
                console.log(`   ${index + 1}. Email: ${user.email}, UID: ${user.uid} (may be admin, student, or deleted teacher)`);
            });
        } else {
            console.log('\n✅ All Firebase users correspond to current teachers.');
        }
        
    } catch (error) {
        console.error('❌ Error checking teachers and Firebase:', error);
    }
}

checkTeachersAndFirebase();
