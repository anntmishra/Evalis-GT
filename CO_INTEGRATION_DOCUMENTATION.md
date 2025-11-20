# Course Outcome (CO) Integration - Feature Documentation

## Overview

The Question Paper Creator now includes **Course Outcome (CO) mapping** functionality that integrates with the AI question generation system. This feature allows teachers to create assessments that are directly aligned with specific learning outcomes and Bloom's taxonomy levels.

## What's New

### 1. Course Outcome Management
- **Add COs**: Define course outcomes with CO number, statement, and Bloom's level
- **Select COs**: Choose which outcomes to target in a specific question paper
- **Remove COs**: Delete outcomes that are no longer needed
- **Visual Feedback**: Selected COs are highlighted with color coding

### 2. AI-Powered CO-Aligned Question Generation
- **Intelligent Context**: AI receives CO information when generating questions
- **Bloom's Compliance**: Questions are generated at the appropriate cognitive level
- **Outcome Focus**: Questions specifically assess the stated learning objectives
- **Automatic Prompting**: System automatically enhances prompts with CO context

### 3. Enhanced User Interface
- **Accordion Layout**: Organized CO configuration section
- **Enable/Disable Toggle**: Turn CO mapping on/off as needed
- **Multi-Select**: Choose multiple COs for comprehensive assessment
- **Status Alerts**: Visual confirmation of selected COs

## How It Works

### Architecture

```
User Input (CO + Prompt)
    ↓
getCOAwarePrompt() - Enhances prompt with CO context
    ↓
questionEnhancerService.generateFromPrompt()
    ↓
Google Gemini API - Receives CO-enhanced prompt
    ↓
AI-Generated Questions - Aligned with COs and Bloom's levels
```

### Code Flow

1. **State Management**: 
   ```typescript
   const [courseOutcomes, setCourseOutcomes] = useState([]);
   const [selectedCOs, setSelectedCOs] = useState([]);
   const [useCOMapping, setUseCOMapping] = useState(false);
   ```

2. **CO-Aware Prompt Enhancement**:
   ```typescript
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
   ```

3. **AI Integration**:
   ```typescript
   const generateFromPrompt = async () => {
     const finalPrompt = getCOAwarePrompt(promptText);
     const response = await questionEnhancerService.generateFromPrompt(finalPrompt);
     // Process response...
   };
   ```

## User Guide

### Step 1: Enable CO Mapping
1. Expand the "Course Outcomes (CO) Mapping" section
2. Check the "Enable CO-based question generation" checkbox
3. The CO configuration UI will appear

### Step 2: Add Course Outcomes
1. Click "Add Course Outcome" button
2. Fill in:
   - **CO Number**: Sequential number (e.g., 1, 2, 3)
   - **CO Statement**: The learning objective (e.g., "Apply sorting algorithms to solve problems")
   - **Bloom's Level**: Select from dropdown (Knowledge, Comprehension, Application, Analysis, Synthesis, Evaluation)
3. Click "Add" to save the CO

### Step 3: Select Target COs
1. Review the list of added COs
2. Check the checkbox next to COs you want to assess in this paper
3. Selected COs will be highlighted in blue
4. An info alert shows how many COs are selected

### Step 4: Generate Questions
1. Use either:
   - **AI Question Suggestions**: Topic-based generation
   - **Custom Prompt Generation**: Use the Gemini Pro AI prompt feature
2. The AI will receive your prompt + CO context automatically
3. Generated questions will be aligned with selected COs

### Example Usage

**Scenario**: Creating a Data Structures quiz

**Added COs**:
- CO1: Understand time complexity analysis (Understanding)
- CO2: Apply sorting algorithms (Application)
- CO3: Analyze algorithm efficiency (Analysis)

**Selected COs**: CO1, CO2 (for this quiz)

**Your Prompt**:
```
Create 3 questions about sorting algorithms, 2 easy and 1 moderate difficulty
```

**Enhanced Prompt Sent to AI**:
```
Create 3 questions about sorting algorithms, 2 easy and 1 moderate difficulty

Course Outcomes to align with:
CO1: Understand time complexity analysis (Bloom's Level: comprehension)
CO2: Apply sorting algorithms (Bloom's Level: application)

Generate questions that specifically assess these learning outcomes at their designated Bloom's taxonomy levels.
```

**AI Output**: Questions will focus on understanding complexity AND applying algorithms, at appropriate levels.

## Technical Details

### Data Structure

```typescript
interface CourseOutcome {
  id: string;
  number: string;
  statement: string;
  bloomLevel: CognitiveLevel;
}
```

### State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `courseOutcomes` | `CourseOutcome[]` | Stores all defined COs |
| `selectedCOs` | `string[]` | IDs of COs selected for this paper |
| `useCOMapping` | `boolean` | Enable/disable CO feature |
| `newCO` | `{number, statement, bloomLevel}` | Form state for adding new CO |
| `showCOInput` | `boolean` | Toggle CO input form visibility |

### Key Functions

#### `addCourseOutcome()`
Creates a new course outcome and adds it to the list.

#### `removeCourseOutcome(id)`
Removes a CO from both the list and selected COs.

#### `toggleCOSelection(id)`
Toggles selection state of a specific CO.

#### `getCOAwarePrompt(basePrompt)`
Enhances user's prompt with CO context when CO mapping is enabled.

