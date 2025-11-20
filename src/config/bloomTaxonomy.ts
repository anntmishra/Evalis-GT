/**
 * Comprehensive Bloom's Taxonomy Configuration
 * Based on Anderson & Krathwohl's Revised Taxonomy (2001)
 */

export type BloomLevel = 
  | 'remember' 
  | 'understand' 
  | 'apply' 
  | 'analyze' 
  | 'evaluate' 
  | 'create';

export interface BloomLevelDetails {
  id: BloomLevel;
  name: string;
  order: number;
  category: 'lower-order' | 'higher-order';
  color: string;
  description: string;
  detailedDescription: string;
  cognitiveProcesses: string[];
  actionVerbs: string[];
  questionStarters: string[];
  examples: string[];
  assessmentTips: string[];
  commonMistakes: string[];
  realWorldApplications: string[];
}

export const BLOOM_TAXONOMY: Record<BloomLevel, BloomLevelDetails> = {
  remember: {
    id: 'remember',
    name: 'Remember',
    order: 1,
    category: 'lower-order',
    color: '#E3F2FD', // Light Blue
    description: 'Retrieve relevant knowledge from long-term memory',
    detailedDescription: 'The ability to recall or recognize information, ideas, and concepts in the form in which they were learned. This is the foundational level of knowledge acquisition.',
    cognitiveProcesses: [
      'Recognizing: Identifying knowledge from memory',
      'Recalling: Retrieving knowledge from memory'
    ],
    actionVerbs: [
      'define', 'describe', 'identify', 'know', 'label', 'list', 'match',
      'name', 'outline', 'recall', 'recognize', 'reproduce', 'select',
      'state', 'tell', 'who', 'what', 'when', 'where', 'which', 'write',
      'find', 'spell', 'memorize', 'relate', 'repeat', 'retrieve'
    ],
    questionStarters: [
      'What is...?',
      'Who was...?',
      'Where is...?',
      'When did...?',
      'How many...?',
      'Can you recall...?',
      'Can you name...?',
      'Can you list...?',
      'Define the term...',
      'What are the components of...?'
    ],
    examples: [
      'List the parts of a cell',
      'Define Newton\'s First Law of Motion',
      'Name the capitals of European countries',
      'Recall the formula for calculating area',
      'Identify the author of "1984"',
      'What are the primary colors?'
    ],
    assessmentTips: [
      'Use multiple-choice questions with clear correct answers',
      'Create matching exercises',
      'Use fill-in-the-blank questions',
      'Design true/false questions for basic facts',
      'Keep questions focused on specific facts or definitions'
    ],
    commonMistakes: [
      'Confusing recognition with understanding',
      'Assuming memorization equals learning',
      'Over-relying on this level for advanced learners',
      'Not connecting facts to broader concepts'
    ],
    realWorldApplications: [
      'Medical professionals remembering drug names and dosages',
      'Lawyers recalling legal precedents',
      'Engineers knowing standard formulas',
      'Customer service representatives remembering company policies'
    ]
  },

  understand: {
    id: 'understand',
    name: 'Understand',
    order: 2,
    category: 'lower-order',
    color: '#C5E1A5', // Light Green
    description: 'Construct meaning from instructional messages',
    detailedDescription: 'The ability to comprehend or grasp the meaning of information. This involves interpreting, exemplifying, classifying, summarizing, inferring, comparing, and explaining ideas or concepts.',
    cognitiveProcesses: [
      'Interpreting: Converting information from one form to another',
      'Exemplifying: Finding specific examples or illustrations',
      'Classifying: Determining category or group membership',
      'Summarizing: Abstracting general themes or points',
      'Inferring: Drawing logical conclusions from information',
      'Comparing: Detecting similarities and differences',
      'Explaining: Constructing cause-and-effect models'
    ],
    actionVerbs: [
      'clarify', 'classify', 'compare', 'conclude', 'contrast', 'demonstrate',
      'describe', 'discuss', 'distinguish', 'estimate', 'explain', 'express',
      'extend', 'give examples', 'illustrate', 'infer', 'interpret', 'outline',
      'paraphrase', 'predict', 'relate', 'rephrase', 'restate', 'review',
      'show', 'summarize', 'translate', 'associate', 'convert', 'defend',
      'generalize', 'rewrite'
    ],
    questionStarters: [
      'How would you explain...?',
      'What is the main idea of...?',
      'Can you summarize...?',
      'What is meant by...?',
      'How would you compare...?',
      'What is the difference between...?',
      'Can you give an example of...?',
      'Why does...?',
      'What might happen if...?',
      'How would you describe...?'
    ],
    examples: [
      'Explain how photosynthesis works in your own words',
      'Compare democracy and monarchy',
      'Summarize the plot of Shakespeare\'s Hamlet',
      'Interpret the meaning of this graph',
      'Give an example of supply and demand in real life',
      'What is the significance of the Civil War?'
    ],
    assessmentTips: [
      'Ask students to explain concepts in their own words',
      'Use analogies and metaphors',
      'Create comparison matrices',
      'Ask for real-world examples',
      'Use concept maps to show understanding'
    ],
    commonMistakes: [
      'Simply restating without true comprehension',
      'Confusing paraphrasing with deeper understanding',
      'Not checking if students can explain why',
      'Accepting memorized explanations as understanding'
    ],
    realWorldApplications: [
      'Teachers explaining concepts to students',
      'Managers communicating company strategies',
      'Scientists interpreting experimental results',
      'Journalists summarizing complex news stories'
    ]
  },

  apply: {
    id: 'apply',
    name: 'Apply',
    order: 3,
    category: 'higher-order',
    color: '#FFF59D', // Light Yellow
    description: 'Use information in new and concrete situations',
    detailedDescription: 'The ability to use learned material in new and concrete situations. This involves executing procedures in familiar tasks or implementing procedures in unfamiliar tasks.',
    cognitiveProcesses: [
      'Executing: Applying procedures to familiar tasks',
      'Implementing: Using procedures in novel situations',
      'Carrying out: Performing a procedure',
      'Using: Employing information for a specific purpose'
    ],
    actionVerbs: [
      'apply', 'calculate', 'carry out', 'change', 'choose', 'compute',
      'construct', 'demonstrate', 'develop', 'discover', 'dramatize',
      'employ', 'execute', 'illustrate', 'implement', 'interpret',
      'manipulate', 'modify', 'operate', 'organize', 'practice', 'predict',
      'prepare', 'produce', 'relate', 'schedule', 'show', 'sketch', 'solve',
      'use', 'utilize', 'act', 'administer', 'articulate', 'build'
    ],
    questionStarters: [
      'How would you use...?',
      'What examples can you find to...?',
      'How would you solve...?',
      'How would you show your understanding of...?',
      'What approach would you use to...?',
      'How would you apply what you learned to...?',
      'What would result if...?',
      'Can you develop...?',
      'How would you organize...?',
      'What facts would you select to show...?'
    ],
    examples: [
      'Use the Pythagorean theorem to calculate the hypotenuse',
      'Apply Newton\'s laws to predict the motion of a pendulum',
      'Implement a sorting algorithm in Python',
      'Calculate the compound interest on an investment',
      'Use grammatical rules to correct sentences',
      'Apply principles of design to create a poster'
    ],
    assessmentTips: [
      'Provide real-world scenarios for application',
      'Use problem-solving tasks',
      'Create hands-on activities',
      'Design case studies',
      'Include calculations and demonstrations'
    ],
    commonMistakes: [
      'Providing only familiar problems',
      'Not checking if students understand why their solution works',
      'Confusing memorized procedures with true application',
      'Not including transfer to new contexts'
    ],
    realWorldApplications: [
      'Engineers applying physics principles to design bridges',
      'Doctors applying medical knowledge to diagnose patients',
      'Software developers implementing algorithms',
      'Accountants applying tax laws to client situations',
      'Chefs applying cooking techniques to new recipes'
    ]
  },

  analyze: {
    id: 'analyze',
    name: 'Analyze',
    order: 4,
    category: 'higher-order',
    color: '#FFE082', // Light Orange
    description: 'Break material into constituent parts and determine relationships',
    detailedDescription: 'The ability to break down material into its component parts and determine how the parts relate to one another and to an overall structure. This includes differentiating, organizing, and attributing.',
    cognitiveProcesses: [
      'Differentiating: Distinguishing relevant from irrelevant parts',
      'Organizing: Determining how elements fit or function together',
      'Attributing: Determining point of view, bias, values, or intent',
      'Deconstructing: Breaking down into constituent elements',
      'Integrating: Determining how parts relate to the whole'
    ],
    actionVerbs: [
      'analyze', 'break down', 'categorize', 'classify', 'compare', 'contrast',
      'deconstruct', 'deduce', 'diagram', 'differentiate', 'discriminate',
      'distinguish', 'examine', 'experiment', 'identify', 'illustrate',
      'infer', 'investigate', 'order', 'organize', 'outline', 'point out',
      'question', 'relate', 'research', 'separate', 'subdivide', 'survey',
      'test', 'arrange', 'connect', 'detect', 'dissect', 'inspect'
    ],
    questionStarters: [
      'What are the parts or features of...?',
      'How is... related to...?',
      'Why does... work?',
      'What is the function of...?',
      'What conclusions can you draw...?',
      'What evidence can you find...?',
      'What is the relationship between...?',
      'Can you distinguish between...?',
      'What is the underlying theme of...?',
      'What motives are there...?',
      'What assumptions...?'
    ],
    examples: [
      'Analyze the causes of World War I',
      'Compare and contrast mitosis and meiosis',
      'Examine the author\'s use of symbolism in the novel',
      'Investigate the factors affecting climate change',
      'Break down the components of a computer system',
      'Analyze the effectiveness of a marketing campaign'
    ],
    assessmentTips: [
      'Ask students to identify patterns and relationships',
      'Use graphic organizers (Venn diagrams, cause-effect charts)',
      'Create questions that require evidence',
      'Ask students to identify assumptions or biases',
      'Use case studies for analysis'
    ],
    commonMistakes: [
      'Accepting surface-level analysis',
      'Not requiring evidence for conclusions',
      'Confusing description with analysis',
      'Not pushing students to find deeper connections'
    ],
    realWorldApplications: [
      'Scientists analyzing experimental data',
      'Business analysts examining market trends',
      'Detectives analyzing crime scene evidence',
      'Literary critics analyzing texts',
      'Data scientists finding patterns in big data',
      'Doctors analyzing symptoms to diagnose diseases'
    ]
  },

  evaluate: {
    id: 'evaluate',
    name: 'Evaluate',
    order: 5,
    category: 'higher-order',
    color: '#FFAB91', // Light Deep Orange
    description: 'Make judgments based on criteria and standards',
    detailedDescription: 'The ability to make judgments based on criteria and standards through checking and critiquing. This involves assessing the value, effectiveness, or quality of ideas, materials, or methods.',
    cognitiveProcesses: [
      'Checking: Testing for internal consistency or logical fallacies',
      'Critiquing: Judging against external criteria or standards',
      'Judging: Assessing value based on specific criteria',
      'Defending: Supporting a position or decision',
      'Appraising: Determining worth or significance'
    ],
    actionVerbs: [
      'appraise', 'argue', 'assess', 'attach', 'choose', 'compare', 'conclude',
      'critique', 'decide', 'defend', 'determine', 'discriminate', 'estimate',
      'evaluate', 'explain', 'grade', 'interpret', 'judge', 'justify',
      'measure', 'prioritize', 'prove', 'rank', 'rate', 'recommend', 'review',
      'score', 'select', 'support', 'test', 'validate', 'value', 'weigh',
      'criticize', 'defend', 'dispute'
    ],
    questionStarters: [
      'Do you agree that...? Why?',
      'What is your opinion of...?',
      'How would you evaluate...?',
      'What criteria would you use to assess...?',
      'What would you recommend...?',
      'How would you prioritize...?',
      'What is most important...?',
      'How would you justify...?',
      'What evidence supports...?',
      'What is the best solution...?',
      'How effective is...?'
    ],
    examples: [
      'Evaluate the effectiveness of the government\'s economic policy',
      'Judge the quality of this research study',
      'Critique the author\'s argument in this article',
      'Assess the ethical implications of genetic engineering',
      'Rank these solutions based on cost-effectiveness',
      'Determine the most appropriate algorithm for this problem'
    ],
    assessmentTips: [
      'Provide clear evaluation criteria',
      'Ask for justified opinions',
      'Use rubrics for self and peer evaluation',
      'Create debate scenarios',
      'Include ethical dilemmas',
      'Ask students to critique published work'
    ],
    commonMistakes: [
      'Accepting opinions without justification',
      'Not providing clear criteria for evaluation',
      'Confusing personal preference with reasoned judgment',
      'Not requiring evidence to support judgments'
    ],
    realWorldApplications: [
      'Judges evaluating legal cases',
      'Critics reviewing films, books, or art',
      'Quality assurance teams assessing products',
      'Investors evaluating investment opportunities',
      'Teachers grading student work',
      'Consumers comparing products before purchase'
    ]
  },

  create: {
    id: 'create',
    name: 'Create',
    order: 6,
    category: 'higher-order',
    color: '#CE93D8', // Light Purple
    description: 'Put elements together to form a novel, coherent whole',
    detailedDescription: 'The ability to put elements together to form a functional and coherent whole; reorganize elements into a new pattern or structure. This is the highest level of cognitive process and involves generating, planning, and producing original work.',
    cognitiveProcesses: [
      'Generating: Coming up with alternative hypotheses',
      'Planning: Designing a solution strategy',
      'Producing: Creating a final product or artifact',
      'Designing: Constructing a new structure or system',
      'Inventing: Developing novel solutions',
      'Composing: Creating original work'
    ],
    actionVerbs: [
      'assemble', 'build', 'compile', 'compose', 'construct', 'create',
      'design', 'develop', 'devise', 'enhance', 'formulate', 'generate',
      'imagine', 'improve', 'integrate', 'invent', 'make', 'originate',
      'plan', 'predict', 'prepare', 'produce', 'propose', 'set up',
      'synthesize', 'write', 'adapt', 'combine', 'compile', 'conceive',
      'concoct', 'facilitate', 'modify', 'rearrange', 'reconstruct'
    ],
    questionStarters: [
      'Can you design a...?',
      'Can you create new and unusual uses for...?',
      'Can you develop a proposal for...?',
      'How would you improve...?',
      'What would happen if...?',
      'Can you invent...?',
      'How could you adapt...?',
      'Can you formulate a theory for...?',
      'What way would you design...?',
      'Can you compose a...?',
      'How could you modify...?'
    ],
    examples: [
      'Design a sustainable city for 100,000 people',
      'Create a new marketing strategy for a product',
      'Develop a mobile app to solve a community problem',
      'Write an original short story',
      'Compose a musical piece',
      'Design an experiment to test a hypothesis',
      'Create a business plan for a startup',
      'Invent a new solution to reduce plastic waste'
    ],
    assessmentTips: [
      'Assign open-ended projects',
      'Allow creativity and originality',
      'Use portfolio assessments',
      'Create design challenges',
      'Encourage innovation and risk-taking',
      'Provide rubrics that value originality',
      'Allow student choice in project topics'
    ],
    commonMistakes: [
      'Over-structuring assignments, limiting creativity',
      'Not allowing enough time for creative processes',
      'Valuing only the final product, not the process',
      'Not providing resources or support for creation',
      'Penalizing unique or unconventional approaches'
    ],
    realWorldApplications: [
      'Architects designing buildings',
      'Software engineers developing new applications',
      'Scientists formulating new theories',
      'Entrepreneurs creating business models',
      'Artists creating original works',
      'Writers composing novels or screenplays',
      'Engineers inventing new technologies'
    ]
  }
};

