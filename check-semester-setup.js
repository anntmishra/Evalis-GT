const { Student, Subject, Batch, Semester } = require('./server/models');
const { connectDB } = require('./server/config/db');

async function checkSemesterSetup() {
    try {
        await connectDB();
        console.log('🔍 Checking semester setup for Abhay...\n');

        // Find Abhay's student record
        const abhay = await Student.findOne({
            where: { name: 'Abhay Charan' }
        });
        
        console.log(`Student: ${abhay.name}`);
        console.log(`Batch: ${abhay.batch}`);
        console.log(`Active Semester: ${abhay.activeSemesterId}\n`);

        // Check all semesters for this batch
        console.log('📅 All semesters for this batch:');
        const semesters = await Semester.findAll({
            where: { batchId: abhay.batch },
            order: [['number', 'ASC']]
        });
        
        semesters.forEach(semester => {
            const isActive = semester.id === abhay.activeSemesterId ? ' ← ACTIVE' : '';
            console.log(`- ${semester.name} (${semester.id}) - Semester ${semester.number}${isActive}`);
        });

        // Check all subjects for this batch
        console.log('\n📚 All subjects for this batch:');
        const subjects = await Subject.findAll({
            where: { batchId: abhay.batch },
            include: [{ model: Semester }],
            order: [['name', 'ASC']]
        });
        
        if (subjects.length === 0) {
            console.log('❌ No subjects found for this batch');
        } else {
            subjects.forEach(subject => {
                const semesterInfo = subject.Semester ? 
                    `${subject.Semester.name} (Semester ${subject.Semester.number})` : 
                    'No semester assigned';
                console.log(`- ${subject.name} (${subject.id}) → ${semesterInfo}`);
            });
        }

        // Suggest fix
        console.log('\n💡 SUGGESTED FIXES:');
        console.log('Option 1: Set Abhay\'s active semester to Semester 1 (2023-2027-S-1)');
        console.log('Option 2: Make the subject semester-agnostic (set semesterId to null)');
        console.log('Option 3: Allow students to see subjects from all semesters in their batch');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

checkSemesterSetup();
