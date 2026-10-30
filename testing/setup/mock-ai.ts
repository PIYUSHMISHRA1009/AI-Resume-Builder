import { vi } from 'vitest';

export const createMockEmbedding = (dimensions = 3072) => {
  const vec = new Array(dimensions).fill(0).map(() => Math.random() - 0.5);
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return vec.map(v => v / norm);
};

export const mockOpenAIResponses = {
  chatCompletions: {
    'enhance-pro-sum': 'Enhanced professional summary with key skills and experience.',
    'enhance-job-desc': 'Enhanced job description with key responsibilities.',
    'tailor-resume': JSON.stringify([
      { bullet: 'Led a team of 5 engineers building scalable Node.js APIs on AWS', source_id: 'test-id-1' },
      { bullet: 'Reduced cloud costs by 40% through AWS optimization', source_id: 'test-id-2' },
    ]),
    'refine-bullet': 'Refined bullet with improved clarity and impact.',
    'skill-gaps': JSON.stringify([
      { skill: 'Python', similarity: 0.2, suggestion: 'Consider developing experience with python', learningResource: 'https://docs.python.org/3/tutorial/' },
      { skill: 'Kubernetes', similarity: 0.1, suggestion: 'Consider developing experience with kubernetes', learningResource: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/' },
    ]),
    'optimize': JSON.stringify({
      recommendations: [
        {
          id: 'rec-1',
          priority: 'high',
          section: 'experience',
          index: 0,
          field: 'description',
          what: 'Add quantifiable metrics to AWS experience',
          why: 'JD emphasizes cloud cost optimization',
          where: 'Experience section, first role',
          how: 'Add specific cost reduction percentages',
          currentText: 'Reduced cloud costs by 40% via AWS optimization',
          suggestedText: 'Reduced cloud costs by 40% ($200K/year) via AWS optimization and rightsizing',
        },
      ],
      summary: {
        beforeScore: 72,
        afterScore: 78,
        improvement: 6,
        recommendationsCount: 1,
        strongMatches: 2,
        missingSkills: 3,
        partialSkills: 1,
      },
    }),
    'explanation': 'Candidate-JD Match Score is 72%. Strong alignment on Node.js and AWS. Missing Python and Kubernetes experience. Recommend adding Python projects and Kubernetes certification.',
    'parse-resume': JSON.stringify({
      professional_summary: 'Senior backend engineer with 5+ years building Node.js APIs on AWS.',
      skills: ['Node.js', 'React', 'MongoDB', 'AWS', 'Docker'],
      personal_info: {
        image: ' ',
        full_name: 'Test User',
        profession: 'Senior Backend Engineer',
        email: 'test@example.com',
        phone: '555-123-4567',
        location: 'San Francisco, CA',
        linkedin: 'linkedin.com/in/testuser',
        website: 'github.com/testuser',
      },
      experience: [
        {
          company: 'Acme Corp',
          position: 'Senior Engineer',
          start_date: '2021-01',
          end_date: '2024-01',
          description: 'Led a team of 5 engineers building scalable APIs\nReduced cloud costs by 40% via AWS optimization\nBuilt CI/CD pipelines with GitHub Actions',
          is_current: true,
        },
      ],
      project: [
        {
          name: 'API Gateway',
          type: 'Production',
          description: 'Built an API gateway handling 10k requests/day',
        },
      ],
      education: [
        {
          institution: 'Stanford University',
          degree: 'Master of Science',
          field: 'Computer Science',
          graduation_date: '2020-06',
          gpa: '3.8',
        },
      ],
    }),
  },
  embeddings: {
    'text-embedding-3-large': createMockEmbedding(3072),
    'gemini-embedding-2': createMockEmbedding(768),
  },
};

export const setupMockAI = () => {
  const mockEmbeddingsCreate = vi.fn().mockImplementation(async ({ input }) => {
    const model = process.env.EMBEDDING_MODEL || 'gemini-embedding-2';
    const embedding = mockOpenAIResponses.embeddings[model] || mockOpenAIResponses.embeddings['gemini-embedding-2'];
    return {
      data: Array.isArray(input) ? input.map(() => ({ embedding })) : [{ embedding }],
    };
  });

  const mockChatCompletionsCreate = vi.fn().mockImplementation(async ({ messages }) => {
    const userContent = messages.find(m => m.role === 'user')?.content || '';
    let responseContent = mockOpenAIResponses.chatCompletions['enhance-pro-sum'];

    if (userContent.includes('job description') || userContent.includes('JD')) {
      responseContent = mockOpenAIResponses.chatCompletions['enhance-job-desc'];
    } else if (userContent.includes('tailor') || userContent.includes('Rewritten bullets')) {
      responseContent = mockOpenAIResponses.chatCompletions['tailor-resume'];
    } else if (userContent.includes('refine') || userContent.includes('User feedback')) {
      responseContent = mockOpenAIResponses.chatCompletions['refine-bullet'];
    } else if (userContent.includes('skill gap') || userContent.includes('skill gaps')) {
      responseContent = mockOpenAIResponses.chatCompletions['skill-gaps'];
    } else if (userContent.includes('optimization') || userContent.includes('recommendations')) {
      responseContent = mockOpenAIResponses.chatCompletions['optimize'];
    } else if (userContent.includes('executive evaluation') || userContent.includes('Why the score')) {
      responseContent = mockOpenAIResponses.chatCompletions['explanation'];
    } else if (userContent.includes('extract data from this resume')) {
      responseContent = mockOpenAIResponses.chatCompletions['parse-resume'];
    }

    return {
      choices: [{ message: { content: responseContent } }],
    };
  });

  const mockAI = {
    chat: {
      completions: {
        create: mockChatCompletionsCreate,
      },
    },
    embeddings: {
      create: mockEmbeddingsCreate,
    },
  };

  vi.doMock('../configs/ai.js', () => ({
    default: mockAI,
  }));

  return { mockAI, mockChatCompletionsCreate, mockEmbeddingsCreate };
};

export const resetMockAI = () => {
  vi.clearAllMocks();
};