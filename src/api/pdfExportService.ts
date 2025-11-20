import { jsPDF } from 'jspdf';
import 'jspdf-autotable'; // side-effect import for table plugin (even if not used now)

// Define our own interface for Question to avoid circular dependency
export interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface PDFQuestion {
  text: string;
  marks: number;
  type: 'mcq' | 'short' | 'long';
  mcqOptions?: MCQOption[];
  mcqLayout?: 'vertical' | 'horizontal' | 'grid';
  showCorrectAnswer?: boolean;
  image?: {
    url: string;
    caption?: string;
  };
}

interface PDFExportParams {
  title: string;
  subject: string;
  examType: string;
  duration: number;
  questions: PDFQuestion[];
  institution?: string;
}

// Removed unused dataURLtoBlob helper (not referenced)

// Load image and return base64 data
const loadImage = async (imageUrl: string): Promise<string> => {
  // If already base64, return it directly
  if (imageUrl.startsWith('data:image/')) {
    console.log('Image is already base64, using directly');
    return imageUrl;
  }
  
  // Otherwise, load and convert (for backward compatibility)
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Don't set crossOrigin for blob URLs
    if (!imageUrl.startsWith('blob:')) {
      img.crossOrigin = 'Anonymous';
    }
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Convert to base64 with good quality
        const dataURL = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataURL);
      } catch (error) {
        console.error('Error converting image to base64:', error);
        reject(error);
      }
    };
    
    img.onerror = (error) => {
      console.error('Error loading image:', error);
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
};

