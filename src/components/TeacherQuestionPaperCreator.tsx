import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Grid,
  Chip,
  IconButton,
  Divider,
  Alert,
  SelectChangeEvent,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Card,
  CardMedia,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { 
  Add, 
  Delete, 
  Save, 
  Psychology, 
  ExpandMore, 
  Lightbulb, 
  AutoAwesome, 
  School,
  TipsAndUpdates,
  BarChart,
  Image as ImageIcon,
  PictureAsPdf,
  Close,
  Chat,
  Edit,
  Assignment,
  ArrowBack
} from '@mui/icons-material';
import { Subject } from '../types/university';
import { EXAM_TYPES } from '../constants/universityData';
import questionEnhancerService, { 
  Question as EnhancerQuestion, 
  EnhancePaperResponse,
  CognitiveLevel,
  BloomTextAnomalyResponse
} from '../api/questionEnhancerService';
import { generateQuestionPaperPDF, PDFQuestion } from '../api/pdfExportService';
import { 
  BLOOM_TAXONOMY, 
  getAllBloomLevels,
  getBloomLevel,
  suggestActionVerbs,
  getQuestionStarters,
  type BloomLevelDetails,
  type BloomLevel,
  mapLegacyToRevised 
} from '../config/bloomTaxonomy';

interface QuestionPaperCreatorProps {
  subjects: Subject[];
  examTypes: typeof EXAM_TYPES;
  // Made optional so parent components aren't forced to supply it; defaults to a no-op.
  onQuestionPaperCreated?: () => void;
}

interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  marks: number;
  type: 'mcq' | 'short' | 'long';
  mcqOptions?: MCQOption[];
  mcqLayout?: 'vertical' | 'horizontal' | 'grid';
  showCorrectAnswer?: boolean;
  ai_enhanced?: boolean;
  ai_analysis?: {
    complexity?: number;
    cognitive_level?: CognitiveLevel;
    improvement_reasons?: string[];
  };
  image?: {
    url: string;
    file?: File;
    caption?: string;
  };
}

