const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Credentials from seeder.js
const TEACHER_CREDS = {
    email: 'priya.sharma@university.edu',
    password: 'password123'
};

const STUDENT_CREDS = {
    email: 'aarav.patel@university.edu',
    password: 'password123'
};

const runDebugFlow = async () => {
    try {
        console.log('=== Starting Debug Flow ===');

        // 1. Login as Teacher
        console.log('\n1. Logging in as Teacher...');
        const teacherLogin = await axios.post(`${API_URL}/auth/teacher/login`, TEACHER_CREDS);
        const teacherToken = teacherLogin.data.token;
        const teacherId = teacherLogin.data.id;
        console.log('Teacher logged in:', teacherId);
        console.log('Teacher Token:', teacherToken ? `${teacherToken.substring(0, 20)}...` : 'None');

        // 2. Create Quiz
        console.log('\n2. Creating Quiz...');
        const quizData = {
            title: `Debug Quiz ${Date.now()}`,
            description: 'This is a debug quiz created by script',
            subjectId: 'CSE101', // From seeder
            batchId: '2023-2027', // From seeder
            timeLimit: 30,
            totalMarks: 10,
            passingMarks: 4,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            isActive: true,
            isPublished: true,
            questions: [
                {
                    questionText: 'What is 2 + 2?',
                    questionType: 'multiple_choice',
                    marks: 5,
                    options: [
                        { optionText: '3', isCorrect: false },
                        { optionText: '4', isCorrect: true },
                        { optionText: '5', isCorrect: false },
                        { optionText: '22', isCorrect: false }
                    ]
                },
                {
                    questionText: 'Is JavaScript single-threaded?',
                    questionType: 'true_false',
                    marks: 5,
                    options: [
                        { optionText: 'True', isCorrect: true },
                        { optionText: 'False', isCorrect: false }
                    ]
                }
            ]
        };

        const createResponse = await axios.post(`${API_URL}/quizzes`, quizData, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        console.log('Quiz Created:', createResponse.data.quiz.id);
        console.log('Quiz Published Status:', createResponse.data.quiz.isPublished);

        // 3. Login as Student
        console.log('\n3. Logging in as Student...');
        const studentLogin = await axios.post(`${API_URL}/auth/student/login`, STUDENT_CREDS);
        const studentToken = studentLogin.data.token;
        const studentId = studentLogin.data.id;
        console.log('Student logged in:', studentId);
        console.log('Student Token:', studentToken ? `${studentToken.substring(0, 20)}...` : 'None');

        // 4. Fetch Student Quizzes
        console.log('\n4. Fetching Student Quizzes...');
        const quizzesResponse = await axios.get(`${API_URL}/quizzes/student`, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });

        const quizzes = quizzesResponse.data.quizzes;
        console.log(`Found ${quizzes.length} quizzes for student`);

        const foundQuiz = quizzes.find(q => q.id === createResponse.data.quiz.id);
        if (foundQuiz) {
            console.log('✅ SUCCESS: Created quiz is visible to student!');
            console.log('Quiz Details:', {
                id: foundQuiz.id,
                title: foundQuiz.title,
                isPublished: foundQuiz.isPublished,
                isActive: foundQuiz.isActive
            });
        } else {
            console.log('❌ FAILURE: Created quiz is NOT visible to student.');
            console.log('Available Quizzes:', quizzes.map(q => ({ id: q.id, title: q.title })));
        }

    } catch (error) {
        console.error('\n❌ Error in debug flow:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Status Text:', error.response.statusText);
            console.error('Headers:', error.response.headers);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
            console.error('Request URL:', error.config?.url);
            console.error('Request Method:', error.config?.method);
            console.error('Request Data:', error.config?.data);
        } else if (error.request) {
            console.error('No response received');
            console.error('Request:', error.request);
        } else {
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
        }
    }
};

runDebugFlow();