// Generate PDF for question paper
export const generateQuestionPaperPDF = async (params: PDFExportParams): Promise<Blob> => {
  const { title, subject, examType, duration, questions, institution } = params;
  
  // Create new PDF document (A4 format)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Set font
  doc.setFont('helvetica');
  
  // Add institution name if provided
  if (institution) {
    doc.setFontSize(12);
    doc.text(institution, doc.internal.pageSize.width / 2, 15, { align: 'center' });
  }
  
  // Add title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, doc.internal.pageSize.width / 2, institution ? 25 : 15, { align: 'center' });
  
  // Add metadata
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const metadataY = institution ? 32 : 22;
  doc.text(`Subject: ${subject}`, 20, metadataY);
  doc.text(`Exam Type: ${examType}`, doc.internal.pageSize.width - 20, metadataY, { align: 'right' });
  doc.text(`Duration: ${duration} minutes`, 20, metadataY + 5);
  doc.text(`Total Marks: ${questions.reduce((sum, q) => sum + q.marks, 0)}`, doc.internal.pageSize.width - 20, metadataY + 5, { align: 'right' });
  
  // Add a line separator
  doc.setLineWidth(0.5);
  doc.line(20, metadataY + 8, doc.internal.pageSize.width - 20, metadataY + 8);
  
  // Instructions
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('Instructions: Review all questions. This is a question paper only with no answer spaces provided.', 20, metadataY + 15);
  
  // Start Y position for questions
  let yPosition = metadataY + 25;
  
  // Add each question
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    
    // Add question number and text
    doc.setFontSize(10); // Reduced from 11 for compact mode
    doc.setFont('helvetica', 'bold');
    const questionPrefix = `Q${i + 1}. `;
    const questionText = `${questionPrefix}${question.text} [${question.marks} ${question.marks === 1 ? 'mark' : 'marks'}]`;
    
    // Split text to check if we need a new page
    const textLines = doc.splitTextToSize(questionText, doc.internal.pageSize.width - 40);
    
    // Check if we need to add a new page
    if (yPosition + (textLines.length * 4) + 10 > doc.internal.pageSize.height - 20) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Add question text
    doc.text(textLines, 20, yPosition);
    yPosition += textLines.length * 4 + 3; // Reduced spacing for compact mode
    
    // Add MCQ options if present
    if (question.type === 'mcq' && question.mcqOptions && question.mcqOptions.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      const layout = question.mcqLayout || 'vertical';
      
      if (layout === 'vertical') {
        // Vertical layout - one option per line
        for (let j = 0; j < question.mcqOptions.length; j++) {
          const option = question.mcqOptions[j];
          const optionLabel = String.fromCharCode(65 + j); // A, B, C, D
          const optionText = `${optionLabel}. ${option.text}`;
          const correctMarker = question.showCorrectAnswer && option.isCorrect ? ' ✓' : '';
          
          const optLines = doc.splitTextToSize(optionText + correctMarker, doc.internal.pageSize.width - 50);
          
          // Check if we need a new page
          if (yPosition + (optLines.length * 4) > doc.internal.pageSize.height - 20) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.text(optLines, 30, yPosition);
          yPosition += optLines.length * 4 + 1;
        }
        yPosition += 2; // Extra spacing after options
        
      } else if (layout === 'horizontal' || layout === 'grid') {
        // Horizontal/Grid layout - try to fit options side by side
        const optionsPerRow = layout === 'grid' ? 2 : 4;
        const columnWidth = (doc.internal.pageSize.width - 50) / optionsPerRow;
        
        for (let j = 0; j < question.mcqOptions.length; j++) {
          const option = question.mcqOptions[j];
          const optionLabel = String.fromCharCode(65 + j);
          const correctMarker = question.showCorrectAnswer && option.isCorrect ? ' ✓' : '';
          const optionText = `${optionLabel}. ${option.text}${correctMarker}`;
          
          const col = j % optionsPerRow;
          const row = Math.floor(j / optionsPerRow);
          
          const xPos = 30 + col * columnWidth;
          const yPos = yPosition + row * 5;
          
          // Check if we need a new page
          if (yPos > doc.internal.pageSize.height - 20) {
            doc.addPage();
            yPosition = 20;
            const newRow = Math.floor(j / optionsPerRow) - Math.floor(j / optionsPerRow);
            const newYPos = yPosition + newRow * 5;
            doc.text(optionText, xPos, newYPos, { maxWidth: columnWidth - 5 });
          } else {
            doc.text(optionText, xPos, yPos, { maxWidth: columnWidth - 5 });
          }
        }
        
        const totalRows = Math.ceil(question.mcqOptions.length / optionsPerRow);
        yPosition += totalRows * 5 + 3;
      }
    }
    
    // Add image if present
    if (question.image && question.image.url) {
      console.log(`Processing image for question ${i + 1}:`, question.image.url.substring(0, 50));
      
      try {
        // Load and process the image
        const imgData = await loadImage(question.image.url);
        console.log(`Image loaded successfully, data length: ${imgData.length}`);
        
        const imgProps = doc.getImageProperties(imgData);
        console.log(`Image properties:`, imgProps);
        
        // Compact mode: smaller images to save paper
        const maxWidth = doc.internal.pageSize.width - 60; // Leave more margins
        const maxHeight = 50; // Reduced from 60mm for compact mode
        
        let imgWidth = maxWidth;
        let imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        
        // Adjust if image is too tall
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = (imgProps.width * imgHeight) / imgProps.height;
        }
        
        console.log(`Calculated image dimensions: ${imgWidth}x${imgHeight}mm`);
        
        // Ensure we don't run out of space
        if (yPosition + imgHeight + 10 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Position image with left alignment for better space utilization
        const xOffset = 30;
        
        // Add the image
        doc.addImage(imgData, 'JPEG', xOffset, yPosition, imgWidth, imgHeight);
        console.log(`Image added to PDF at position (${xOffset}, ${yPosition})`);
        
        // Update position
        yPosition += imgHeight + 2; // Reduced spacing
        
        // Add caption if available
        if (question.image.caption) {
          doc.setFontSize(7); // Smaller caption font
          doc.setFont('helvetica', 'italic');
          const captionLines = doc.splitTextToSize(`Fig: ${question.image.caption}`, imgWidth);
          doc.text(captionLines, xOffset, yPosition);
          yPosition += captionLines.length * 3;
        }
      } catch (error) {
        console.error('Error adding image to PDF for question', i + 1, ':', error);
        console.error('Image URL was:', question.image.url);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.text('[Image could not be displayed]', 30, yPosition);
        yPosition += 3;
      }
    }
    
    // Add spacing between questions (reduced for compact mode)
    yPosition += question.type === 'mcq' ? 5 : 7; // Less spacing for MCQs
  }
  
  // Add footer with page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${totalPages}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }
  
  // Return PDF as blob
  return doc.output('blob');
};

export default {
  generateQuestionPaperPDF
}; 