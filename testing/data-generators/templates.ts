// Resume structure templates for different completeness levels

export const TEMPLATES = ['classic', 'modern', 'minimal', 'minimal-image'] as const;
export type Template = typeof TEMPLATES[number];

export const ACCENT_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export const COMPLETENESS_LEVELS = ['complete', 'minimal', 'no-projects', 'no-summary', 'no-education'] as const;
export type CompletenessLevel = typeof COMPLETENESS_LEVELS[number];

export const SKILL_PROFILES = ['specialist', 'generalist', 'polyglot', 'legacy-to-modern'] as const;
export type SkillProfile = typeof SKILL_PROFILES[number];

export interface ResumeTemplate {
  includeSummary: boolean;
  includeProjects: boolean;
  includeEducation: boolean;
  minSkills: number;
  maxSkills: number;
  minExperience: number;
  maxExperience: number;
  minProjects: number;
  maxProjects: number;
  minEducation: number;
  maxEducation: number;
}

export const TEMPLATE_CONFIGS: Record<CompletenessLevel, ResumeTemplate> = {
  complete: {
    includeSummary: true,
    includeProjects: true,
    includeEducation: true,
    minSkills: 8,
    maxSkills: 20,
    minExperience: 2,
    maxExperience: 5,
    minProjects: 2,
    maxProjects: 4,
    minEducation: 1,
    maxEducation: 3,
  },
  minimal: {
    includeSummary: true,
    includeProjects: false,
    includeEducation: true,
    minSkills: 5,
    maxSkills: 10,
    minExperience: 1,
    maxExperience: 2,
    minProjects: 0,
    maxProjects: 0,
    minEducation: 1,
    maxEducation: 1,
  },
  'no-projects': {
    includeSummary: true,
    includeProjects: false,
    includeEducation: true,
    minSkills: 6,
    maxSkills: 15,
    minExperience: 2,
    maxExperience: 4,
    minProjects: 0,
    maxProjects: 0,
    minEducation: 1,
    maxEducation: 2,
  },
  'no-summary': {
    includeSummary: false,
    includeProjects: true,
    includeEducation: true,
    minSkills: 8,
    maxSkills: 18,
    minExperience: 2,
    maxExperience: 5,
    minProjects: 2,
    maxProjects: 4,
    minEducation: 1,
    maxEducation: 3,
  },
  'no-education': {
    includeSummary: true,
    includeProjects: true,
    includeEducation: false,
    minSkills: 8,
    maxSkills: 20,
    minExperience: 2,
    maxExperience: 5,
    minProjects: 2,
    maxProjects: 4,
    minEducation: 0,
    maxEducation: 0,
  },
};

export const EXPERIENCE_DESCRIPTIONS = {
  learning: [
    'Assisted senior engineers with feature development and bug fixes',
    'Learned codebase architecture and development workflows',
    'Wrote unit tests and improved test coverage',
    'Participated in code reviews and team ceremonies',
    'Documented technical processes and APIs',
  ],
  execution: [
    'Developed and maintained features using {skills}',
    'Built RESTful APIs and integrated third-party services',
    'Optimized database queries improving performance by {percent}%',
    'Implemented automated testing reducing bugs by {percent}%',
    'Collaborated with cross-functional teams to deliver features on time',
  ],
  ownership: [
    'Led development of {feature} serving {scale} users',
    'Architected and implemented {system} reducing latency by {percent}%',
    'Mentored {count} junior engineers and conducted code reviews',
    'Drove technical decisions for {domain} platform',
    'Established CI/CD pipelines and deployment automation',
  ],
  leadership: [
    'Led a team of {count} engineers building {product}',
    'Defined technical strategy for {domain} resulting in {outcome}',
    'Managed {budget} infrastructure budget and reduced costs by {percent}%',
    'Established engineering best practices adopted across {count} teams',
    'Collaborated with product and design to shape {feature} roadmap',
  ],
  strategic: [
    'Directed engineering organization of {count}+ engineers across {count} teams',
    'Defined multi-year technical vision for {domain}',
    'Led company-wide {initiative} improving {metric} by {percent}%',
    'Advised C-suite on technology strategy and investment decisions',
    'Built and scaled {platform} handling {scale} requests per day',
  ],
};

export const PROJECT_TYPES = [
  'Personal Project', 'Open Source', 'Hackathon', 'Course Project', 'Research',
  'Freelance', 'Internal Tool', 'Production System', 'Prototype', 'Library',
];

export const PROJECT_DESCRIPTIONS = {
  specialist: [
    'Built a {domain}-focused {tool} using {skills}',
    'Created an open-source {library} for {domain} with {count} stars on GitHub',
    'Developed a {system} that processes {scale} {unit} daily',
  ],
  generalist: [
    'Built a full-stack {app} with {frontend} and {backend}',
    'Created a {tool} automating {task} saving {time} per week',
    'Developed a {platform} for {use-case} with {count} active users',
  ],
  polyglot: [
    'Implemented {feature} in {lang1}, {lang2}, and {lang3} for comparison',
    'Built a polyglot microservices architecture using {skills}',
    'Created a {system} demonstrating {concept} across multiple languages',
  ],
  'legacy-to-modern': [
    'Migrated legacy {system} from {oldTech} to {newTech}',
    'Modernized {application} reducing technical debt by {percent}%',
    'Refactored monolithic {app} into microservices using {skills}',
  ],
};

export function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getRandomItems<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function randomPercent(): number {
  return Math.floor(Math.random() * 60) + 10; // 10-70%
}

export function randomCount(max: number = 10): number {
  return Math.floor(Math.random() * max) + 1;
}