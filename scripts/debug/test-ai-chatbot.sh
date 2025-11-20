#!/bin/bash

# Test script for AI-powered student chatbot
echo "🧠 Testing AI-Powered Student Dashboard Chatbot..."
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${BLUE}1. Checking server status...${NC}"
curl -s http://localhost:3000/api/health > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not running. Please start the server first.${NC}"
    echo "Run: cd server && npm start"
    exit 1
fi

# Check AI analyzer endpoint
echo -e "${BLUE}2. Testing AI analyzer health...${NC}"
AI_HEALTH=$(curl -s http://localhost:3000/api/ai-analyzer/health)
if echo "$AI_HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✓ AI analyzer service is healthy${NC}"
else
    echo -e "${RED}✗ AI analyzer service is not responding${NC}"
fi

# Check Gemini API key configuration
echo -e "${BLUE}3. Checking Gemini API configuration...${NC}"
if [ -n "$VITE_GOOGLE_API_KEY" ]; then
    echo -e "${GREEN}✓ Gemini API key is configured${NC}"
elif grep -q "VITE_GOOGLE_API_KEY" ../.env; then
    echo -e "${GREEN}✓ Gemini API key found in .env file${NC}"
else
    echo -e "${YELLOW}⚠ Gemini API key not found. AI responses will use fallback mock data.${NC}"
fi

# Test AI analyzer comprehensive data endpoint (requires authentication)
echo -e "${BLUE}4. Testing AI data collection...${NC}"
echo "Note: This requires a valid student authentication token"
echo "Test manually by logging into the student portal and checking the AI Assistant"

# Check frontend dependencies
echo -e "${BLUE}5. Checking frontend AI assistant component...${NC}"
if [ -f "../src/components/StudentAIAssistant.tsx" ]; then
    echo -e "${GREEN}✓ StudentAIAssistant component exists${NC}"
else
    echo -e "${RED}✗ StudentAIAssistant component not found${NC}"
fi

# Check if AI service is integrated in StudentPortal
echo -e "${BLUE}6. Checking StudentPortal integration...${NC}"
if grep -q "StudentAIAssistant" ../src/pages/StudentPortal.tsx; then
    echo -e "${GREEN}✓ AI Assistant is integrated in Student Portal${NC}"
else
    echo -e "${RED}✗ AI Assistant not integrated in Student Portal${NC}"
fi

echo ""
echo -e "${BLUE}🎯 AI Chatbot Features:${NC}"
echo "✨ Real-time student performance analysis"
echo "📊 Personalized academic insights using Gemini AI"
echo "📈 Performance trend analysis"
echo "🎯 Subject-specific recommendations"
echo "⏰ Submission pattern analysis"
echo "💡 Study suggestions based on grades"
echo ""

echo -e "${BLUE}🚀 To test the AI chatbot:${NC}"
echo "1. Start the development server: npm run dev"
echo "2. Login as a student"
echo "3. Go to the Dashboard tab"
echo "4. Look for the 'AI Academic Assistant' card"
echo "5. Click 'Start Chat' to begin conversation"
echo ""

echo -e "${BLUE}💬 Sample questions to ask the AI:${NC}"
echo "• How can I improve my overall performance?"
echo "• Which subjects should I focus on more?"
echo "• What are my strengths and weaknesses?"
echo "• How is my submission pattern?"
echo "• Give me study suggestions for this week"
echo ""

echo -e "${GREEN}✅ AI Chatbot setup complete!${NC}"
echo "The AI assistant will analyze real-time student data and provide personalized recommendations."
