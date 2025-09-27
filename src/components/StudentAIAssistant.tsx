import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  MessageCircle, 
  Brain, 
  Target, 
  Sparkles,
  Send,
  Loader2,
  User,
  Bot,
  ChevronDown,
  ChevronUp,
  EyeOff
} from 'lucide-react';
import { 
  StudentDataForAnalysis,
  queryGoogleAI,
  getRealTimeStudentData
} from '../api/aiAnalyzerService';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface StudentAIAssistantProps {
  studentId: string;
  studentName?: string;
  subjects?: Array<{id: string, name: string}>;
  stats?: {
    totalSubjects: number;
    completedAssignments: number;
    pendingAssignments: number;
    averageGrade: number;
    cgpa: number;
  };
}

const StudentAIAssistant: React.FC<StudentAIAssistantProps> = ({ 
  studentId, 
  studentName, 
  subjects = [],
  stats 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<StudentDataForAnalysis | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const [showQuickQuestions, setShowQuickQuestions] = useState(() => {
    // Load preference from localStorage, default to true
    const saved = localStorage.getItem('ai-assistant-show-quick-questions');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [enableQuickQuestions, setEnableQuickQuestions] = useState(() => {
    // Load preference from localStorage, default to true
    const saved = localStorage.getItem('ai-assistant-enable-quick-questions');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Quick insight prompts organized by category
  const quickPromptCategories = {
    "Performance": [
      "How can I improve my overall performance?",
      "What are my strengths and weaknesses?",
      "How is my recent performance trend?"
    ],
    "Study Tips": [
      "Give me study suggestions for this week",
      "How should I prioritize my subjects?",
      "What study methods work best for my learning style?"
    ],
    "Subjects": [
      "Which subjects should I focus on more?",
      "What's my best performing subject?",
      "Which subject needs the most attention?"
    ],
    "Time Management": [
      "How is my submission pattern?",
      "Am I submitting assignments on time?",
      "How can I improve my time management?"
    ]
  };

  // Fetch student data when component mounts or opens
  useEffect(() => {
    if (isOpen && !studentData) {
      fetchStudentData();
    }
  }, [isOpen, studentId]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getRealTimeStudentData(studentId);
      
      if (studentName) {
        data.name = studentName;
      }
      
      setStudentData(data);
      
      // Generate welcome message with initial insights
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `Hello ${data.name}! 🎓 I'm your AI academic assistant. I can analyze your performance and provide personalized guidance. Your current overall grade is ${data.grades.overall}% and you're ${data.performanceTrend}. What would you like to know?`,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
      
      // Generate quick insights
      generateInitialInsights(data);
      
    } catch (err) {
      console.error('Error fetching student data:', err);
      setError('Failed to load your academic data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateInitialInsights = (data: StudentDataForAnalysis) => {
    const insights: string[] = [];
    
    // Performance trend insight
    if (data.performanceTrend === 'improving') {
      insights.push("📈 Great job! Your performance is improving");
    } else if (data.performanceTrend === 'declining') {
      insights.push("📉 Your performance needs attention");
    } else {
      insights.push("📊 Your performance is stable");
    }
    
    // Grade analysis
    if (data.grades.overall >= 90) {
      insights.push("🌟 Excellent overall performance!");
    } else if (data.grades.overall >= 80) {
      insights.push("👍 Good overall performance");
    } else if (data.grades.overall >= 70) {
      insights.push("⚠️ Room for improvement in grades");
    } else {
      insights.push("🚨 Significant improvement needed");
    }
    
    // Submission pattern
    const totalSubmissions = data.submissions.onTime + data.submissions.late;
    const onTimePercentage = totalSubmissions > 0 ? (data.submissions.onTime / totalSubmissions) * 100 : 0;
    
    if (onTimePercentage >= 90) {
      insights.push("⏰ Excellent submission timing!");
    } else if (onTimePercentage >= 70) {
      insights.push("📅 Good submission habits");
    } else {
      insights.push("⚡ Work on timely submissions");
    }
    
    setInsights(insights);
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || newMessage.trim();
    if (!textToSend || isSending) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: textToSend,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsSending(true);
    
    try {
      if (studentData) {
        const aiResponseText = await queryGoogleAI(studentData, textToSend, subjects);
        
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: aiResponseText,
          sender: 'ai',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiResponse]);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I encountered an error while analyzing your data. Please try again.",
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleQuickQuestions = () => {
    const newValue = !showQuickQuestions;
    setShowQuickQuestions(newValue);
    // Save preference to localStorage
    localStorage.setItem('ai-assistant-show-quick-questions', JSON.stringify(newValue));
  };

  const toggleEnableQuickQuestions = () => {
    const newValue = !enableQuickQuestions;
    setEnableQuickQuestions(newValue);
    // Save preference to localStorage
    localStorage.setItem('ai-assistant-enable-quick-questions', JSON.stringify(newValue));
    // If disabling, also collapse the panel
    if (!newValue) {
      setShowQuickQuestions(false);
    }
  };

  if (!isOpen) {
    return (
      <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer bg-white group">
        <CardContent className="p-6" onClick={() => setIsOpen(true)}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-4 bg-black rounded-2xl text-white group-hover:bg-gray-800 transition-colors duration-300">
                <Brain className="h-6 w-6" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-black mb-2">AI Academic Assistant</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Get personalized insights and guidance for your academic journey
              </p>
              <div className="flex flex-wrap gap-2">
                {stats && (
                  <>
                    <Badge className="bg-gray-100 text-gray-800 border-0 font-medium">
                      {stats.averageGrade.toFixed(1)}% Average
                    </Badge>
                    <Badge className="bg-gray-100 text-gray-800 border-0 font-medium">
                      {stats.completedAssignments} Completed
                    </Badge>
                    <Badge className="bg-gray-100 text-gray-800 border-0 font-medium">
                      {stats.pendingAssignments} Pending
                    </Badge>
                  </>
                )}
              </div>
            </div>
            <Button className="bg-black hover:bg-gray-800 text-white border-0 px-6 py-3 text-sm font-medium transition-all duration-300">
              <MessageCircle className="h-4 w-4 mr-2" />
              Start Chat
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 shadow-xl h-[700px] flex flex-col bg-white">
      <CardHeader className="bg-black text-white rounded-t-lg border-b-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-2 bg-white bg-opacity-10 rounded-xl">
                <Brain className="h-6 w-6" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-black"></div>
            </div>
            <div>
              <CardTitle className="text-white font-bold text-lg">AI Academic Assistant</CardTitle>
              <CardDescription className="text-gray-300 text-sm">
                Powered by Gemini AI • Real-time analysis
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white hover:bg-opacity-10 h-8 w-8 p-0 rounded-lg transition-all duration-200"
          >
            <span className="text-lg">✕</span>
          </Button>
        </div>
      </CardHeader>

      {loading ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center py-12">
            <div className="relative mb-6">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-black" />
              <div className="absolute inset-0 rounded-full border-2 border-gray-200"></div>
            </div>
            <p className="text-gray-600 font-medium">Analyzing your academic data...</p>
            <p className="text-gray-400 text-sm mt-1">This may take a moment</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Data</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-black hover:bg-gray-800 text-white"
            >
              Try Again
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Quick Insights */}
          {insights.length > 0 && (
            <div className="p-4 bg-gray-50 border-b">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Quick Insights</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {insights.map((insight, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {insight}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'ai' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === 'user' 
                    ? 'bg-blue-600 text-white ml-4' 
                    : 'bg-gray-100 text-gray-900 mr-4'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  <p className={`text-xs mt-2 opacity-70 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {message.sender === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Prompts */}
          {enableQuickQuestions && (
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Quick Questions</span>
                  {!showQuickQuestions && (
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                      {Object.keys(quickPromptCategories).length} categories
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleEnableQuickQuestions}
                    className="h-6 w-6 p-0 hover:bg-gray-200"
                    title="Hide quick questions permanently"
                  >
                    <EyeOff className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleQuickQuestions}
                    className="h-6 w-6 p-0 hover:bg-gray-200"
                    title={showQuickQuestions ? "Hide quick questions" : "Show quick questions"}
                  >
                    {showQuickQuestions ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              {showQuickQuestions && (
                <div className="space-y-3">
                  {Object.entries(quickPromptCategories).slice(0, 2).map(([category, prompts]) => (
                    <div key={category}>
                      <h4 className="text-xs font-medium text-gray-600 mb-2">{category}</h4>
                      <div className="grid grid-cols-1 gap-1">
                        {prompts.slice(0, 2).map((prompt, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="justify-start text-left h-auto py-2 px-3 text-xs"
                            onClick={() => handleSendMessage(prompt)}
                            disabled={isSending}
                          >
                            <span className="truncate">{prompt}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Option to re-enable quick questions if disabled */}
          {!enableQuickQuestions && (
            <div className="p-3 border-t bg-gray-50">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleEnableQuickQuestions}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                <Target className="h-3 w-3 mr-1" />
                Show quick questions
              </Button>
            </div>
          )}

          {/* Message Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your grades, performance, or study tips..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isSending}
              />
              <Button 
                onClick={() => handleSendMessage()}
                disabled={!newMessage.trim() || isSending}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default StudentAIAssistant;
