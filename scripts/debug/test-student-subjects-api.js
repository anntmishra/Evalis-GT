const { Student, Subject, Batch, Semester } = require('./server/models');
const { connectDB } = require('./server/config/db');
const axios = require('axios');

async function testStudentSubjectsAPI() {
    try {
        await connectDB();
        console.log('🔍 Testing Student Subjects API...\n');

        // Find Abhay's student record
        const abhay = await Student.findOne({
            where: { 
                name: 'Abhay Charan'
            }
        });
        
        if (!abhay) {
            console.log('❌ No student found with name "Abhay Charan"');
            return;
        }

        console.log(`✅ Found student: ${abhay.name} (${abhay.email})`);
        console.log(`   Student ID: ${abhay.id}`);
        console.log(`   Batch: ${abhay.batch}`);
        console.log(`   Active Semester: ${abhay.activeSemesterId}`);
        console.log('');

        // Test the database query logic directly (mimicking getCurrentStudentSubjects)
        const { Op } = require('sequelize');
        
        // Base where clause: include subjects for student's batch OR legacy subjects with null batchId
        const whereClause = {
            [Op.or]: [
                { batchId: abhay.batch },
                { batchId: null } // Include legacy subjects not assigned to any batch
            ]
        };
        
        // If student has active semester, also filter by semester
        if (abhay.activeSemesterId) {
            whereClause[Op.and] = {
                [Op.or]: [
                    { semesterId: abhay.activeSemesterId },
                    { semesterId: null } // Include legacy subjects not assigned to any semester
                ]
            };
        }

        console.log('🔍 Testing database query with whereClause:', JSON.stringify(whereClause, null, 2));

        const subjects = await Subject.findAll({
            where: whereClause,
            include: [
                { model: Semester },
                { model: Batch },
            ]
        });

        console.log(`📚 Database query returned ${subjects.length} subjects:`);
        subjects.forEach((subject, index) => {
            console.log(`${index + 1}. ${subject.name} (${subject.id})`);
            console.log(`   Batch: ${subject.batchId}, Semester: ${subject.semesterId}`);
        });

        console.log('\n🌐 Now testing the API endpoint...');
        
        // We can't easily test authenticated endpoint without proper JWT token
        // But let's check what subjects exist for the batch
        console.log(`\n📋 All subjects for batch "${abhay.batch}":`);
        const batchSubjects = await Subject.findAll({
            where: { batchId: abhay.batch },
            include: [
                { model: Semester },
                { model: Batch },
            ]
        });

        if (batchSubjects.length === 0) {
            console.log('❌ No subjects found for this batch!');
            
            // Check if batch ID format issue
            console.log('\n🔍 Checking all available subjects and their batch IDs:');
            const allSubjects = await Subject.findAll();
            allSubjects.forEach(subject => {
                console.log(`- ${subject.name}: batchId="${subject.batchId}", semesterId="${subject.semesterId}"`);
            });

            console.log('\n🔍 Checking all available batches:');
            const allBatches = await Batch.findAll();
            allBatches.forEach(batch => {
                console.log(`- Batch ID: "${batch.id}", Name: "${batch.name}"`);
            });
        } else {
            console.log(`✅ Found ${batchSubjects.length} subjects for batch "${abhay.batch}"`);
            batchSubjects.forEach((subject, index) => {
                console.log(`${index + 1}. ${subject.name} (${subject.id})`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testStudentSubjectsAPI();
