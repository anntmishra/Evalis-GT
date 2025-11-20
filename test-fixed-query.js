const { Student, Subject, Batch, Semester } = require('./server/models');
const { connectDB } = require('./server/config/db');

async function testFixedQuery() {
    try {
        await connectDB();
        console.log('🔍 Testing FIXED query logic...\n');

        // Find Abhay's student record
        const abhay = await Student.findOne({
            where: { name: 'Abhay Charan' }
        });
        
        console.log(`Student: ${abhay.name}`);
        console.log(`Batch: ${abhay.batch}`);
        console.log(`Active Semester: ${abhay.activeSemesterId}\n`);

        // New simplified logic - show all subjects from student's batch
        const { Op } = require('sequelize');
        const whereClause = {
            [Op.or]: [
                { batchId: abhay.batch },
                { batchId: null } // Include legacy subjects not assigned to any batch
            ]
        };

        console.log('🔍 Using simplified whereClause:', JSON.stringify(whereClause, null, 2));

        const subjects = await Subject.findAll({
            where: whereClause,
            include: [
                { model: Semester },
                { model: Batch },
            ],
            order: [
                [{ model: Semester }, 'number', 'ASC'], // Order by semester number
                ['name', 'ASC'] // Then by subject name
            ]
        });

        console.log(`📚 Query returned ${subjects.length} subjects:`);
        if (subjects.length > 0) {
            subjects.forEach((subject, index) => {
                const semesterInfo = subject.Semester ? 
                    `Semester ${subject.Semester.number} (${subject.Semester.name})` : 
                    'No semester assigned';
                console.log(`${index + 1}. ${subject.name} (${subject.id})`);
                console.log(`   ${semesterInfo}`);
                console.log(`   Credits: ${subject.credits}`);
                console.log('');
            });
            console.log('✅ SUCCESS: Subjects are now visible!');
        } else {
            console.log('❌ Still no subjects returned');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

testFixedQuery();
