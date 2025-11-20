import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config/environment';

const API_URL = config.API_BASE_URL;

interface QuizAttempt {
  id: string;
  attemptNumber: number;
  startedAt: string;
  submittedAt: string;
  score: number;
  totalMarks: number;
  passed: boolean;
  timeSpent: number;
  Student: {
    id: string;
    name: string;
    email: string;
  };
  QuizAnswers: Array<{
    id: string;
    isCorrect: boolean;
    marksAwarded: number;
    QuizQuestion: {
      questionText: string;
      marks: number;
    };
    QuizOption: {
      optionText: string;
    };
  }>;
}

interface Quiz {
  id: string;
  title: string;
  totalMarks: number;
  passingMarks: number;
}

const TeacherQuizResults: React.FC<{ quizId: string; onBack: () => void }> = ({ quizId, onBack }) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);

  useEffect(() => {
    loadResults();
  }, [quizId]);

  const loadResults = async () => {
    try {
      const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      const [quizRes, attemptsRes] = await Promise.all([
        axios.get(`${API_URL}/quizzes/${quizId}`, headers),
        axios.get(`${API_URL}/quizzes/${quizId}/attempts`, headers)
      ]);

      setQuiz(quizRes.data);
      setAttempts(attemptsRes.data);
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) return <div className="p-6">Loading...</div>;

  if (selectedAttempt) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <button
          onClick={() => setSelectedAttempt(null)}
          className="mb-4 text-blue-600 hover:underline"
        >
          ← Back to all attempts
        </button>

        <h2 className="text-2xl font-bold mb-4">
          {selectedAttempt.Student.name}'s Attempt
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded">
          <div>
            <p className="text-sm text-gray-600">Score</p>
            <p className="text-2xl font-bold">{selectedAttempt.score} / {selectedAttempt.totalMarks}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className={`text-xl font-bold ${selectedAttempt.passed ? 'text-green-600' : 'text-red-600'}`}>
              {selectedAttempt.passed ? 'Passed' : 'Failed'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Time Spent</p>
            <p className="text-lg">{formatTime(selectedAttempt.timeSpent)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Submitted</p>
            <p className="text-lg">{new Date(selectedAttempt.submittedAt).toLocaleString()}</p>
          </div>
        </div>

        <h3 className="text-xl font-bold mb-4">Detailed Answers</h3>
        <div className="space-y-4">
          {selectedAttempt.QuizAnswers.map((answer, idx) => (
            <div key={answer.id} className="border rounded p-4">
              <p className="font-medium mb-2">
                Q{idx + 1}: {answer.QuizQuestion.questionText}
              </p>
              <div className="ml-4 space-y-1">
                <p className={`${answer.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  Student's Answer: {answer.QuizOption.optionText}
                  {answer.isCorrect ? ' ✓' : ' ✗'}
                </p>
                <p className="text-sm text-gray-600">
                  Marks: {answer.marksAwarded} / {answer.QuizQuestion.marks}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <button
        onClick={onBack}
        className="mb-4 text-blue-600 hover:underline"
      >
        ← Back to quizzes
      </button>

      <h2 className="text-2xl font-bold mb-6">
        Quiz Results: {quiz?.title}
      </h2>

      {attempts.length === 0 ? (
        <p className="text-gray-500">No students have attempted this quiz yet.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attempts.map((attempt) => (
                <tr key={attempt.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{attempt.Student.name}</div>
                      <div className="text-sm text-gray-500">{attempt.Student.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    #{attempt.attemptNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {attempt.score} / {attempt.totalMarks}
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.round((attempt.score / attempt.totalMarks) * 100)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      attempt.passed 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {attempt.passed ? 'Passed' : 'Failed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatTime(attempt.timeSpent)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(attempt.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedAttempt(attempt)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 bg-blue-50 p-4 rounded">
        <h3 className="font-bold mb-2">Summary Statistics</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Attempts</p>
            <p className="text-2xl font-bold">{attempts.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Passed</p>
            <p className="text-2xl font-bold text-green-600">
              {attempts.filter(a => a.passed).length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Failed</p>
            <p className="text-2xl font-bold text-red-600">
              {attempts.filter(a => !a.passed).length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Average Score</p>
            <p className="text-2xl font-bold">
              {attempts.length > 0 
                ? Math.round((attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length) * 100) / 100
                : 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherQuizResults;
