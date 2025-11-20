import React, { useState, useEffect } from 'react';
import { getTeacherQuizzes, deleteQuiz } from '../api/quizService';
import TeacherQuizCreator from './TeacherQuizCreator';
import TeacherQuizResults from './TeacherQuizResults';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Plus, Trash2, BarChart2, Clock, BookOpen, Users } from 'lucide-react';
import { Badge } from './ui/badge';

const TeacherQuizManager: React.FC = () => {
  const [view, setView] = useState<'list' | 'create' | 'results'>('list');
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (view === 'list') {
      loadQuizzes();
    }
  }, [view]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const data = await getTeacherQuizzes();
      setQuizzes(data);
    } catch (error) {
      console.error('Error loading quizzes:', error);
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Quizzes</h2>
        <Button onClick={() => setView('create')} className="bg-black text-white hover:bg-gray-800">
          <Plus className="h-4 w-4 mr-2" />
          Create New Quiz
        </Button>
      </div>

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
        <div className="grid gap-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-md transition-shadow">
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
                      {quiz.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-6 flex gap-3 border-t pt-4">
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
