const { Student, Subject, Batch, Semester } = require('./server/models');
const { connectDB } = require('./server/config/db');
const axios = require('axios');

async function testStudentPortalAPI() {
    try {
        await connectDB();
        console.log('🔍 Testing Student Portal API for subject fetching...\n');

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

        console.log(`✅ Found student: ${abhay.name}`);
        console.log(`   Student ID: ${abhay.id}`);
        console.log(`   Batch: ${abhay.batch}`);
        console.log(`   Active Semester: ${abhay.activeSemesterId}`);
        console.log('');

        // Simulate the exact logic from getCurrentStudentSubjects
        const { Op } = require('sequelize');
        
        // Simplified where clause: include subjects for student's batch OR legacy subjects with null batchId
        let whereClause = {
            [Op.or]: [
                { batchId: abhay.batch },
                { batchId: null } // Include legacy subjects not assigned to any batch
            ]
        };
        
        // If student has active semester, create a more complex condition
        if (abhay.activeSemesterId) {
            whereClause = {
                [Op.and]: [
                    // Must match batch
                    {
                        [Op.or]: [
                            { batchId: abhay.batch },
                            { batchId: null }
                        ]
                    },
                    // Must match semester or be semester-agnostic
                    {
                        [Op.or]: [
                            { semesterId: abhay.activeSemesterId },
                            { semesterId: null }
                        ]
                    }
                ]
            };
        }

        console.log('🔍 Using whereClause:', JSON.stringify(whereClause, null, 2));

        const subjects = await Subject.findAll({
            where: whereClause,
            include: [
                { model: Semester },
                { model: Batch },
            ]
        });

        console.log(`📚 Query returned ${subjects.length} subjects:`);
        if (subjects.length > 0) {
            subjects.forEach((subject, index) => {
                console.log(`${index + 1}. ${subject.name} (${subject.id})`);
                console.log(`   Batch: ${subject.batchId}, Semester: ${subject.semesterId}`);
                console.log(`   Credits: ${subject.credits}`);
            });
        } else {
            console.log('❌ No subjects returned by the query!');
            
            // Debug: check subject details
            console.log('\n🔍 Debug: Checking subject that should match...');
            const debugSubject = await Subject.findOne({
                where: { id: 'CSE101' }
            });
            
            if (debugSubject) {
                console.log(`Subject "${debugSubject.name}"`);
                console.log(`  batchId: "${debugSubject.batchId}"`);
                console.log(`  semesterId: "${debugSubject.semesterId}"`);
                console.log(`Student batch: "${abhay.batch}"`);
                console.log(`Student activeSemesterId: "${abhay.activeSemesterId}"`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

testStudentPortalAPI();
