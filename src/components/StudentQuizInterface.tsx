import React, { useState, useEffect } from 'react';
import { getStudentQuizzes, startQuizAttempt, submitQuizAttempt } from '../api/quizService';

const StudentQuizInterface: React.FC = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [attemptedQuizzes, setAttemptedQuizzes] = useState<any[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<any>({});
  const [startTime, setStartTime] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'attempted'>('available');

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      console.log('Loading student quizzes...');
      const data = await getStudentQuizzes();
      console.log('Student quizzes received:', data);
      
      // Separate available and attempted quizzes
      const available = data.filter((q: any) => !q.QuizAttempts || q.QuizAttempts.length === 0);
      const attempted = data.filter((q: any) => q.QuizAttempts && q.QuizAttempts.length > 0);
      
      setQuizzes(available);
      setAttemptedQuizzes(attempted);
    } catch (error: any) {
      console.error('Error loading quizzes:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  const handleStartQuiz = async (quizId: string) => {
    try {
      setLoading(true);
      const data = await startQuizAttempt(quizId);
      setActiveQuiz(data.quiz);
      setAttempt(data.attempt);
      setStartTime(Date.now());
      setAnswers({});
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error starting quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionId: string, optionId: string) => {
    setAnswers({ ...answers, [questionId]: optionId });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      const answerArray = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId
      }));

      const resultData = await submitQuizAttempt(activeQuiz.id, attempt.id, answerArray, timeSpent);
      setResult(resultData);
      setActiveQuiz(null);
      setAttempt(null);
      loadQuizzes();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error submitting quiz');
    } finally {
      setLoading(false);
    }
  };

  if (selectedResult) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <button
          onClick={() => setSelectedResult(null)}
          className="mb-4 text-blue-600 hover:underline"
        >
          ← Back to Quizzes
        </button>

        <h2 className="text-2xl font-bold mb-4">Quiz Results</h2>
        
        <div className="bg-blue-50 p-6 rounded mb-6">
          <p className="text-3xl font-bold mb-2">
            Score: {selectedResult.score} / {selectedResult.totalMarks}
          </p>
          <p className="text-lg">
            Status: <span className={selectedResult.passed ? 'text-green-600' : 'text-red-600'}>
              {selectedResult.passed ? 'Passed ✓' : 'Failed ✗'}
            </span>
          </p>
          <p className="mt-2">
            Time Spent: {Math.floor(selectedResult.timeSpent / 60)}m {selectedResult.timeSpent % 60}s
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Submitted: {new Date(selectedResult.submittedAt).toLocaleString()}
          </p>
        </div>

        {selectedResult.Quiz?.showResultsImmediately && selectedResult.QuizAnswers && (
          <div>
            <h3 className="text-xl font-bold mb-4">Your Answers</h3>
            <div className="space-y-4">
              {selectedResult.QuizAnswers.map((answer: any, idx: number) => (
                <div key={answer.id} className="border rounded p-4">
                  <p className="font-medium mb-2">
                    Q{idx + 1}: {answer.QuizQuestion.questionText}
                  </p>
                  <div className="ml-4">
                    <p className={`${answer.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                      Your Answer: {answer.QuizOption.optionText}
                      {answer.isCorrect ? ' ✓' : ' ✗'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Marks Awarded: {answer.marksAwarded} / {answer.QuizQuestion.marks}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Quiz Submitted Successfully!</h2>
        <div className="bg-blue-50 p-6 rounded">
          <p className="text-3xl font-bold mb-2">
            Score: {result.score} / {result.totalMarks}
          </p>
          <p className="text-lg">
            Status: <span className={result.passed ? 'text-green-600' : 'text-red-600'}>
              {result.passed ? 'Passed ✓' : 'Failed ✗'}
            </span>
          </p>
          <p className="mt-2">Time Spent: {Math.floor(result.timeSpent / 60)} minutes</p>
        </div>
        <button
          onClick={() => {
            setResult(null);
            loadQuizzes();
          }}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Back to Quizzes
        </button>
      </div>
    );
  }

  if (activeQuiz) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">{activeQuiz.title}</h2>
        <p className="text-gray-600 mb-6">{activeQuiz.description}</p>
        
        <div className="space-y-6">
          {activeQuiz.QuizQuestions.map((question: any, qIdx: number) => (
            <div key={question.id} className="border-b pb-6">
              <p className="font-medium mb-3">
                {qIdx + 1}. {question.questionText} ({question.marks} marks)
              </p>
              
              <div className="space-y-2 ml-4">
                {question.QuizOptions.map((option: any) => (
                  <label key={option.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      checked={answers[question.id] === option.id}
                      onChange={() => handleSelectAnswer(question.id, option.id)}
                      className="mr-3"
                    />
                    <span>{option.optionText}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={handleSubmit}
            disabled={loading || Object.keys(answers).length !== activeQuiz.QuizQuestions.length}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Quiz'}
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to cancel?')) {
                setActiveQuiz(null);
                setAttempt(null);
              }
            }}
            className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Quizzes</h2>
      
      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('available')}
          className={`pb-2 px-4 ${
            activeTab === 'available'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
              : 'text-gray-600'
          }`}
        >
          Available Quizzes ({quizzes.length})
        </button>
        <button
          onClick={() => setActiveTab('attempted')}
          className={`pb-2 px-4 ${
            activeTab === 'attempted'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
              : 'text-gray-600'
          }`}
        >
          Attempted Quizzes ({attemptedQuizzes.length})
        </button>
      </div>

      {/* Available Quizzes Tab */}
      {activeTab === 'available' && (
        <>
          {quizzes.length === 0 ? (
            <p className="text-gray-500">No quizzes available</p>
          ) : (
            <div className="space-y-4">
              {quizzes.map((quiz: any) => (
                <div key={quiz.id} className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-bold mb-2">{quiz.title}</h3>
                  <p className="text-gray-600 mb-4">{quiz.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                    <div>Subject: {quiz.Subject?.name}</div>
                    <div>Total Marks: {quiz.totalMarks}</div>
                    <div>Time Limit: {quiz.timeLimit} minutes</div>
                    <div>Passing Marks: {quiz.passingMarks}</div>
                  </div>

                  <button
                    onClick={() => handleStartQuiz(quiz.id)}
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Starting...' : 'Start Quiz'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Attempted Quizzes Tab */}
      {activeTab === 'attempted' && (
        <>
          {attemptedQuizzes.length === 0 ? (
            <p className="text-gray-500">No attempted quizzes yet</p>
          ) : (
            <div className="space-y-4">
              {attemptedQuizzes.map((quiz: any) => (
                <div key={quiz.id} className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-bold mb-2">{quiz.title}</h3>
                  <p className="text-gray-600 mb-4">{quiz.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                    <div>Subject: {quiz.Subject?.name}</div>
                    <div>Total Marks: {quiz.totalMarks}</div>
                    <div>Time Limit: {quiz.timeLimit} minutes</div>
                    <div>Passing Marks: {quiz.passingMarks}</div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded mb-4">
                    <p className="font-medium mb-2">Your Attempts:</p>
                    {quiz.QuizAttempts.map((att: any) => (
                      <div key={att.id} className="flex justify-between items-center mb-2">
                        <div className="flex-1">
                          <p className="text-sm">
                            Attempt {att.attemptNumber}: {att.score} / {quiz.totalMarks} - 
                            <span className={att.passed ? 'text-green-600' : 'text-red-600'}>
                              {' '}{att.passed ? '✅ Passed' : '❌ Failed'}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(att.submittedAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedResult(att)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Details
                        </button>
                      </div>
                    ))}
                  </div>

                  {quiz.allowMultipleAttempts && quiz.QuizAttempts.length < quiz.maxAttempts && (
                    <button
                      onClick={() => handleStartQuiz(quiz.id)}
                      disabled={loading}
                      className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading ? 'Starting...' : `Retry Quiz (${quiz.QuizAttempts.length}/${quiz.maxAttempts} attempts used)`}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentQuizInterface;
