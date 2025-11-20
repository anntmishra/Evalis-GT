import React, { useState, useEffect } from 'react';
import { getTeacherQuizzes } from '../api/quizService';
import TeacherQuizResults from './TeacherQuizResults';

const TeacherQuizList: React.FC = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const data = await getTeacherQuizzes();
      setQuizzes(data);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (selectedQuizId) {
    return <TeacherQuizResults quizId={selectedQuizId} onBack={() => setSelectedQuizId(null)} />;
  }

  if (loading) {
    return <div className="p-6">Loading quizzes...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">My Quizzes</h2>
      
      {quizzes.length === 0 ? (
        <p className="text-gray-500">No quizzes created yet.</p>
      ) : (
        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{quiz.title}</h3>
                  <p className="text-gray-600 mb-4">{quiz.description}</p>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Subject:</span>{' '}
                      <span className="font-medium">{quiz.Subject?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Batch:</span>{' '}
                      <span className="font-medium">{quiz.Batch?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Questions:</span>{' '}
                      <span className="font-medium">{quiz.QuizQuestions?.length || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Marks:</span>{' '}
                      <span className="font-medium">{quiz.totalMarks}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Time Limit:</span>{' '}
                      <span className="font-medium">{quiz.timeLimit} min</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>{' '}
                      <span className={`font-medium ${quiz.isPublished ? 'text-green-600' : 'text-yellow-600'}`}>
                        {quiz.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-gray-500">
                    <p>Start: {new Date(quiz.startDate).toLocaleString()}</p>
                    <p>End: {new Date(quiz.endDate).toLocaleString()}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedQuizId(quiz.id)}
                  className="ml-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  View Results
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherQuizList;