// Utility functions
export const getBloomLevel = (level: BloomLevel): BloomLevelDetails => {
  return BLOOM_TAXONOMY[level];
};

export const getAllBloomLevels = (): BloomLevelDetails[] => {
  return Object.values(BLOOM_TAXONOMY).sort((a, b) => a.order - b.order);
};

export const getLowerOrderLevels = (): BloomLevelDetails[] => {
  return getAllBloomLevels().filter(level => level.category === 'lower-order');
};

export const getHigherOrderLevels = (): BloomLevelDetails[] => {
  return getAllBloomLevels().filter(level => level.category === 'higher-order');
};

export const getBloomLevelByOrder = (order: number): BloomLevelDetails | undefined => {
  return getAllBloomLevels().find(level => level.order === order);
};

export const suggestActionVerbs = (level: BloomLevel, count: number = 10): string[] => {
  const bloomLevel = getBloomLevel(level);
  return bloomLevel.actionVerbs.slice(0, count);
};

export const getQuestionStarters = (level: BloomLevel): string[] => {
  return getBloomLevel(level).questionStarters;
};

// Legacy mapping for backward compatibility
export const legacyToRevisedMapping: Record<string, BloomLevel> = {
  'knowledge': 'remember',
  'comprehension': 'understand',
  'application': 'apply',
  'analysis': 'analyze',
  'synthesis': 'create',
  'evaluation': 'evaluate'
};

export const mapLegacyToRevised = (legacyLevel: string): BloomLevel => {
  return legacyToRevisedMapping[legacyLevel] || 'understand';
};

export default BLOOM_TAXONOMY;
