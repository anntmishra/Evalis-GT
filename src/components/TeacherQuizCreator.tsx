import React, { useState, useEffect } from 'react';
import { createQuiz } from '../api/quizService';
import axios from 'axios';
import config from '../config/environment';

const API_URL = config.API_BASE_URL;

interface Question {
  questionText: string;
  questionType: 'multiple_choice';
  marks: number;
  options: { optionText: string; isCorrect: boolean }[];
}

const TeacherQuizCreator: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
      const headers = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      console.log('Loading subjects and batches...');
      
      const [subjectsRes, batchesRes] = await Promise.all([
        axios.get(`${API_URL}/subjects`, headers),
        axios.get(`${API_URL}/batches`, headers)
      ]);
      
      console.log('Subjects:', subjectsRes.data);
      console.log('Batches:', batchesRes.data);
      
      setSubjects(subjectsRes.data);
      setBatches(batchesRes.data);
    } catch (error: any) {
      console.error('Error loading data:', error);
      setMessage(`Error loading data: ${error.response?.data?.message || error.message}`);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      questionText: '',
      questionType: 'multiple_choice',
      marks: 1,
      options: [
        { optionText: '', isCorrect: false },
        { optionText: '', isCorrect: false }
      ]
    }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.push({ optionText: '', isCorrect: false });
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, field: string, value: any) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = { ...updated[qIndex].options[oIndex], [field]: value };
    setQuestions(updated);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      // Validation
      if (!title || !subjectId || !batchId || !startDate || !endDate || questions.length === 0) {
        setMessage('Please fill all required fields');
        return;
      }

      const quizData = {
        title,
        description,
        subjectId,
        batchId,
        timeLimit,
        startDate,
        endDate,
        isPublished,
        questions
      };

      await createQuiz(quizData);
      setMessage('Quiz created successfully!');
      
      // Reset form
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('Error creating quiz:', error);
      setMessage(error.response?.data?.message || 'Error creating quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Create Quiz</h2>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block font-medium mb-2">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-2">Subject *</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select Subject</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-2">Batch *</label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select Batch</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block font-medium mb-2">Time Limit (min)</label>
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-medium mb-2">Start Date *</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-medium mb-2">End Date *</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="mr-2"
            />
            Publish immediately
          </label>
        </div>

        <div className="border-t pt-4 mt-6">
          <h3 className="text-xl font-bold mb-4">Questions</h3>
          
          {questions.map((q, qIdx) => (
            <div key={qIdx} className="border p-4 mb-4 rounded">
              <h4 className="font-medium mb-2">Question {qIdx + 1}</h4>
              
              <textarea
                value={q.questionText}
                onChange={(e) => updateQuestion(qIdx, 'questionText', e.target.value)}
                placeholder="Enter question"
                className="w-full border rounded px-3 py-2 mb-2"
                rows={2}
              />

              <div className="mb-2">
                <label className="block text-sm mb-1">Marks</label>
                <input
                  type="number"
                  value={q.marks}
                  onChange={(e) => updateQuestion(qIdx, 'marks', parseInt(e.target.value))}
                  className="border rounded px-3 py-1"
                  min="1"
                />
              </div>

              <div className="space-y-2">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt.optionText}
                      onChange={(e) => updateOption(qIdx, oIdx, 'optionText', e.target.value)}
                      placeholder={`Option ${oIdx + 1}`}
                      className="flex-1 border rounded px-3 py-1"
                    />
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={opt.isCorrect}
                        onChange={(e) => updateOption(qIdx, oIdx, 'isCorrect', e.target.checked)}
                        className="mr-1"
                      />
                      Correct
                    </label>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addOption(qIdx)}
                className="mt-2 text-blue-600 text-sm"
              >
                + Add Option
              </button>
            </div>
          ))}

          <button
            onClick={addQuestion}
            className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
          >
            + Add Question
          </button>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherQuizCreator;
