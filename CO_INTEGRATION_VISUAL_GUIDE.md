# Course Outcome Integration - Visual Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Teacher Question Paper Creator                  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Course Outcomes Configuration Section            │   │
│  │                                                           │   │
│  │  ☑ Enable CO-based question generation                  │   │
│  │                                                           │   │
│  │  [+ Add Course Outcome]                                  │   │
│  │                                                           │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ ☑ CO1: Apply sorting algorithms                 │   │   │
│  │  │    Bloom's Level: application              [×]  │   │   │
│  │  ├─────────────────────────────────────────────────┤   │   │
│  │  │ ☐ CO2: Understand data structures              │   │   │
│  │  │    Bloom's Level: comprehension           [×]  │   │   │
│  │  ├─────────────────────────────────────────────────┤   │   │
│  │  │ ☑ CO3: Analyze algorithm complexity            │   │   │
│  │  │    Bloom's Level: analysis                [×]  │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                           │   │
│  │  ℹ 2 Course Outcome(s) selected                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Gemini Pro AI Custom Prompt                    │   │
│  │                                                           │   │
│  │  Prompt: [Create 3 algorithm questions, 2 easy, 1 hard] │   │
│  │                                                           │   │
│  │         [Generate with Gemini Pro AI]                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↓                                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    getCOAwarePrompt()                            │
│                                                                   │
│  Input: "Create 3 algorithm questions, 2 easy, 1 hard"         │
│                                                                   │
│  Processing:                                                     │
│  • Check if useCOMapping = true                                 │
│  • Check if selectedCOs.length > 0                              │
│  • Filter courseOutcomes by selectedCOs                         │
│  • Format CO context:                                           │
│    - CO1: Apply sorting algorithms (Bloom's: application)       │
│    - CO3: Analyze algorithm complexity (Bloom's: analysis)      │
│  • Append to base prompt                                        │
│                                                                   │
│  Output: Enhanced Prompt ──────────────────────────────────►   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              questionEnhancerService.generateFromPrompt()        │
│                                                                   │
│  Enhanced Prompt:                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Create 3 algorithm questions, 2 easy, 1 hard           │  │
│  │                                                          │  │
│  │ Course Outcomes to align with:                         │  │
│  │ CO1: Apply sorting algorithms (Bloom's: application)   │  │
│  │ CO3: Analyze algorithm complexity (Bloom's: analysis)  │  │
│  │                                                          │  │
│  │ Generate questions that specifically assess these       │  │
│  │ learning outcomes at their designated Bloom's levels.   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           ↓                                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Google Gemini API                           │
│                   (gemini-2.0-flash-exp)                         │
│                                                                   │
│  AI Processing:                                                  │
│  • Understands CO1 requires "application" level                 │
│  • Understands CO3 requires "analysis" level                    │
│  • Generates questions accordingly:                             │
│                                                                   │
│  Generated Questions:                                            │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Q1: Implement bubble sort to arrange the following      │  │
│  │     array: [5, 2, 8, 1, 9]. Show each pass.            │  │
│  │     (Application level - aligns with CO1) ✓             │  │
│  │                                                          │  │
│  │ Q2: Write code to sort strings alphabetically using     │  │
│  │     merge sort algorithm.                               │  │
│  │     (Application level - aligns with CO1) ✓             │  │
│  │                                                          │  │
│  │ Q3: Compare the time complexity of quick sort vs        │  │
│  │     merge sort. When would you choose one over the      │  │
│  │     other? Justify with Big-O analysis.                │  │
│  │     (Analysis level - aligns with CO3) ✓                │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           ↓                                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Display in UI                                 │
│                                                                   │
│  Teacher can:                                                    │
│  • Review generated questions                                   │
│  • Click "Use This Question" to add to paper                    │
│  • Verify alignment with selected COs                           │
│  • Generate more if needed                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌──────────────┐
│  Component   │
│    State     │
├──────────────┤
│              │
│ courseOutcomes: [         ┐
│   {                       │
│     id: "1",              │  CO Data
│     number: "1",          │  Storage
│     statement: "...",     │
│     bloomLevel: "..."     │
│   }                       │
│ ]                         ┘
│                           
│ selectedCOs: ["1", "3"]   ──► Filter ──► Format ──► Enhance
│                                  │          │         │
│ useCOMapping: true ─────────────┘          │         │
│                                             │         │
└──────────────────────────────────────────────────────┘
                                              │
                                              ↓
                                    ┌──────────────────┐
                                    │ Enhanced Prompt  │
                                    ├──────────────────┤
                                    │ Base Prompt +    │
                                    │ CO Context       │
                                    └──────────────────┘
                                              │
                                              ↓
                                    ┌──────────────────┐
                                    │   Gemini API     │
                                    └──────────────────┘
                                              │
                                              ↓
                                    ┌──────────────────┐
                                    │   AI Questions   │
                                    │  (CO-aligned)    │
                                    └──────────────────┘
```

## State Transitions

```
Initial State
    │
    ↓
[Enable CO Mapping] ──► useCOMapping = true
    │
    ↓
[Add Course Outcomes] ──► courseOutcomes.push(newCO)
    │
    ↓
[Select COs] ──► selectedCOs.push(coId)
    │
    ↓
[Generate Questions]
    │
    ├─► useCOMapping = false? ──► Normal Prompt ──► AI
    │
    └─► useCOMapping = true?
            │
            ├─► selectedCOs.length = 0? ──► Normal Prompt ──► AI
            │
            └─► selectedCOs.length > 0?
                    │
                    ↓
                getCOAwarePrompt(prompt)
                    │
                    ↓
                Enhanced Prompt ──► AI ──► CO-Aligned Questions
```

## Component Structure

```
TeacherQuestionPaperCreator
│
├─ Basic Configuration
│  ├─ Title
│  ├─ Subject
│  ├─ Exam Type
│  └─ Duration
│
├─ Course Outcomes Section (NEW)
│  │
│  ├─ Enable Toggle
│  │
│  ├─ Add CO Form
│  │  ├─ CO Number Input
│  │  ├─ CO Statement Input
│  │  ├─ Bloom Level Select
│  │  └─ Add Button
│  │
│  └─ CO List
│     ├─ CO Item 1 [✓]
│     ├─ CO Item 2 [ ]
│     └─ CO Item 3 [✓]
│
├─ AI Question Suggestions
│  └─ (Existing, works with COs)
│
├─ Gemini Pro AI Prompt (Enhanced)
│  ├─ Prompt Input
│  ├─ Generate Button
│  │  └─ [calls getCOAwarePrompt()]
│  └─ Results Display
│
└─ Question Management
   └─ (Existing features)
```

## UI Interaction Flow

```
1. Teacher opens Question Paper Creator
         │
         ↓
2. Expands "Course Outcomes" section
         │
         ↓
3. Checks "Enable CO-based generation"
         │
         ├─────────────────┐
         ↓                 ↓
4a. Clicks "Add CO"   OR   4b. Uses existing COs
         │                 │
         ↓                 │
5a. Fills form            │
    - Number: "1"         │
    - Statement: "..."    │
    - Bloom: "application"│
         │                 │
         ↓                 │
6a. Clicks "Add"          │
         │                 │
         └─────────┬───────┘
                   ↓
7. Selects target COs (checkboxes)
         │
         ↓
8. Scrolls to "Gemini Pro AI Prompt"
         │
         ↓
9. Enters prompt: "Create 3 questions..."
         │
         ↓
10. Clicks "Generate with Gemini Pro AI"
         │
         ↓
11. getCOAwarePrompt() executes
         │
         ↓
12. Enhanced prompt sent to API
         │
         ↓
13. AI generates CO-aligned questions
         │
         ↓
14. Questions displayed in UI
         │
         ↓
15. Teacher clicks "Use This Question"
         │
         ↓
16. Question added to paper
```

## Bloom's Taxonomy Alignment

```
                Higher-Order Thinking
                        ▲
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
Evaluation          Synthesis          Analysis
    │                   │                   │
    │    ┌──────────────┴──────────────┐   │
    │    │       Cognitive Levels       │   │
    │    └──────────────┬──────────────┘   │
    │                   │                   │
Application       Comprehension       Knowledge
    │                   │                   │
    └───────────────────┼───────────────────┘
                        │
                        ▼
                Lower-Order Thinking

CO Example Mapping:
┌─────────────────────────────────────────────┐
│ CO1: Remember basic concepts → Knowledge    │
│ CO2: Understand principles → Comprehension  │
│ CO3: Apply methods → Application            │
│ CO4: Analyze problems → Analysis            │
│ CO5: Design solutions → Synthesis           │
│ CO6: Evaluate results → Evaluation          │
└─────────────────────────────────────────────┘
```

## Feature Toggle States

```
State 1: CO Mapping Disabled
┌────────────────────────────┐
│ ☐ Enable CO-based generation│
└────────────────────────────┘
     │
     └─► Questions generated normally

State 2: CO Mapping Enabled, No COs Selected
┌────────────────────────────┐
│ ☑ Enable CO-based generation│
│                             │
│ [ No COs selected ]        │
└────────────────────────────┘
     │
     └─► Questions generated normally

State 3: CO Mapping Enabled, COs Selected
┌────────────────────────────┐
│ ☑ Enable CO-based generation│
│                             │
│ ✓ CO1: Apply algorithms    │
│ ✓ CO3: Analyze complexity  │
│                             │
│ ℹ 2 COs selected           │
└────────────────────────────┘
     │
     └─► CO-aware prompts sent to AI
```

## Benefits Visualization

```
Traditional Approach:
Teacher → "Create questions" → AI → Generic Questions
  (No alignment)       (No context)    (May not match COs)

With CO Integration:
Teacher → Selects COs → Enhanced Prompt → AI → CO-Aligned Questions
        (Specific)    (CO context)    (Targeted outcomes)
                                       (Bloom's compliant)

Result Comparison:

Without COs:                    With COs:
┌─────────────────────┐        ┌─────────────────────┐
│ Generic question 1  │        │ CO1-aligned Q1     │
│ Generic question 2  │   VS   │ CO1-aligned Q2     │
│ Generic question 3  │        │ CO3-aligned Q3     │
└─────────────────────┘        └─────────────────────┘
 May not assess COs              Specifically assesses
 Random Bloom levels             Target Bloom levels
 No curriculum mapping           Clear CO mapping
```

---

This visual guide helps understand:
- System architecture
- Data flow
- State management
- User interactions
- Bloom's taxonomy integration
- Benefits over traditional approaches