const TeacherQuestionPaperCreator: React.FC<QuestionPaperCreatorProps> = ({
  subjects,
  examTypes,
  onQuestionPaperCreated = () => {}
}) => {
  const [title, setTitle] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedExamType, setSelectedExamType] = useState<string>('');
  const [duration, setDuration] = useState<number>(180); // in minutes
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentQuestionMarks, setCurrentQuestionMarks] = useState<number>(10);
  const [currentQuestionType, setCurrentQuestionType] = useState<'mcq' | 'short' | 'long'>('short');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Image related state
  const [currentImage, setCurrentImage] = useState<File | null>(null);
  const [currentImagePreview, setCurrentImagePreview] = useState<string | null>(null);
  const [currentImageCaption, setCurrentImageCaption] = useState<string>('');
  const [showImageInput, setShowImageInput] = useState<boolean>(false);
  
  // AI-related state
  const [aiServiceAvailable, setAiServiceAvailable] = useState<boolean>(false);
  const [aiEnhancing, setAiEnhancing] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState<boolean>(false);
  const [selectedCognitiveLevel, setSelectedCognitiveLevel] = useState<CognitiveLevel>('application');
  const [suggestionTopic, setSuggestionTopic] = useState<string>('');
  const [paperAnalysis, setPaperAnalysis] = useState<EnhancePaperResponse['paper_analysis'] | null>(null);
  const [showAnalysis, setShowAnalysis] = useState<boolean>(false);
  
  // PDF export state
  const [pdfExporting, setPdfExporting] = useState<boolean>(false);
  
  // Direct prompt generation state
  const [promptText, setPromptText] = useState<string>('');
  const [promptGenerating, setPromptGenerating] = useState<boolean>(false);
  const [promptResults, setPromptResults] = useState<string[]>([]);

  // Custom enhancement prompt state
  const [enhancePromptOpen, setEnhancePromptOpen] = useState<boolean>(false);
  const [enhancePromptText, setEnhancePromptText] = useState<string>('');
  const [customEnhancing, setCustomEnhancing] = useState<boolean>(false);

  // Bloom Taxonomy state
  const [bloomAnomalyAnalyzing, setBloomAnomalyAnalyzing] = useState<boolean>(false);
  const [bloomAnalysisResult, setBloomAnalysisResult] = useState<BloomTextAnomalyResponse | null>(null);
  const [showBloomAnalysis, setShowBloomAnalysis] = useState<boolean>(false);
  const [targetBloomLevel, setTargetBloomLevel] = useState<CognitiveLevel>('application');

  // Course Outcomes (CO) state
  const [courseOutcomes, setCourseOutcomes] = useState<Array<{
    id: string;
    number: string;
    statement: string;
    bloomLevel: CognitiveLevel;
  }>>([]);
  const [selectedCOs, setSelectedCOs] = useState<string[]>([]);
  const [showCOInput, setShowCOInput] = useState<boolean>(false);
  const [newCO, setNewCO] = useState({ number: '', statement: '', bloomLevel: 'application' as CognitiveLevel });
  const [useCOMapping, setUseCOMapping] = useState<boolean>(false);

  // MCQ Options state
  const [mcqOptions, setMcqOptions] = useState<MCQOption[]>([]);
  const [currentOption, setCurrentOption] = useState<string>('');
  const [mcqLayout, setMcqLayout] = useState<'vertical' | 'horizontal' | 'grid'>('vertical');
  const [showCorrectAnswer, setShowCorrectAnswer] = useState<boolean>(false);
  const [compactMode, setCompactMode] = useState<boolean>(true);

  // Bloom's Taxonomy Helper Dialog
  const [showBloomHelper, setShowBloomHelper] = useState<boolean>(false);
  const [selectedBloomInfo, setSelectedBloomInfo] = useState<BloomLevelDetails | null>(null);

  // Check if AI service is available on component mount
  useEffect(() => {
    const checkAiService = async () => {
      try {
        const available = await questionEnhancerService.isServiceAvailable();
        setAiServiceAvailable(available);
      } catch (err) {
        console.error('Error checking AI service availability:', err);
        setAiServiceAvailable(false);
      }
    };

    checkAiService();
  }, []);

  const handleSubjectChange = (event: SelectChangeEvent) => {
    setSelectedSubject(event.target.value);
  };

  const handleExamTypeChange = (event: SelectChangeEvent) => {
    setSelectedExamType(event.target.value);
  };

  const handleQuestionTypeChange = (event: SelectChangeEvent) => {
    setCurrentQuestionType(event.target.value as 'mcq' | 'short' | 'long');
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, etc.)');
      return;
    }
    
    // Limit file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }
    
    setCurrentImage(file);
    
    // Convert to base64 immediately for reliable PDF export
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      setCurrentImagePreview(base64String);
      console.log('Image converted to base64, length:', base64String.length);
    };
    reader.onerror = (error) => {
      console.error('Error reading image file:', error);
      setError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
    
    setError(null);
  };

  const removeCurrentImage = () => {
    // No need to revoke URL since we're using base64 now
    setCurrentImage(null);
    setCurrentImagePreview(null);
    setCurrentImageCaption('');
  };

  const addQuestion = () => {
    if (!currentQuestion.trim()) {
      setError('Question text cannot be empty');
      return;
    }
    
    if (currentQuestion.trim().length < 10) {
      setError('Question text must be at least 10 characters long');
      return;
    }
    
    if (currentQuestion.trim().length > 2000) {
      setError('Question text must not exceed 2000 characters');
      return;
    }

    // Validate MCQ options if question type is MCQ
    if (currentQuestionType === 'mcq') {
      if (mcqOptions.length < 2) {
        setError('MCQ questions must have at least 2 options');
        return;
      }
      const hasCorrect = mcqOptions.some(opt => opt.isCorrect);
      if (!hasCorrect) {
        setError('Please mark at least one option as correct');
        return;
      }
    }

    const newQuestion: Question = {
      id: Date.now().toString(),
      text: currentQuestion,
      marks: currentQuestionMarks,
      type: currentQuestionType
    };
    
    // Add MCQ options if applicable
    if (currentQuestionType === 'mcq' && mcqOptions.length > 0) {
      newQuestion.mcqOptions = [...mcqOptions];
      newQuestion.mcqLayout = mcqLayout;
      newQuestion.showCorrectAnswer = showCorrectAnswer;
    }
    
    // Add image if available
    if (currentImage && currentImagePreview) {
      newQuestion.image = {
        url: currentImagePreview,
        file: currentImage,
        caption: currentImageCaption.trim() || undefined
      };
    }

    setQuestions([...questions, newQuestion]);
    setCurrentQuestion('');
    setMcqOptions([]);
    
    // Reset image fields
    setCurrentImage(null);
    setCurrentImagePreview(null);
    setCurrentImageCaption('');
    setShowImageInput(false);
    
    setError(null);
  };

  const removeQuestion = (id: string) => {
    // No need to clean up URLs since we're using base64 now
    setQuestions(questions.filter(q => q.id !== id));
  };

  const calculateTotalMarks = (): number => {
    return questions.reduce((sum, q) => sum + q.marks, 0);
  };

  // Helper function to convert blob URLs to base64
  const convertBlobToBase64 = (blobUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      fetch(blobUrl)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(reject);
    });
  };

  // MCQ Option management
  const addMcqOption = () => {
    if (!currentOption.trim()) {
      setError('Option text cannot be empty');
      return;
    }

    const newOption: MCQOption = {
      id: Date.now().toString(),
      text: currentOption.trim(),
      isCorrect: false
    };

    setMcqOptions([...mcqOptions, newOption]);
    setCurrentOption('');
    setError(null);
  };

  const removeMcqOption = (id: string) => {
    setMcqOptions(mcqOptions.filter(opt => opt.id !== id));
  };

  const toggleCorrectOption = (id: string) => {
    setMcqOptions(mcqOptions.map(opt => 
      opt.id === id ? { ...opt, isCorrect: !opt.isCorrect } : opt
    ));
  };

  const generateMcqOptionsFromAI = async () => {
    if (!currentQuestion.trim()) {
      setError('Please enter the question text first');
      return;
    }

    setAiSuggestionsLoading(true);
    try {
      const prompt = `Generate 4 plausible options for this multiple choice question. One should be correct and three should be distractors:\n\n${currentQuestion}\n\nProvide only the options, one per line, without labels (A, B, C, D).`;
      const response = await questionEnhancerService.generateFromPrompt(prompt);
      
      if (response && response.questions && response.questions.length > 0) {
        const options = response.questions.slice(0, 4).map((text, index) => ({
          id: `${Date.now()}_${index}`,
          text: text.trim(),
          isCorrect: index === 0 // Mark first as correct by default
        }));
        setMcqOptions(options);
        setError(null);
      }
    } catch (err) {
      console.error('Error generating MCQ options:', err);
      setError('Failed to generate MCQ options. Please add them manually.');
    } finally {
      setAiSuggestionsLoading(false);
    }
  };

  // AI enhancement methods
  const getQuestionSuggestions = async () => {
    if (!suggestionTopic || !selectedCognitiveLevel) {
      setError('Please enter a topic and select a cognitive level for suggestions');
      return;
    }

    setAiSuggestionsLoading(true);
    setError(null);
    setAiSuggestions([]); // Clear previous suggestions

    try {
      console.log(`Requesting suggestions for: ${suggestionTopic} at ${selectedCognitiveLevel} level`);
      
      const response = await questionEnhancerService.getQuestionSuggestions(
        suggestionTopic,
        selectedCognitiveLevel,
        5
      );
      
      if (!response || !response.suggestions || response.suggestions.length === 0) {
        setError('No suggestions were generated. Please try a different topic or cognitive level.');
        return;
      }
      
      console.log(`Received ${response.suggestions.length} suggestions`);
      setAiSuggestions(response.suggestions);
    } catch (err: any) {
      console.error('Error getting AI suggestions:', err);
      // Provide more descriptive error message
      const errorMessage = err?.message || 'Unknown error';
      setError(`Failed to get AI question suggestions: ${errorMessage}. Please try again with a different topic.`);
    } finally {
      setAiSuggestionsLoading(false);
    }
  };

  const enhanceQuestion = async (question: Question) => {
    setAiEnhancing(true);
    setError(null);

    try {
      const enhancedResponse = await questionEnhancerService.enhanceQuestion({
        text: question.text,
        type: question.type,
        marks: question.marks
      });

      // Update the question with enhanced text and analysis
      const updatedQuestions = questions.map(q => {
        if (q.id === question.id) {
          return {
            ...q,
            text: enhancedResponse.enhanced_question,
            ai_enhanced: true,
            ai_analysis: {
              complexity: enhancedResponse.analysis.complexity,
              cognitive_level: enhancedResponse.analysis.cognitive_level,
              improvement_reasons: enhancedResponse.analysis.improvement_reasons
            }
          };
        }
        return q;
      });

      setQuestions(updatedQuestions);
    } catch (err) {
      console.error('Error enhancing question:', err);
      setError('Failed to enhance question. Please try again.');
    } finally {
      setAiEnhancing(false);
    }
  };

  const analyzeQuestionPaper = async () => {
    if (questions.length === 0) {
      setError('Please add at least one question to analyze');
      return;
    }

    setAiEnhancing(true);
    setError(null);

    try {
      // Convert questions to format expected by the API
      const enhancerQuestions: EnhancerQuestion[] = questions.map(q => ({
        text: q.text,
        type: q.type,
        marks: q.marks
      }));

      // Get paper analysis
      const response = await questionEnhancerService.enhancePaper(enhancerQuestions);
      
      // Set the paper analysis for display
      setPaperAnalysis(response.paper_analysis);
      setShowAnalysis(true);

      // Update questions with individual enhancements
      const updatedQuestions = questions.map((q, index) => {
        const enhancedQ = response.enhanced_questions[index];
        if (enhancedQ) {
          return {
            ...q,
            text: q.ai_enhanced ? q.text : enhancedQ.enhanced_question, // Only update text if not already enhanced
            ai_enhanced: true,
            ai_analysis: {
              complexity: enhancedQ.analysis.complexity,
              cognitive_level: enhancedQ.analysis.cognitive_level,
              improvement_reasons: enhancedQ.analysis.improvement_reasons
            }
          };
        }
        return q;
      });

      setQuestions(updatedQuestions);
    } catch (err) {
      console.error('Error analyzing question paper:', err);
      setError('Failed to analyze question paper. Please try again.');
    } finally {
      setAiEnhancing(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCurrentQuestion(suggestion);
  };

  const generateFromPrompt = async () => {
    if (!promptText.trim()) {
      setError('Please enter a prompt for generating questions');
      return;
    }

    setPromptGenerating(true);
    setError(null);
    setPromptResults([]); // Clear previous results

    try {
      // Use CO-aware prompt if CO mapping is enabled
      const finalPrompt = getCOAwarePrompt(promptText);
      console.log(`Generating questions from prompt: "${finalPrompt.substring(0, 50)}..."`);
      
      const response = await questionEnhancerService.generateFromPrompt(finalPrompt);
      
      if (!response || !response.questions || response.questions.length === 0) {
        setError('No questions were generated. Please try a more specific prompt.');
        return;
      }
      
      console.log(`Received ${response.questions.length} questions from prompt`);
      setPromptResults(response.questions);
      
      // Show analysis in console for debugging
      if (response.analysis) {
        console.log('Generated questions analysis:', response.analysis);
      }
    } catch (err: any) {
      console.error('Error generating questions from prompt:', err);
      const errorMessage = err?.message || 'Unknown error';
      setError(`Failed to generate questions: ${errorMessage}. Please try a different prompt.`);
    } finally {
      setPromptGenerating(false);
    }
  };

  const handlePromptQuestionClick = (question: string) => {
    setCurrentQuestion(question);
  };

  // Course Outcomes handlers
  const addCourseOutcome = () => {
    if (!newCO.number.trim() || !newCO.statement.trim()) {
      setError('Please fill in both CO number and statement');
      return;
    }

    const co = {
      id: Date.now().toString(),
      number: newCO.number.trim(),
      statement: newCO.statement.trim(),
      bloomLevel: newCO.bloomLevel
    };

    setCourseOutcomes([...courseOutcomes, co]);
    setNewCO({ number: '', statement: '', bloomLevel: 'application' as CognitiveLevel });
    setShowCOInput(false);
    setError(null);
  };

  const removeCourseOutcome = (id: string) => {
    setCourseOutcomes(courseOutcomes.filter(co => co.id !== id));
    setSelectedCOs(selectedCOs.filter(coId => coId !== id));
  };

  const toggleCOSelection = (id: string) => {
    setSelectedCOs(prev => 
      prev.includes(id) ? prev.filter(coId => coId !== id) : [...prev, id]
    );
  };

  const getCOAwarePrompt = (basePrompt: string): string => {
    if (!useCOMapping || selectedCOs.length === 0) {
      return basePrompt;
    }

    const selectedCOData = courseOutcomes.filter(co => selectedCOs.includes(co.id));
    const coContext = selectedCOData.map(co => 
      `CO${co.number}: ${co.statement} (Bloom's Level: ${co.bloomLevel})`
    ).join('\n');

    return `${basePrompt}\n\nCourse Outcomes to align with:\n${coContext}\n\nGenerate questions that specifically assess these learning outcomes at their designated Bloom's taxonomy levels.`;
  };

  const exportToPdf = async () => {
    if (questions.length === 0) {
      setError('Please add at least one question to export');
      return;
    }
    
    if (!title.trim()) {
      setError('Please provide a title for the question paper');
      return;
    }
    
    if (!selectedSubject) {
      setError('Please select a subject');
      return;
    }
    
    if (!selectedExamType) {
      setError('Please select an exam type');
      return;
    }
    
    setPdfExporting(true);
    setError(null);
    
    try {
      // Find the subject name using the selected ID
      const subject = subjects.find(s => s.id === selectedSubject)?.name || 'Unknown Subject';
      // Find the exam type name using the selected ID
      const examType = examTypes.find(t => t.id === selectedExamType)?.name || 'Unknown Type';
      
      // Convert blob URLs to base64 for any images before formatting
      const questionsWithBase64Images = await Promise.all(
        questions.map(async (q) => {
          if (q.image && q.image.url.startsWith('blob:')) {
            console.log('Converting blob URL to base64 for PDF export...');
            try {
              const base64 = await convertBlobToBase64(q.image.url);
              return {
                ...q,
                image: {
                  ...q.image,
                  url: base64
                }
              };
            } catch (error) {
              console.error('Failed to convert blob URL:', error);
              return q; // Return original if conversion fails
            }
          }
          return q;
        })
      );
      
      // Convert our questions format to the format expected by the PDF service
      const formattedQuestions: PDFQuestion[] = questionsWithBase64Images.map(q => ({
        text: q.text,
        marks: q.marks,
        type: q.type,
        mcqOptions: q.mcqOptions,
        mcqLayout: q.mcqLayout,
        showCorrectAnswer: q.showCorrectAnswer,
        image: q.image ? {
          url: q.image.url,
          caption: q.image.caption || ''
        } : undefined
      }));
      
      // Generate PDF using the PDF export service
      const pdfBlob = await generateQuestionPaperPDF({
        title: title,
        subject: subject,
        examType: examType,
        duration: duration,
        questions: formattedQuestions,
        institution: 'Evalis-GT University' // Optional: Add institution name
      });
      
      // Create a download link and trigger it
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}_question_paper.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess(true);
      
      // Notify parent component
      onQuestionPaperCreated();
    } catch (err) {
      console.error('Error exporting to PDF:', err);
      setError('Failed to export question paper to PDF. Please try again.');
    } finally {
      setPdfExporting(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please provide a title for the question paper');
      return;
    }

    if (!selectedSubject) {
      setError('Please select a subject');
      return;
    }

    if (!selectedExamType) {
      setError('Please select an exam type');
      return;
    }

    if (questions.length === 0) {
      setError('Please add at least one question');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // TODO: Implement API call to save the question paper
      // const response = await createQuestionPaper({
      //   title,
      //   subjectId: selectedSubject,
      //   examType: selectedExamType,
      //   totalMarks,
      //   duration,
      //   questions
      // });

      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Call PDF export function
      await exportToPdf();
      
      setSuccess(true);
      // Clear form after successful creation
      setTitle('');
      setSelectedSubject('');
      setSelectedExamType('');
      setQuestions([]);
      
      // Notify parent component
      onQuestionPaperCreated();
    } catch (err) {
      setError('Failed to create question paper. Please try again.');
      console.error('Error creating question paper:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnhancePromptOpen = () => {
    if (!currentQuestion.trim()) {
      setError('Please enter a question to enhance first');
      return;
    }
    
    // Set default prompt text
    setEnhancePromptText(
      `Enhance this question: "${currentQuestion}"\n\nMake it clearer, more specific, and more educationally effective.`
    );
    setEnhancePromptOpen(true);
  };
  
  const handleEnhancePromptClose = () => {
    setEnhancePromptOpen(false);
  };
  
  const enhanceCurrentQuestionWithPrompt = async () => {
    if (!enhancePromptText.trim()) {
      return;
    }
    
    setCustomEnhancing(true);
    setError(null);
    
    try {
      console.log(`Enhancing question with prompt: "${enhancePromptText.substring(0, 50)}..."`);
      
      const response = await questionEnhancerService.generateFromPrompt(enhancePromptText);
      
      if (!response || !response.questions || response.questions.length === 0) {
        setError('Failed to enhance question. Please try a different prompt.');
        return;
      }
      
      // Take the first question as the enhanced version
      const enhancedQuestion = response.questions[0];
      console.log(`Original: "${currentQuestion}"\nEnhanced: "${enhancedQuestion}"`);
      
      // Update the current question with the enhanced version
      setCurrentQuestion(enhancedQuestion);
      
      // Close the dialog
      handleEnhancePromptClose();
    } catch (err: any) {
      console.error('Error enhancing question with prompt:', err);
      const errorMessage = err?.message || 'Unknown error';
      setError(`Failed to enhance question: ${errorMessage}. Please try a different prompt.`);
    } finally {
      setCustomEnhancing(false);
    }
  };

  const analyzeBloomTextAnomaly = async () => {
    if (!currentQuestion.trim()) {
      setError('Please enter a question to analyze for Bloom text anomalies');
      return;
    }

    setBloomAnomalyAnalyzing(true);
    setError(null);

    try {
      const analysisResult = await questionEnhancerService.analyzeBloomTextAnomaly({
        text: currentQuestion,
        type: currentQuestionType,
        marks: currentQuestionMarks
      }, targetBloomLevel);

      setBloomAnalysisResult(analysisResult);
      setShowBloomAnalysis(true);
    } catch (err: any) {
      console.error('Error analyzing Bloom taxonomy:', err);
      const errorMessage = err?.message || 'Unknown error';
      setError(`Failed to analyze question: ${errorMessage}. Please try again.`);
    } finally {
      setBloomAnomalyAnalyzing(false);
    }
  };

  const applyBloomRevision = () => {
    if (bloomAnalysisResult) {
      setCurrentQuestion(bloomAnalysisResult.revised_question);
      setShowBloomAnalysis(false);
      setBloomAnalysisResult(null);
    }
  };

  const applyBloomAlternative = (alternative: string) => {
    setCurrentQuestion(alternative);
    setShowBloomAnalysis(false);
    setBloomAnalysisResult(null);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">
          Create Question Paper
        </Typography>
        <Button
          variant="outlined"
          startIcon={<School />}
          onClick={() => {
            setSelectedBloomInfo(null);
            setShowBloomHelper(true);
          }}
          sx={{ borderRadius: 2 }}
        >
          Bloom's Taxonomy Guide
        </Button>
      </Box>
      <Divider sx={{ mb: 3 }} />

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Question paper created successfully!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            label="Question Paper Title"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <FormControl fullWidth required>
            <InputLabel>Subject</InputLabel>
            <Select
              value={selectedSubject}
              onChange={handleSubjectChange}
              label="Subject"
            >
              {subjects.map((subject) => (
                <MenuItem key={subject.id} value={subject.id}>
                  {subject.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={4}>
          <FormControl fullWidth required>
            <InputLabel>Exam Type</InputLabel>
            <Select
              value={selectedExamType}
              onChange={handleExamTypeChange}
              label="Exam Type"
            >
              {examTypes.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            label="Duration (minutes)"
            type="number"
            fullWidth
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
            inputProps={{ min: 0 }}
          />
        </Grid>

        {/* Course Outcomes Configuration */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Assignment sx={{ mr: 1 }} />
                <Typography>Course Outcomes (CO) Mapping (Optional)</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={useCOMapping}
                        onChange={(e) => setUseCOMapping(e.target.checked)}
                      />
                    }
                    label="Enable CO-based question generation (AI will align questions with selected Course Outcomes)"
                  />
                </Grid>

                {useCOMapping && (
                  <>
                    {/* Add New CO Button */}
                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => setShowCOInput(!showCOInput)}
                      >
                        {showCOInput ? 'Cancel' : 'Add Course Outcome'}
                      </Button>
                    </Grid>

                    {/* CO Input Form */}
                    {showCOInput && (
                      <>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            label="CO Number"
                            placeholder="1"
                            value={newCO.number}
                            onChange={(e) => setNewCO({ ...newCO, number: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="CO Statement"
                            multiline
                            rows={2}
                            placeholder="Students will be able to..."
                            value={newCO.statement}
                            onChange={(e) => setNewCO({ ...newCO, statement: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <FormControl fullWidth>
                              <InputLabel>Bloom's Level</InputLabel>
                              <Select
                                value={newCO.bloomLevel}
                                onChange={(e) => setNewCO({ ...newCO, bloomLevel: e.target.value as CognitiveLevel })}
                                label="Bloom's Level"
                              >
                                {getAllBloomLevels().map((level) => (
                                  <MenuItem key={level.id} value={level.id}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                      <Box
                                        sx={{
                                          width: 10,
                                          height: 10,
                                          borderRadius: '50%',
                                          bgcolor: level.color,
                                        }}
                                      />
                                      <Typography variant="body2">{level.name}</Typography>
                                      <Chip 
                                        label={level.order} 
                                        size="small" 
                                        sx={{ ml: 'auto', height: 18, fontSize: '0.65rem' }}
                                      />
                                    </Box>
                                  </MenuItem>
                                ))}
                                <Divider sx={{ my: 1 }} />
                                {/* Legacy options */}
                                <MenuItem value="knowledge">Knowledge (Legacy)</MenuItem>
                                <MenuItem value="comprehension">Comprehension (Legacy)</MenuItem>
                                <MenuItem value="application">Application (Legacy)</MenuItem>
                                <MenuItem value="analysis">Analysis (Legacy)</MenuItem>
                                <MenuItem value="synthesis">Synthesis (Legacy)</MenuItem>
                                <MenuItem value="evaluation">Evaluation (Legacy)</MenuItem>
                              </Select>
                            </FormControl>
                            <Tooltip title="Bloom's Guide">
                              <IconButton 
                                size="small"
                                onClick={() => {
                                  setSelectedBloomInfo(null);
                                  setShowBloomHelper(true);
                                }}
                                color="primary"
                              >
                                <School fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={1}>
                          <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            onClick={addCourseOutcome}
                            sx={{ height: '56px' }}
                          >
                            Add
                          </Button>
                        </Grid>
                      </>
                    )}

                    {/* Display Added COs */}
                    {courseOutcomes.length > 0 && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                          Course Outcomes (Select those to target in this paper):
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          {courseOutcomes.map((co) => (
                            <Box
                              key={co.id}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                mb: 1,
                                p: 1,
                                bgcolor: selectedCOs.includes(co.id) ? '#e3f2fd' : '#f5f5f5',
                                borderRadius: 1,
                                border: selectedCOs.includes(co.id) ? '2px solid #1976d2' : '1px solid #ddd'
                              }}
                            >
                              <Checkbox
                                checked={selectedCOs.includes(co.id)}
                                onChange={() => toggleCOSelection(co.id)}
                              />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  CO{co.number}: {co.statement}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Bloom's Level: {co.bloomLevel}
                                </Typography>
                              </Box>
                              <IconButton
                                size="small"
                                onClick={() => removeCourseOutcome(co.id)}
                                color="error"
                              >
                                <Delete />
                              </IconButton>
                            </Box>
                          ))}
                        </Box>
                        {selectedCOs.length > 0 && (
                          <Alert severity="info" sx={{ mt: 2 }}>
                            {selectedCOs.length} Course Outcome(s) selected. AI will generate questions aligned with these COs.
                          </Alert>
                        )}
                      </Grid>
                    )}
                  </>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* AI Question Suggestions */}
        {aiServiceAvailable && (
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TipsAndUpdates color="primary" sx={{ mr: 1 }} />
                  <Typography>Get AI-Generated Question Suggestions</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={5}>
                    <TextField
                      fullWidth
                      label="Topic"
                      placeholder="e.g., Machine Learning, History, Chemistry"
                      value={suggestionTopic}
                      onChange={(e) => setSuggestionTopic(e.target.value)}
                      helperText="Enter the topic for which you want question suggestions"
                    />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <FormControl fullWidth>
                      <InputLabel>Cognitive Level</InputLabel>
                      <Select
                        value={selectedCognitiveLevel}
                        onChange={(e) => setSelectedCognitiveLevel(e.target.value as CognitiveLevel)}
                        label="Cognitive Level"
                      >
                        <MenuItem value="knowledge">Knowledge (Recall)</MenuItem>
                        <MenuItem value="comprehension">Comprehension (Understanding)</MenuItem>
                        <MenuItem value="application">Application (Using)</MenuItem>
                        <MenuItem value="analysis">Analysis (Breaking down)</MenuItem>
                        <MenuItem value="synthesis">Synthesis (Creating)</MenuItem>
                        <MenuItem value="evaluation">Evaluation (Judging)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      disabled={aiSuggestionsLoading || !suggestionTopic}
                      onClick={getQuestionSuggestions}
                      startIcon={aiSuggestionsLoading ? <CircularProgress size={20} /> : <Lightbulb />}
                      sx={{ height: '56px' }}
                    >
                      {aiSuggestionsLoading ? 'Loading...' : 'Generate'}
                    </Button>
                  </Grid>
                  
                  {/* Question suggestion results */}
                  {aiSuggestions.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>
                        Suggestions (click to use):
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        {aiSuggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              // Handle suggestion click without violating hook rules
                              handleSuggestionClick(suggestion);
                            }}
                            sx={{ mr: 1, mb: 1 }}
                            startIcon={<Add />}
                          >
                            {suggestion.length > 50 ? suggestion.substring(0, 50) + '...' : suggestion}
                          </Button>
                        ))}
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}
        
        {/* Google Gemini AI Prompt */}
        {aiServiceAvailable && (
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chat color="secondary" sx={{ mr: 1 }} />
                  <Typography>Generate Questions with Custom Prompt (Gemini Pro AI)</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Your Prompt"
                      placeholder="Example: Create 3 challenging physics questions about momentum conservation for high school students. Include at least one calculation problem."
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      multiline
                      rows={3}
                      helperText="Be specific about the type, number, and difficulty of questions you want"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      color="secondary"
                      disabled={promptGenerating || !promptText.trim()}
                      onClick={generateFromPrompt}
                      startIcon={promptGenerating ? <CircularProgress size={20} /> : <AutoAwesome />}
                    >
                      {promptGenerating ? 'Generating...' : 'Generate with Gemini Pro AI'}
                    </Button>
                  </Grid>
                  
                  {/* Prompt generation results */}
                  {promptResults.length > 0 && (
                    <Grid item xs={12}>
                      <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: '#f8f9fa' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Generated Questions:
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          {promptResults.map((question, index) => (
                            <Box key={index} sx={{ mb: 2 }}>
                              <Typography variant="body2" gutterBottom sx={{ fontWeight: 'medium' }}>
                                {index + 1}. {question}
                              </Typography>
                              <Button
                                size="small"
                                variant="text"
                                color="secondary"
                                startIcon={<Add />}
                                onClick={() => {
                                  // Handle prompt question click without violating hook rules
                                  handlePromptQuestionClick(question);
                                }}
                              >
                                Use This Question
                              </Button>
                            </Box>
                          ))}
                        </Box>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>
            Questions
          </Typography>
          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 3 }}>
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12}>
                <TextField
                  label="Question Text"
                  multiline
                  rows={3}
                  fullWidth
                  value={currentQuestion}
                  onChange={(e) => setCurrentQuestion(e.target.value)}
                  placeholder="Enter your question (minimum 10 characters)"
                  helperText={`${currentQuestion.length}/2000 characters (minimum 10 required)`}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Question Type</InputLabel>
                  <Select
                    value={currentQuestionType}
                    onChange={handleQuestionTypeChange}
                    label="Question Type"
                  >
                    <MenuItem value="mcq">Multiple Choice</MenuItem>
                    <MenuItem value="short">Short Answer</MenuItem>
                    <MenuItem value="long">Long Answer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Marks"
                  type="number"
                  fullWidth
                  value={currentQuestionMarks}
                  onChange={(e) => setCurrentQuestionMarks(parseInt(e.target.value) || 0)}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Box display="flex" alignItems="center" gap={1}>
                  <FormControl fullWidth>
                    <InputLabel>Target Bloom Level</InputLabel>
                    <Select
                      value={targetBloomLevel}
                      onChange={(e) => setTargetBloomLevel(e.target.value as CognitiveLevel)}
                      label="Target Bloom Level"
                    >
                      {getAllBloomLevels().map((level) => (
                        <Tooltip 
                          key={level.id}
                          title={
                            <Box>
                              <Typography variant="caption" fontWeight="bold">{level.description}</Typography>
                              <Divider sx={{ my: 0.5, bgcolor: 'white' }} />
                              <Typography variant="caption">
                                Verbs: {level.actionVerbs.slice(0, 8).join(', ')}...
                              </Typography>
                            </Box>
                          }
                          placement="right"
                          arrow
                        >
                          <MenuItem value={level.id}>
                            <Box display="flex" alignItems="center" gap={1} width="100%">
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: level.color,
                                }}
                              />
                              <Typography>{level.name}</Typography>
                              <Chip 
                                label={level.category === 'lower-order' ? 'LOT' : 'HOT'} 
                                size="small" 
                                sx={{ ml: 'auto', height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                          </MenuItem>
                        </Tooltip>
                      ))}
                      {/* Legacy options for backward compatibility */}
                      <MenuItem value="knowledge">Knowledge (Legacy)</MenuItem>
                      <MenuItem value="comprehension">Comprehension (Legacy)</MenuItem>
                      <MenuItem value="application">Application (Legacy)</MenuItem>
                      <MenuItem value="analysis">Analysis (Legacy)</MenuItem>
                      <MenuItem value="synthesis">Synthesis (Legacy)</MenuItem>
                      <MenuItem value="evaluation">Evaluation (Legacy)</MenuItem>
                    </Select>
                  </FormControl>
                  <Tooltip title="Learn about Bloom's Taxonomy levels">
                    <IconButton 
                      onClick={() => {
                        setSelectedBloomInfo(null);
                        setShowBloomHelper(true);
                      }}
                      color="primary"
                      sx={{ mt: 1 }}
                    >
                      <School />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Add />}
                  onClick={addQuestion}
                  fullWidth
                  sx={{ height: '100%' }}
                >
                  Add Question
                </Button>
              </Grid>

              {/* Bloom's Taxonomy Quick Reference */}
              {targetBloomLevel && (
                <Grid item xs={12}>
                  {(() => {
                    // Try to find the level - first by direct ID match, then by legacy mapping
                    const targetLevel = targetBloomLevel.toString();
                    let bloomDetails = getAllBloomLevels().find(
                      l => l.id === targetLevel
                    );
                    
                    // If not found, try mapping legacy terms
                    if (!bloomDetails) {
                      const mappedId = mapLegacyToRevised(targetLevel);
                      bloomDetails = getAllBloomLevels().find(l => l.id === mappedId);
                    }
                    
                    if (!bloomDetails) {
                      return null;
                    }
                    
                    return (
                      <Alert 
                        severity="info" 
                        icon={<Lightbulb />}
                        sx={{ 
                          bgcolor: `${bloomDetails.color}11`,
                          border: `1px solid ${bloomDetails.color}`,
                          '& .MuiAlert-icon': { color: bloomDetails.color }
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            📝 {bloomDetails.name} Level Guide ({bloomDetails.category.toUpperCase()})
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {bloomDetails.description}
                          </Typography>
                          <Divider sx={{ my: 1 }} />
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Typography variant="caption" fontWeight="bold">
                                ✏️ Action Verbs:
                              </Typography>
                              <Box sx={{ mt: 0.5 }}>
                                {bloomDetails.actionVerbs.slice(0, 12).map((verb, idx) => (
                                  <Chip 
                                    key={idx}
                                    label={verb}
                                    size="small"
                                    sx={{ 
                                      m: 0.25,
                                      fontSize: '0.7rem',
                                      height: 22,
                                      bgcolor: 'white',
                                      border: `1px solid ${bloomDetails.color}`
                                    }}
                                  />
                                ))}
                                <Chip 
                                  label={`+${bloomDetails.actionVerbs.length - 12} more`}
                                  size="small"
                                  onClick={() => {
                                    setSelectedBloomInfo(bloomDetails);
                                    setShowBloomHelper(true);
                                  }}
                                  sx={{ 
                                    m: 0.25,
                                    fontSize: '0.7rem',
                                    height: 22,
                                    cursor: 'pointer',
                                    bgcolor: bloomDetails.color,
                                    color: 'white',
                                    '&:hover': { opacity: 0.8 }
                                  }}
                                />
                              </Box>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography variant="caption" fontWeight="bold">
                                ❓ Question Starters:
                              </Typography>
                              <Box sx={{ mt: 0.5 }}>
                                {bloomDetails.questionStarters.slice(0, 5).map((starter, idx) => (
                                  <Typography key={idx} variant="caption" display="block" sx={{ ml: 1 }}>
                                    • {starter}
                                  </Typography>
                                ))}
                                {bloomDetails.questionStarters.length > 5 && (
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      ml: 1, 
                                      color: bloomDetails.color,
                                      cursor: 'pointer',
                                      fontWeight: 'bold',
                                      '&:hover': { textDecoration: 'underline' }
                                    }}
                                    onClick={() => {
                                      setSelectedBloomInfo(bloomDetails);
                                      setShowBloomHelper(true);
                                    }}
                                  >
                                    +{bloomDetails.questionStarters.length - 5} more examples →
                                  </Typography>
                                )}
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      </Alert>
                    );
                  })()}
                </Grid>
              )}

              {/* MCQ Options Section */}
              {currentQuestionType === 'mcq' && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        MCQ Options
                      </Typography>
                      {aiServiceAvailable && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={aiSuggestionsLoading ? <CircularProgress size={16} /> : <AutoAwesome />}
                          onClick={generateMcqOptionsFromAI}
                          disabled={aiSuggestionsLoading || !currentQuestion.trim()}
                        >
                          Generate with AI
                        </Button>
                      )}
                    </Box>
                  </Grid>

                  {/* MCQ Layout Selection */}
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Options Layout</InputLabel>
                      <Select
                        value={mcqLayout}
                        onChange={(e) => setMcqLayout(e.target.value as 'vertical' | 'horizontal' | 'grid')}
                        label="Options Layout"
                      >
                        <MenuItem value="vertical">Vertical (A-B-C-D)</MenuItem>
                        <MenuItem value="horizontal">Horizontal (Side by side)</MenuItem>
                        <MenuItem value="grid">Grid (2x2)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={showCorrectAnswer}
                          onChange={(e) => setShowCorrectAnswer(e.target.checked)}
                        />
                      }
                      label="Show correct answer in export"
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={compactMode}
                          onChange={(e) => setCompactMode(e.target.checked)}
                        />
                      }
                      label="Compact mode (save paper)"
                    />
                  </Grid>

                  {/* Add Option Input */}
                  <Grid item xs={12} md={9}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Option Text"
                      value={currentOption}
                      onChange={(e) => setCurrentOption(e.target.value)}
                      placeholder="Enter an option (e.g., Paris is the capital of France)"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addMcqOption();
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Add />}
                      onClick={addMcqOption}
                      disabled={!currentOption.trim()}
                    >
                      Add Option
                    </Button>
                  </Grid>

                  {/* Display Options */}
                  {mcqOptions.length > 0 && (
                    <Grid item xs={12}>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                        <Typography variant="caption" gutterBottom display="block">
                          Options ({mcqOptions.length}) - Click to mark as correct answer
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          {mcqOptions.map((option, index) => (
                            <Box
                              key={option.id}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                mb: 1,
                                p: 1,
                                bgcolor: option.isCorrect ? '#c8e6c9' : 'white',
                                borderRadius: 1,
                                border: option.isCorrect ? '2px solid #4caf50' : '1px solid #ddd',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': {
                                  boxShadow: 2
                                }
                              }}
                              onClick={() => toggleCorrectOption(option.id)}
                            >
                              <Chip
                                label={String.fromCharCode(65 + index)}
                                size="small"
                                sx={{ mr: 1, fontWeight: 'bold' }}
                                color={option.isCorrect ? 'success' : 'default'}
                              />
                              <Typography variant="body2" sx={{ flex: 1 }}>
                                {option.text}
                              </Typography>
                              {option.isCorrect && (
                                <Chip label="✓ Correct" size="small" color="success" sx={{ mr: 1 }} />
                              )}
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeMcqOption(option.id);
                                }}
                                color="error"
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          ))}
                        </Box>
                        {mcqOptions.length < 2 && (
                          <Alert severity="warning" sx={{ mt: 1 }}>
                            Add at least 2 options for MCQ questions
                          </Alert>
                        )}
                        {!mcqOptions.some(opt => opt.isCorrect) && mcqOptions.length >= 2 && (
                          <Alert severity="info" sx={{ mt: 1 }}>
                            Click on an option to mark it as the correct answer
                          </Alert>
                        )}
                      </Paper>
                    </Grid>
                  )}
                </>
              )}
              
              {/* Enhance Question Button - Black and White Theme */}
              {aiServiceAvailable && (
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={customEnhancing ? <CircularProgress size={24} /> : <AutoAwesome />}
                    endIcon={<Edit />}
                    onClick={handleEnhancePromptOpen}
                    fullWidth
                    sx={{ 
                      mt: 2, 
                      mb: 1, 
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      boxShadow: 3,
                      bgcolor: 'black',
                      color: 'white',
                      border: '2px solid #000',
                      '&:hover': {
                        bgcolor: '#333',
                        boxShadow: 4
                      },
                      '&:disabled': {
                        bgcolor: '#aaa',
                        color: '#eee'
                      }
                    }}
                    disabled={customEnhancing || !currentQuestion.trim()}
                  >
                    {customEnhancing ? 'Enhancing Question...' : 'Enhance with AI'}
                  </Button>
                </Grid>
              )}

              {/* Bloom Taxonomy Button */}
              {aiServiceAvailable && (
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={bloomAnomalyAnalyzing ? <CircularProgress size={24} /> : <Psychology />}
                    endIcon={<School />}
                    onClick={analyzeBloomTextAnomaly}
                    fullWidth
                    sx={{ 
                      mb: 2, 
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      boxShadow: 3,
                      bgcolor: '#2E7D32', // Dark green for education/analysis theme
                      color: 'white',
                      border: '2px solid #2E7D32',
                      '&:hover': {
                        bgcolor: '#1B5E20',
                        boxShadow: 4
                      },
                      '&:disabled': {
                        bgcolor: '#aaa',
                        color: '#eee'
                      }
                    }}
                    disabled={bloomAnomalyAnalyzing || !currentQuestion.trim()}
                  >
                    {bloomAnomalyAnalyzing ? 'Analyzing Question...' : 'Bloom Taxonomy'}
                  </Button>
                </Grid>
              )}
              
              {/* Image upload section toggle */}
              <Grid item xs={12}>
                <Button 
                  variant="outlined" 
                  startIcon={showImageInput ? <Close /> : <ImageIcon />}
                  onClick={() => {
                    setShowImageInput(!showImageInput);
                    if (!showImageInput) {
                      removeCurrentImage();
                    }
                  }}
                  size="small"
                  color={showImageInput ? "error" : "primary"}
                >
                  {showImageInput ? "Cancel Image Upload" : "Add Image to Question"}
                </Button>
              </Grid>
              
              {/* Image upload fields */}
              {showImageInput && (
                <>
                  <Grid item xs={12} md={6}>
                    <Button
                      variant="outlined"
                      component="label"
                      fullWidth
                      startIcon={<ImageIcon />}
                      sx={{ height: '56px' }}
                    >
                      {currentImage ? 'Change Image' : 'Upload Image'}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </Button>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Image Caption (Optional)"
                      fullWidth
                      value={currentImageCaption}
                      onChange={(e) => setCurrentImageCaption(e.target.value)}
                      disabled={!currentImage}
                    />
                  </Grid>
                  
                  {/* Image preview */}
                  {currentImagePreview && (
                    <Grid item xs={12}>
                      <Box sx={{ position: 'relative', width: '100%', maxWidth: '300px', mt: 1 }}>
                        <Card>
                          <CardMedia
                            component="img"
                            image={currentImagePreview}
                            alt="Question image preview"
                            sx={{ maxHeight: '200px', objectFit: 'contain' }}
                          />
                        </Card>
                        <IconButton
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            bgcolor: 'rgba(255, 255, 255, 0.8)',
                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' }
                          }}
                          onClick={removeCurrentImage}
                        >
                          <Close />
                        </IconButton>
                      </Box>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            Current Questions ({questions.length}) - Total Marks: {calculateTotalMarks()}
            
            {/* AI Analysis Button */}
            {aiServiceAvailable && questions.length > 0 && (
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={aiEnhancing ? <CircularProgress size={20} /> : <Psychology />}
                onClick={analyzeQuestionPaper}
                disabled={aiEnhancing || questions.length === 0}
                sx={{ ml: 2 }}
              >
                {aiEnhancing ? 'Analyzing...' : 'Analyze with AI'}
              </Button>
            )}
          </Typography>

          {/* Paper Analysis Section */}
          {showAnalysis && paperAnalysis && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f8ff', border: '1px dashed #1976d2' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BarChart color="primary" sx={{ mr: 1 }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  AI Paper Analysis
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Cognitive Level Distribution:
                  </Typography>
                  <Box sx={{ ml: 2 }}>
                    {Object.entries(paperAnalysis.cognitive_distribution).map(([level, percentage]) => (
                      <Box key={level} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Box sx={{ width: '120px' }}>
                          <Typography variant="body2">
                            {level.charAt(0).toUpperCase() + level.slice(1)}:
                          </Typography>
                        </Box>
                        <Box 
                          sx={{ 
                            height: '12px', 
                            bgcolor: 'primary.main', 
                            borderRadius: '6px',
                            width: `${Math.max(percentage, 5)}%`,
                            maxWidth: '200px',
                            transition: 'width 0.5s ease'
                          }} 
                        />
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {percentage.toFixed(1)}%
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Question Type Distribution:
                  </Typography>
                  <Box sx={{ ml: 2 }}>
                    {Object.entries(paperAnalysis.type_distribution).map(([type, percentage]) => (
                      <Box key={type} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Box sx={{ width: '120px' }}>
                          <Typography variant="body2">
                            {type === 'mcq' ? 'Multiple Choice' : 
                             type === 'short' ? 'Short Answer' : 'Long Answer'}:
                          </Typography>
                        </Box>
                        <Box 
                          sx={{ 
                            height: '12px', 
                            bgcolor: 'secondary.main', 
                            borderRadius: '6px',
                            width: `${Math.max(percentage, 5)}%`,
                            maxWidth: '200px',
                            transition: 'width 0.5s ease'
                          }} 
                        />
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {percentage.toFixed(1)}%
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2">
                    Recommendations:
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {paperAnalysis.recommendations.map((rec, index) => (
                      <Box key={index} sx={{ display: 'flex', mb: 1 }}>
                        <TipsAndUpdates fontSize="small" color="primary" sx={{ mr: 1, mt: 0.3 }} />
                        <Typography variant="body2">{rec}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          )}

          {questions.length > 0 ? (
            <Box sx={{ mb: 3 }}>
              {questions.map((question, index) => (
                <Paper 
                  key={question.id} 
                  sx={{ 
                    p: 2, 
                    mb: 2, 
                    position: 'relative',
                    borderLeft: question.ai_enhanced ? '4px solid #7e57c2' : 'none'
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={question.image ? 8 : 10}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Q{index + 1}: {question.text}
                        {question.ai_enhanced && (
                          <Tooltip title="AI Enhanced">
                            <AutoAwesome 
                              fontSize="small" 
                              color="secondary" 
                              sx={{ ml: 1, verticalAlign: 'middle' }} 
                            />
                          </Tooltip>
                        )}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip 
                          label={`${question.marks} marks`} 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={question.type === 'mcq' ? 'Multiple Choice' : 
                                question.type === 'short' ? 'Short Answer' : 'Long Answer'} 
                          size="small" 
                          color="secondary" 
                          variant="outlined" 
                        />
                        {question.image && (
                          <Chip 
                            icon={<ImageIcon fontSize="small" />}
                            label="Has Image" 
                            size="small" 
                            color="default" 
                            variant="outlined" 
                          />
                        )}
                        {question.ai_analysis?.cognitive_level && (
                          <Chip 
                            icon={<School fontSize="small" />}
                            label={`${question.ai_analysis.cognitive_level.charAt(0).toUpperCase()}${question.ai_analysis.cognitive_level.slice(1)}`} 
                            size="small" 
                            color="info" 
                            variant="outlined" 
                          />
                        )}
                        {question.ai_analysis?.complexity !== undefined && (
                          <Chip 
                            label={`Complexity: ${(question.ai_analysis.complexity * 100).toFixed(0)}%`} 
                            size="small" 
                            color="default" 
                            variant="outlined" 
                          />
                        )}
                      </Box>
                      
                      {/* Show MCQ Options */}
                      {question.type === 'mcq' && question.mcqOptions && question.mcqOptions.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" color="text.secondary" gutterBottom>
                            Options ({question.mcqLayout || 'vertical'}):
                          </Typography>
                          <Box
                            sx={{
                              display: question.mcqLayout === 'horizontal' ? 'flex' : 
                                       question.mcqLayout === 'grid' ? 'grid' : 'block',
                              gridTemplateColumns: question.mcqLayout === 'grid' ? '1fr 1fr' : undefined,
                              gap: 1,
                              mt: 1
                            }}
                          >
                            {question.mcqOptions.map((option, optIndex) => (
                              <Box
                                key={option.id}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  p: 0.5,
                                  bgcolor: option.isCorrect && question.showCorrectAnswer ? '#e8f5e9' : '#f5f5f5',
                                  borderRadius: 1,
                                  border: option.isCorrect && question.showCorrectAnswer ? '1px solid #4caf50' : '1px solid #ddd',
                                  fontSize: '0.85rem'
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 'bold', mr: 1 }}>
                                  {String.fromCharCode(65 + optIndex)}.
                                </Typography>
                                <Typography variant="body2" sx={{ flex: 1 }}>
                                  {option.text}
                                </Typography>
                                {option.isCorrect && question.showCorrectAnswer && (
                                  <Chip label="✓" size="small" color="success" sx={{ ml: 1, minWidth: 30 }} />
                                )}
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* Show AI improvement reasons if enhanced */}
                      {question.ai_analysis?.improvement_reasons && question.ai_analysis.improvement_reasons.length > 0 && (
                        <Box sx={{ mt: 1, ml: 1, fontSize: '0.8rem', color: 'text.secondary' }}>
                          <Typography variant="caption" color="text.secondary">
                            AI improvements:
                          </Typography>
                          <ul style={{ margin: '0', paddingLeft: '20px' }}>
                            {question.ai_analysis.improvement_reasons.map((reason, idx) => (
                              <li key={idx}>{reason}</li>
                            ))}
                          </ul>
                        </Box>
                      )}
                    </Grid>
                    
                    {/* Question image */}
                    {question.image && (
                      <Grid item xs={2}>
                        <Card sx={{ height: '100%' }}>
                          <CardMedia
                            component="img"
                            image={question.image.url}
                            alt={question.image.caption || "Question image"}
                            sx={{ height: '100%', objectFit: 'contain' }}
                          />
                        </Card>
                        {question.image.caption && (
                          <Typography variant="caption" display="block" textAlign="center">
                            {question.image.caption}
                          </Typography>
                        )}
                      </Grid>
                    )}
                    
                    <Grid item xs={question.image ? 2 : 2} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      {aiServiceAvailable && !question.ai_enhanced && (
                        <Tooltip title="Enhance with AI">
                          <IconButton 
                            color="secondary" 
                            onClick={() => enhanceQuestion(question)}
                            size="small"
                            disabled={aiEnhancing}
                          >
                            {aiEnhancing ? <CircularProgress size={20} /> : <AutoAwesome />}
                          </IconButton>
                        </Tooltip>
                      )}
                      <IconButton 
                        color="error" 
                        onClick={() => removeQuestion(question.id)}
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Box>
          ) : (
            <Box sx={{ p: 3, bgcolor: '#f5f5f5', borderRadius: 1, mb: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                No questions added yet. Add questions using the form above.
              </Typography>
            </Box>
          )}
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={pdfExporting ? <CircularProgress size={24} /> : <PictureAsPdf />}
              onClick={exportToPdf}
              disabled={pdfExporting || loading || questions.length === 0}
            >
              {pdfExporting ? 'Exporting...' : 'Export to PDF'}
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={loading ? <CircularProgress size={24} /> : <Save />}
              onClick={handleSave}
              disabled={loading || pdfExporting || questions.length === 0}
            >
              {loading ? 'Saving...' : 'Save & Export'}
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Custom Enhancement Prompt Dialog */}
      <Dialog
        open={enhancePromptOpen}
        onClose={handleEnhancePromptClose}
        aria-labelledby="enhance-dialog-title"
        fullWidth
        maxWidth="md"
      >
        <DialogTitle id="enhance-dialog-title">
          Enhance Question with AI
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Provide instructions on how to enhance this question. The AI will generate an improved version based on your prompt.
          </Typography>
          <TextField
            fullWidth
            label="Enhancement Prompt"
            multiline
            rows={4}
            value={enhancePromptText}
            onChange={(e) => setEnhancePromptText(e.target.value)}
            placeholder="Example: Make this question more challenging, add context, improve clarity, etc."
            variant="outlined"
            disabled={customEnhancing}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleEnhancePromptClose}
            disabled={customEnhancing}
          >
            Cancel
          </Button>
          <Button 
            onClick={enhanceCurrentQuestionWithPrompt}
            variant="contained"
            disabled={customEnhancing || !enhancePromptText.trim()}
            startIcon={customEnhancing ? <CircularProgress size={20} /> : <AutoAwesome />}
            sx={{ 
              bgcolor: 'black', 
              color: 'white',
              '&:hover': {
                bgcolor: '#333'
              }
            }}
          >
            {customEnhancing ? 'Enhancing...' : 'Enhance Question'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bloom Taxonomy Analysis Dialog */}
      <Dialog
        open={showBloomAnalysis}
        onClose={() => setShowBloomAnalysis(false)}
        aria-labelledby="bloom-analysis-dialog-title"
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle id="bloom-analysis-dialog-title">
          <Box display="flex" alignItems="center" gap={1}>
            <Psychology color="primary" />
            <Typography variant="h6">
              Bloom's Taxonomy Analysis
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {bloomAnalysisResult && (
            <Grid container spacing={3}>
              {/* Original vs Revised Question */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom color="primary">
                  Question Comparison
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Original Question:
                      </Typography>
                      <Typography variant="body1">
                        "{bloomAnalysisResult.original_question}"
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: '#e8f5e8' }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Revised Question:
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        "{bloomAnalysisResult.revised_question}"
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Grid>

              {/* Analysis Results */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom color="primary">
                  Analysis Results
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Bloom's Taxonomy Level:
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip 
                      label={`Current: ${bloomAnalysisResult.anomaly_analysis.bloom_level_current}`}
                      color="default"
                      size="small"
                    />
                    <Typography>→</Typography>
                    <Chip 
                      label={`Improved: ${bloomAnalysisResult.anomaly_analysis.bloom_level_improved}`}
                      color="primary"
                      size="small"
                    />
                  </Box>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Clarity Score:
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6" color="primary">
                      {(bloomAnalysisResult.anomaly_analysis.clarity_score * 100).toFixed(0)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      (0-100% scale)
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Cognitive Alignment:
                  </Typography>
                  <Typography variant="body2">
                    {bloomAnalysisResult.anomaly_analysis.cognitive_alignment}
                  </Typography>
                </Box>
              </Grid>

              {/* Issues and Improvements */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom color="primary">
                  Detected Issues
                </Typography>
                
                {bloomAnalysisResult.anomaly_analysis.detected_issues.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      General Issues:
                    </Typography>
                    {bloomAnalysisResult.anomaly_analysis.detected_issues.map((issue, index) => (
                      <Chip 
                        key={index}
                        label={issue}
                        size="small"
                        color="error"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                )}

                {bloomAnalysisResult.anomaly_analysis.ambiguity_issues.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Ambiguity Issues:
                    </Typography>
                    {bloomAnalysisResult.anomaly_analysis.ambiguity_issues.map((issue, index) => (
                      <Chip 
                        key={index}
                        label={issue}
                        size="small"
                        color="warning"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                )}

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Improvements Made:
                  </Typography>
                  {bloomAnalysisResult.anomaly_analysis.improvement_summary.map((improvement, index) => (
                    <Chip 
                      key={index}
                      label={improvement}
                      size="small"
                      color="success"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              </Grid>

              {/* Alternative Suggestions */}
              {bloomAnalysisResult.suggested_alternatives.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Alternative Question Versions
                  </Typography>
                  <Grid container spacing={2}>
                    {bloomAnalysisResult.suggested_alternatives.map((alternative, index) => (
                      <Grid item xs={12} md={4} key={index}>
                        <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Alternative {index + 1}:
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            "{alternative}"
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => applyBloomAlternative(alternative)}
                            startIcon={<Add />}
                          >
                            Use This Version
                          </Button>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowBloomAnalysis(false)}
          >
            Close
          </Button>
          <Button 
            onClick={applyBloomRevision}
            variant="contained"
            startIcon={<AutoAwesome />}
            sx={{ 
              bgcolor: '#2E7D32', 
              color: 'white',
              '&:hover': {
                bgcolor: '#1B5E20'
              }
            }}
          >
            Apply Revised Question
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bloom's Taxonomy Helper Dialog */}
      <Dialog
        open={showBloomHelper}
        onClose={() => setShowBloomHelper(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: selectedBloomInfo?.color || '#1976d2', color: 'white' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6">
                Bloom's Taxonomy: {selectedBloomInfo?.name || 'Guide'}
              </Typography>
              {selectedBloomInfo && (
                <Typography variant="caption">
                  {selectedBloomInfo.category.toUpperCase()} THINKING • Order: {selectedBloomInfo.order}
                </Typography>
              )}
            </Box>
            <IconButton onClick={() => setShowBloomHelper(false)} sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedBloomInfo ? (
            <Box sx={{ mt: 2 }}>
              {/* Description */}
              <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                {selectedBloomInfo.description}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {selectedBloomInfo.detailedDescription}
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* Cognitive Processes */}
              <Typography variant="h6" gutterBottom>
                🧠 Cognitive Processes
              </Typography>
              <Box sx={{ mb: 3 }}>
                {selectedBloomInfo.cognitiveProcesses.map((process, idx) => (
                  <Chip
                    key={idx}
                    label={process}
                    sx={{ m: 0.5, bgcolor: `${selectedBloomInfo.color}22`, color: selectedBloomInfo.color }}
                  />
                ))}
              </Box>

              {/* Action Verbs */}
              <Typography variant="h6" gutterBottom>
                ✏️ Action Verbs ({selectedBloomInfo.actionVerbs.length})
              </Typography>
              <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedBloomInfo.actionVerbs.map((verb, idx) => (
                    <Chip
                      key={idx}
                      label={verb}
                      size="small"
                      sx={{ 
                        bgcolor: 'white',
                        border: `1px solid ${selectedBloomInfo.color}`,
                        '&:hover': { bgcolor: `${selectedBloomInfo.color}11` }
                      }}
                    />
                  ))}
                </Box>
              </Paper>

              {/* Question Starters */}
              <Typography variant="h6" gutterBottom>
                ❓ Question Starters
              </Typography>
              <Box sx={{ mb: 3 }}>
                {selectedBloomInfo.questionStarters.map((starter, idx) => (
                  <Typography key={idx} variant="body2" sx={{ mb: 0.5, pl: 2 }}>
                    • {starter}
                  </Typography>
                ))}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Examples */}
              <Typography variant="h6" gutterBottom>
                💡 Example Questions
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {selectedBloomInfo.examples.map((example, idx) => (
                  <Grid item xs={12} md={6} key={idx}>
                    <Paper sx={{ p: 1.5, bgcolor: '#fafafa', border: `1px solid ${selectedBloomInfo.color}33` }}>
                      <Typography variant="body2">
                        {example}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {/* Assessment Tips */}
              <Typography variant="h6" gutterBottom>
                🎯 Assessment Tips
              </Typography>
              <Box sx={{ mb: 3 }}>
                {selectedBloomInfo.assessmentTips.map((tip, idx) => (
                  <Alert key={idx} severity="info" sx={{ mb: 1 }}>
                    {tip}
                  </Alert>
                ))}
              </Box>

              {/* Common Mistakes */}
              <Typography variant="h6" gutterBottom>
                ⚠️ Common Mistakes to Avoid
              </Typography>
              <Box sx={{ mb: 3 }}>
                {selectedBloomInfo.commonMistakes.map((mistake, idx) => (
                  <Alert key={idx} severity="warning" sx={{ mb: 1 }}>
                    {mistake}
                  </Alert>
                ))}
              </Box>

              {/* Real-World Applications */}
              <Typography variant="h6" gutterBottom>
                🌍 Real-World Applications
              </Typography>
              <Grid container spacing={2}>
                {selectedBloomInfo.realWorldApplications.map((application, idx) => (
                  <Grid item xs={12} md={6} key={idx}>
                    <Paper sx={{ p: 1.5, bgcolor: '#e8f5e9', border: '1px solid #4caf50' }}>
                      <Typography variant="body2">
                        {application}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Bloom's Taxonomy Revised (2001)
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Select a cognitive level to see detailed information including action verbs, 
                question starters, examples, and assessment tips.
              </Typography>

              <Grid container spacing={2}>
                {getAllBloomLevels().map((level) => (
                  <Grid item xs={12} md={6} key={level.id}>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        cursor: 'pointer',
                        border: `2px solid ${level.color}`,
                        '&:hover': { bgcolor: `${level.color}11` }
                      }}
                      onClick={() => setSelectedBloomInfo(level)}
                    >
                      <Typography variant="h6" sx={{ color: level.color, mb: 1 }}>
                        {level.order}. {level.name}
                      </Typography>
                      <Chip 
                        label={level.category.toUpperCase()} 
                        size="small" 
                        sx={{ mb: 1, bgcolor: `${level.color}22` }}
                      />
                      <Typography variant="body2">
                        {level.description}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {level.actionVerbs.slice(0, 5).map((verb, idx) => (
                          <Chip key={idx} label={verb} size="small" />
                        ))}
                        <Chip label={`+${level.actionVerbs.length - 5} more`} size="small" />
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedBloomInfo && (
            <Button onClick={() => setSelectedBloomInfo(null)} startIcon={<ArrowBack />}>
              Back to Overview
            </Button>
          )}
          <Button onClick={() => setShowBloomHelper(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TeacherQuestionPaperCreator; 