## Benefits

### For Teachers
- **Curriculum Alignment**: Ensures assessments match course objectives
- **Quality Assurance**: Creates educationally sound assessments
- **Time Saving**: AI generates relevant questions automatically
- **Flexibility**: Enable/disable CO mapping per paper
- **Transparency**: Clear mapping between questions and outcomes

### For Students
- **Clear Expectations**: Know what learning outcomes are being assessed
- **Focused Study**: Understand what to prepare for
- **Fair Assessment**: Questions directly related to course content

### For Institutions
- **Accreditation**: Provides evidence for NAAC, NBA, etc.
- **Program Outcomes**: Track PO attainment through CO assessment
- **Quality Metrics**: Measurable alignment between teaching and testing
- **Standardization**: Consistent assessment practices across faculty

## Integration Points

### With Existing Features

1. **AI Question Suggestions**: CO context added automatically when feature is enabled
2. **Custom Prompts**: getCOAwarePrompt() enhances all custom prompts
3. **Bloom Taxonomy Analysis**: Works alongside existing Bloom analysis tools
4. **PDF Export**: CO information could be added to exported papers (future enhancement)

### API Integration

The enhanced prompt is sent to:
- **Google Gemini API**: For question generation
- **Backend Flask API**: As fallback (when available)

Both endpoints receive the CO-enhanced prompt without requiring changes to the API contracts.

## Future Enhancements

### Planned Features
1. **CO Import/Export**: Save and load CO sets for reuse
2. **PO Mapping Display**: Show Program Outcome mappings
3. **CO Coverage Report**: Analyze which COs are assessed
4. **Preset CO Templates**: Common CO sets for popular courses
5. **PDF Export with COs**: Include CO mapping in exported papers
6. **CO-Question Tagging**: Tag individual questions with specific COs
7. **Bloom Distribution Chart**: Visual representation of CO vs Bloom levels

### API Enhancements
1. **CO-Aware Endpoint**: Dedicated endpoint accepting CO parameters
2. **CO Validation**: Backend validation of CO-question alignment
3. **CO Analytics**: Track CO assessment patterns over time

## Migration Guide

### For Existing Users
- No breaking changes - feature is entirely opt-in
- Existing question papers work exactly as before
- Enable CO mapping only when needed
- No database migrations required (COs stored in component state)

### For Developers
- All CO logic is in `TeacherQuestionPaperCreator.tsx`
- State management is local (consider Redux/Context for persistence)
- CO data structure is simple and extensible
- getCOAwarePrompt() can be moved to a service for reusability

## Testing

### Manual Testing Checklist
- [ ] Add multiple COs with different Bloom levels
- [ ] Select and deselect COs
- [ ] Remove COs and verify selection updates
- [ ] Generate questions with CO mapping enabled
- [ ] Generate questions with CO mapping disabled
- [ ] Verify AI receives CO context in prompts
- [ ] Check question relevance to selected COs
- [ ] Test with no COs selected (should behave normally)
- [ ] Test with all Bloom levels
- [ ] Verify UI responsiveness

### Test Scenarios

**Scenario 1**: Basic CO Management
1. Add CO1, CO2, CO3
2. Select CO1 and CO2
3. Verify selection state
4. Remove CO2
5. Verify CO2 removed from selection

**Scenario 2**: AI Generation with COs
1. Add and select 2 COs
2. Enter prompt "Create 3 questions"
3. Verify enhanced prompt includes CO context
4. Check generated questions align with COs

**Scenario 3**: Disable/Enable Toggle
1. Add COs and select some
2. Disable CO mapping
3. Generate questions
4. Verify prompt has no CO context
5. Re-enable and verify CO context returns

## Troubleshooting

### Issue: COs not affecting AI output
**Solution**: 
- Verify "Enable CO-based question generation" is checked
- Ensure at least one CO is selected
- Check browser console for getCOAwarePrompt() output

### Issue: Cannot add CO
**Solution**:
- Ensure CO number and statement are filled
- Check for error messages in UI
- Verify no duplicate CO numbers

### Issue: Selected COs not highlighted
**Solution**:
- Check selectedCOs state in React DevTools
- Verify toggleCOSelection() is called
- Ensure CO IDs match in courseOutcomes array

## References

- [Bloom's Taxonomy Revised](https://en.wikipedia.org/wiki/Bloom%27s_taxonomy)
- [NBA Accreditation Guidelines](https://www.nbaind.org/)
- [NAAC Assessment Framework](https://www.naac.gov.in/)
- [Course Outcomes Examples](./COURSE_OUTCOMES_EXAMPLES.md)

## Support

For issues or questions:
1. Check this documentation
2. Review the code comments in `TeacherQuestionPaperCreator.tsx`
3. Test with example COs from COURSE_OUTCOMES_EXAMPLES.md
4. Check browser console for errors
5. Verify Google API configuration in environment.js

## Version History

- **v1.0.0** (Current): Initial CO integration feature
  - CO management (add, remove, select)
  - CO-aware AI prompt enhancement
  - UI with accordion layout
  - Enable/disable toggle
  - Bloom's taxonomy alignment

---

**Last Updated**: December 2024
**Feature Status**: ✅ Production Ready
**Documentation**: Complete
