import React, { useState, useEffect } from 'react';
import { getTeacherQuizzes, deleteQuiz, publishQuiz, publishQuizResults } from '../api/quizService';
import TeacherQuizCreator from './TeacherQuizCreator';
import TeacherQuizResults from './TeacherQuizResults';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Plus, Trash2, BarChart2, Clock, BookOpen, Users, Send, CheckCircle2 } from 'lucide-react';
import { Badge } from './ui/badge';

const TeacherQuizManager: React.FC = () => {
  const [view, setView] = useState<'list' | 'create' | 'results'>('list');
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    if (view === 'list') {
      loadQuizzes();
    }
  }, [view]);

  const loadQuizzes = async () => {
    try {
      setLoading(true); setError('');
      const data = await getTeacherQuizzes();
      setQuizzes(data);
    } catch (error) {
      setError('Unable to load quizzes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      try {
        await deleteQuiz(quizId);
        loadQuizzes();
      } catch (error) {
        console.error('Error deleting quiz:', error);
        alert('Failed to delete quiz');
      }
    }
  };

  const handlePublishQuiz = async (quizId: string) => {
    try {
      setActionId(quizId); setError(''); setNotice('');
      await publishQuiz(quizId);
      setNotice('Quiz published to students.');
      await loadQuizzes();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Unable to publish the quiz.');
    } finally {
      setActionId(null);
    }
  };

  const handlePublishResults = async (quizId: string) => {
    try {
      setActionId(quizId); setError(''); setNotice('');
      const result = await publishQuizResults(quizId);
      setNotice(`${result.publishedAttempts} completed result${result.publishedAttempts === 1 ? '' : 's'} published to students.`);
      await loadQuizzes();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Unable to publish quiz results.');
    } finally {
      setActionId(null);
    }
  };

  if (view === 'create') {
    return (
      <div>
        <div className="mb-4">
          <Button variant="outline" onClick={() => setView('list')}>
            ← Back to Quiz List
          </Button>
        </div>
        <TeacherQuizCreator />
      </div>
    );
  }

  if (view === 'results' && selectedQuizId) {
    return (
      <TeacherQuizResults 
        quizId={selectedQuizId} 
        onBack={() => {
          setSelectedQuizId(null);
          setView('list');
        }} 
      />
    );
  }

  return (
    <div className="quiz-workspace space-y-6">
      <div className="quiz-heading"><div><span className="eyebrow">ASSESSMENTS</span><h2>Quizzes that move learning forward.</h2><p>Create, review and understand how your students are doing.</p></div>
        <Button onClick={() => setView('create')} className="quiz-create-button">
          <Plus className="h-4 w-4 mr-2" />
          Create New Quiz
        </Button>
      </div>

      {error && <div role="alert" className="workspace-error">{error}<button onClick={loadQuizzes}>Try again</button></div>}
      {notice && <div role="status" className="workspace-success"><CheckCircle2 size={17}/>{notice}</div>}
      {!loading && quizzes.length > 0 && <div className="quiz-summary"><div><span>YOUR QUIZZES</span><strong>{quizzes.length}</strong></div><div><span>LIVE WITH STUDENTS</span><strong>{quizzes.filter(quiz => quiz.isPublished).length}</strong></div><div><span>RESULTS RELEASED</span><strong>{quizzes.filter(quiz => quiz.showResultsImmediately).length}</strong></div></div>}
      {loading ? (
        <div className="text-center py-8">Loading quizzes...</div>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <BookOpen className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Quizzes Created</h3>
            <p className="text-gray-500 mb-6">Create your first quiz to start assessing students.</p>
            <Button onClick={() => setView('create')}>
              Create Quiz
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="quiz-grid">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="quiz-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{quiz.title}</h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">{quiz.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {quiz.Subject?.name || 'Unknown Subject'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {quiz.Batch?.name || 'Unknown Batch'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {quiz.timeLimit} mins
                      </div>
                      <div className="flex items-center gap-1">
                        <BarChart2 className="h-4 w-4" />
                        {quiz.totalMarks} Marks
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Badge variant={quiz.isPublished ? 'default' : 'secondary'} className={quiz.isPublished ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}>
                      {quiz.isPublished ? 'Live' : 'Draft'}
                    </Badge>
                    <Badge variant={quiz.showResultsImmediately ? 'default' : 'secondary'} className={quiz.showResultsImmediately ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : ''}>
                      {quiz.showResultsImmediately ? 'Results published' : 'Results private'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-6 flex gap-3 border-t pt-4">
                  {!quiz.isPublished && <Button
                    className="flex-1"
                    disabled={actionId === quiz.id}
                    onClick={() => void handlePublishQuiz(quiz.id)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Publish Quiz
                  </Button>}
                  {quiz.isPublished && !quiz.showResultsImmediately && <Button
                    className="flex-1"
                    disabled={actionId === quiz.id || !(quiz.QuizAttempts || []).some((attempt: any) => attempt.status === 'submitted')}
                    onClick={() => void handlePublishResults(quiz.id)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {(quiz.QuizAttempts || []).some((attempt: any) => attempt.status === 'submitted') ? 'Publish Results' : 'Waiting for attempts'}
                  </Button>}
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedQuizId(quiz.id);
                      setView('results');
                    }}
                  >
                    <BarChart2 className="h-4 w-4 mr-2" />
                    View Results
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-red-600 hover:bg-red-50 border-red-200"
                    onClick={() => handleDeleteQuiz(quiz.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherQuizManager;
