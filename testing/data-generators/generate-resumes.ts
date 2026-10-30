// Main synthetic resume generator
// Run with: npx tsx testing/data-generators/generate-resumes.ts

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { PROFESSIONS, EXPERIENCE_LEVELS, EDUCATION_LEVELS, INSTITUTIONS, COMPANIES, LOCATIONS, SKILL_CATEGORIES } from './professions.js';
import { getCanonicalSkill, normalizeSkillList } from './skills-taxonomy.js';
import { 
  randomGPA, randomPhone, randomLinkedIn, randomGitHub, randomWebsite,
  COMPANIES as INST_COMPANIES, LOCATIONS as INST_LOCATIONS,
} from './institutions.js';
import { 
  TEMPLATE_CONFIGS, COMPLETENESS_LEVELS, TEMPLATES, ACCENT_COLORS,
  EXPERIENCE_DESCRIPTIONS, PROJECT_TYPES, PROJECT_DESCRIPTIONS,
  getRandomItem, getRandomItems, randomPercent, randomCount, SkillProfile
} from './templates.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface SyntheticResume {
  title: string;
  template: Template;
  accent_color: string;
  professional_summary: string;
  skills: string[];
  personal_info: {
    full_name: string;
    profession: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    website: string;
    image: string;
  };
  experience: Array<{
    company: string;
    position: string;
    start_date: string;
    end_date: string;
    description: string;
    is_current: boolean;
  }>;
  project: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    graduation_date: string;
    gpa: string;
  }>;
  public: boolean;
  _meta: {
    profession: string;
    experienceLevel: string;
    industry: string;
    educationLevel: string;
    skillProfile: string;
    completeness: string;
    seed: number;
  };
}

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Blake', 'Cameron',
  'Dakota', 'Emery', 'Finley', 'Hayden', 'Jesse', 'Kendall', 'Logan', 'Marley', 'Peyton', 'Reese',
  'Sage', 'Skyler', 'Tatum', 'Willow', 'Phoenix', 'River', 'Rowan', 'Sawyer', 'Spencer', 'Dana',
  'Jamie', 'Kelly', 'Lee', 'Pat', 'Sam', 'Terry', 'Tracy', 'Adrian', 'Bailey', 'Charlie',
];

const LAST_NAMES = [
  'Chen', 'Patel', 'Kim', 'Singh', 'Garcia', 'Martinez', 'Rodriguez', 'Lopez', 'Gonzalez', 'Wilson',
  'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker',
];

const SKILL_PROFILES: SkillProfile[] = ['specialist', 'generalist', 'polyglot', 'legacy-to-modern'];

function generateName(random: () => number): string {
  const getRandomItemSeeded = <T>(arr: T[]): T => arr[Math.floor(random() * arr.length)];
  return `${getRandomItemSeeded(FIRST_NAMES)} ${getRandomItemSeeded(LAST_NAMES)}`;
}

function generateEmail(name: string, random: () => number): string {
  const getRandomItemSeeded = <T>(arr: T[]): T => arr[Math.floor(random() * arr.length)];
  const clean = name.toLowerCase().replace(/[^a-z]/g, '.');
  const domains = ['example.com', 'test.com', 'sample.org', 'demo.net'];
  return `${clean}${Math.floor(random() * 1000)}@${getRandomItemSeeded(domains)}`;
}

function selectSkillsForProfession(profession: typeof PROFESSIONS[0], profile: SkillProfile, count: number, random: () => number): string[] {
  const baseSkills = [...profession.skills];
  const allSkills = [...SKILL_CATEGORIES.Technical, ...SKILL_CATEGORIES.Tool, ...SKILL_CATEGORIES.Domain];
  
  const getRandomItemSeeded = <T>(arr: T[]): T => arr[Math.floor(random() * arr.length)];
  const getRandomItemsSeeded = <T>(arr: T[], min: number, max: number): T[] => {
    const count = Math.floor(random() * (max - min + 1)) + min;
    const shuffled = [...arr].sort(() => random() - 0.5);
    return shuffled.slice(0, count);
  };
  
  let selected: string[] = [];
  
  switch (profile) {
    case 'specialist':
      selected = getRandomItemsSeeded(baseSkills, Math.min(count, baseSkills.length), Math.min(count, baseSkills.length));
      break;
    case 'generalist':
      selected = getRandomItemsSeeded(baseSkills, Math.floor(count * 0.6), Math.floor(count * 0.7));
      const toolSkills = getRandomItemsSeeded(SKILL_CATEGORIES.Tool, Math.floor(count * 0.3), Math.floor(count * 0.4));
      selected = [...selected, ...toolSkills];
      break;
    case 'polyglot':
      const langSkills = baseSkills.filter(s => ['Python', 'JavaScript', 'TypeScript', 'Go', 'Java', 'Rust', 'C++', 'Swift', 'Kotlin'].includes(s));
      selected = getRandomItemsSeeded(langSkills, Math.floor(count * 0.5), Math.floor(count * 0.6));
      const otherSkills = getRandomItemsSeeded(allSkills.filter(s => !langSkills.includes(s)), Math.floor(count * 0.4), Math.floor(count * 0.5));
      selected = [...selected, ...otherSkills];
      break;
    case 'legacy-to-modern':
      const legacySkills = baseSkills.filter(s => ['Java', 'C++', 'PHP', 'jQuery', 'AngularJS', 'Backbone'].includes(s));
      const modernSkills = baseSkills.filter(s => ['TypeScript', 'React', 'Go', 'Rust', 'Kubernetes', 'GraphQL'].includes(s));
      selected = [
        ...getRandomItemsSeeded(legacySkills, Math.floor(count * 0.3), Math.floor(count * 0.4)),
        ...getRandomItemsSeeded(modernSkills, Math.floor(count * 0.5), Math.floor(count * 0.6)),
        ...getRandomItemsSeeded(SKILL_CATEGORIES.Tool, Math.floor(count * 0.2), Math.floor(count * 0.3)),
      ];
      break;
  }
  
  const normalized = normalizeSkillList(selected);
  return normalized.map(n => n.original).slice(0, count);
}

function generateProfessionalSummary(profession: typeof PROFESSIONS[0], level: typeof EXPERIENCE_LEVELS[0], skills: string[], random: () => number): string {
  const getRandomItemSeeded = <T>(arr: T[]): T => arr[Math.floor(random() * arr.length)];
  const topSkills = skills.slice(0, 3).join(', ');
  const templates = [
    `${level.name} ${profession.name} with ${level.yearsRange[1]}+ years of experience in ${topSkills}. Passionate about building scalable solutions and solving complex problems.`,
    `Experienced ${profession.name} specializing in ${topSkills}. Proven track record of delivering high-quality software and leading technical initiatives.`,
    `${profession.name} with expertise in ${topSkills}. Strong background in ${profession.industries[0].toLowerCase()} and ${profession.industries[1]?.toLowerCase()}. Committed to continuous learning and best practices.`,
  ];
  return getRandomItemSeeded(templates);
}

function generateExperience(profession: typeof PROFESSIONS[0], level: typeof EXPERIENCE_LEVELS[0], skills: string[], industry: string, startYear: number, random: () => number, randomDateRangeSeeded: (startYear: number, endYear: number, minMonths?: number) => { start: string; end: string; isCurrent: boolean }): Array<{company: string; position: string; start_date: string; end_date: string; description: string; is_current: boolean}> {
  const getRandomItemSeeded = <T>(arr: T[]): T => arr[Math.floor(random() * arr.length)];
  const randomPercentSeeded = () => Math.floor(random() * 60) + 10;
  const randomCountSeeded = (max: number = 10) => Math.floor(random() * max) + 1;
  
  const numRoles = Array.isArray(level.numRoles) 
    ? Math.floor(random() * (level.numRoles[1] - level.numRoles[0] + 1)) + level.numRoles[0]
    : level.numRoles;
  
  const experience = [];
  let currentYear = startYear;
  
  for (let i = 0; i < numRoles; i++) {
    const company = getRandomItemSeeded(INST_COMPANIES);
    const position = getRandomItemSeeded(profession.experienceTitles);
    const { start, end, isCurrent } = randomDateRangeSeeded(currentYear, new Date().getFullYear(), 12);
    
    // Generate description based on level
    const descTemplates = EXPERIENCE_DESCRIPTIONS[level.descriptionStyle as keyof typeof EXPERIENCE_DESCRIPTIONS] || EXPERIENCE_DESCRIPTIONS.execution;
    let description = getRandomItemSeeded(descTemplates);
    
    // Replace placeholders
    description = description
      .replace('{skills}', skills.slice(0, 3).join(', '))
      .replace('{percent}', randomPercentSeeded().toString())
      .replace('{count}', randomCountSeeded(5).toString())
      .replace('{feature}', `${profession.name} platform`)
      .replace('{system}', 'distributed system')
      .replace('{domain}', profession.name.toLowerCase())
      .replace('{outcome}', 'improved efficiency')
      .replace('{budget}', '$500K')
      .replace('{initiative}', 'modernization initiative')
      .replace('{metric}', 'deployment frequency')
      .replace('{platform}', 'data platform')
      .replace('{scale}', '1M+')
      .replace('{product}', 'core product')
      .replace('{app}', 'application');
    
    if (i > 0) {
      description = `${description}\n${getRandomItemSeeded(descTemplates).replace('{skills}', skills.slice(0, 2).join(', ')).replace('{percent}', randomPercentSeeded().toString())}`;
    }
    
    experience.push({
      company,
      position,
      start_date: start,
      end_date: end,
      description,
      is_current: isCurrent,
    });
    
    if (!isCurrent) {
      const [endYear] = end.split('-').map(Number);
      currentYear = endYear + Math.floor(random() * 2) + 1;
    }
  }
  
  return experience;
}

function generateProjects(profession: typeof PROFESSIONS[0], profile: SkillProfile, skills: string[], count: number, random: () => number): Array<{name: string; type: string; description: string}> {
  const getRandomItemSeeded = <T>(arr: T[]): T => arr[Math.floor(random() * arr.length)];
  const randomCountSeeded = (max: number = 10) => Math.floor(random() * max) + 1;
  const randomPercentSeeded = () => Math.floor(random() * 60) + 10;
  
  const projects = [];
  const descTemplates = PROJECT_DESCRIPTIONS[profile] || PROJECT_DESCRIPTIONS.generalist;
  const projectNameSuffixes = ['Platform', 'Tool', 'Dashboard', 'API', 'Library', 'Framework', 'System', 'Engine'];
  
  for (let i = 0; i < count; i++) {
    const name = `${profession.name} ${getRandomItemSeeded(projectNameSuffixes)}`;
    const type = getRandomItemSeeded(PROJECT_TYPES);
    let description = getRandomItemSeeded(descTemplates);
    
    description = description
      .replace('{domain}', profession.name.toLowerCase())
      .replace('{tool}', 'CLI tool')
      .replace('{skills}', skills.slice(0, 3).join(', '))
      .replace('{library}', 'utility library')
      .replace('{count}', randomCountSeeded(500).toString())
      .replace('{system}', 'data pipeline')
      .replace('{scale}', '100K+')
      .replace('{unit}', 'records')
      .replace('{app}', 'web application')
      .replace('{frontend}', 'React')
      .replace('{backend}', 'Node.js')
      .replace('{use-case}', 'team collaboration')
      .replace('{lang1}', 'Python')
      .replace('{lang2}', 'Go')
      .replace('{lang3}', 'Rust')
      .replace('{concept}', 'distributed consensus')
      .replace('{oldTech}', 'jQuery')
      .replace('{newTech}', 'React')
      .replace('{application}', 'e-commerce platform')
      .replace('{percent}', randomPercentSeeded().toString());
    
    projects.push({ name, type, description });
  }
  
  return projects;
}

function generateEducation(level: string, industry: string, graduationYear: number, random: () => number): Array<{institution: string; degree: string; field: string; graduation_date: string; gpa: string}> {
  const getRandomItemSeeded = <T>(arr: T[]): T => arr[Math.floor(random() * arr.length)];
  const randomGPASeeded = () => (3.0 + random() * 1.0).toFixed(2);
  
  const eduLevel = EDUCATION_LEVELS.find(e => e.level === level) || EDUCATION_LEVELS[2];
  const degree = getRandomItemSeeded(eduLevel.degrees);
  const institution = getRandomItemSeeded(INSTITUTIONS);
  const field = industry === 'HealthTech' ? 'Bioinformatics' : 
                industry === 'Fintech' ? 'Financial Engineering' : 'Computer Science';
  
  return [{
    institution,
    degree,
    field,
    graduation_date: `${graduationYear}-06`,
    gpa: eduLevel.gpaRange[0] ? randomGPASeeded() : '',
  }];
}

export function generateResume(seed: number): SyntheticResume {
  // Use seed for deterministic generation
  let seedValue = seed;
  const random = () => {
    seedValue = (seedValue * 1664525 + 1013904223) % 4294967296;
    return seedValue / 4294967296;
  };
  
  // Override random functions to use seeded random
  const getRandomItemSeeded = <T>(arr: T[]): T => arr[Math.floor(random() * arr.length)];
  const getRandomItemsSeeded = <T>(arr: T[], min: number, max: number): T[] => {
    const count = Math.floor(random() * (max - min + 1)) + min;
    const shuffled = [...arr].sort(() => random() - 0.5);
    return shuffled.slice(0, count);
  };
  const randomPercentSeeded = () => Math.floor(random() * 60) + 10;
  const randomCountSeeded = (max: number = 10) => Math.floor(random() * max) + 1;
  const randomBoolSeeded = (prob: number = 0.5) => random() < prob;
  
  // Seeded date functions
  const randomDateSeeded = (startYear: number, endYear: number): string => {
    const year = Math.floor(random() * (endYear - startYear + 1)) + startYear;
    const month = Math.floor(random() * 12) + 1;
    return `${year}-${month.toString().padStart(2, '0')}`;
  };
  
  const randomDateRangeSeeded = (startYear: number, endYear: number, minMonths: number = 6): { start: string; end: string; isCurrent: boolean } => {
    const start = randomDateSeeded(startYear, endYear);
    const [startYearNum, startMonthNum] = start.split('-').map(Number);
    const startDate = new Date(startYearNum, startMonthNum - 1);
    
    const isCurrent = random() < 0.3 && endYear === new Date().getFullYear();
    let end: string;
    
    if (isCurrent) {
      end = 'Present';
    } else {
      const minEndDate = new Date(startDate);
      minEndDate.setMonth(minEndDate.getMonth() + minMonths);
      const maxEndDate = new Date(endYear, 11, 31);
      const endTime = minEndDate.getTime() + random() * (maxEndDate.getTime() - minEndDate.getTime());
      const endDate = new Date(endTime);
      end = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}`;
    }
    
    return { start, end, isCurrent };
  };
  
  const profession = getRandomItemSeeded(PROFESSIONS);
  const experienceLevel = getRandomItemSeeded(EXPERIENCE_LEVELS);
  const industry = getRandomItemSeeded(profession.industries);
  const educationLevel = getRandomItemSeeded(EDUCATION_LEVELS).level;
  const skillProfile = getRandomItemSeeded(SKILL_PROFILES);
  const completeness = getRandomItemSeeded(COMPLETENESS_LEVELS);
  const template = getRandomItemSeeded(TEMPLATES);
  const accentColor = getRandomItemSeeded(ACCENT_COLORS);
  
  const config = TEMPLATE_CONFIGS[completeness];
  
  const name = generateName(random);
  const email = generateEmail(name, random);
  const graduationYear = new Date().getFullYear() - experienceLevel.yearsRange[1] - Math.floor(random() * 4) - 2;
  const startYear = graduationYear + 1;
  
  const skillCount = Math.floor(random() * (config.maxSkills - config.minSkills + 1)) + config.minSkills;
  const skills = selectSkillsForProfession(profession, skillProfile, skillCount, random);
  
  const professional_summary = config.includeSummary 
    ? generateProfessionalSummary(profession, experienceLevel, skills, random)
    : '';
  
  const expCount = Math.floor(random() * (config.maxExperience - config.minExperience + 1)) + config.minExperience;
  const experience = generateExperience(profession, experienceLevel, skills, industry, startYear, random, randomDateRangeSeeded).slice(0, expCount);
  
  const projCount = Math.floor(random() * (config.maxProjects - config.minProjects + 1)) + config.minProjects;
  const projects = config.includeProjects 
    ? generateProjects(profession, skillProfile, skills, projCount, random)
    : [];
  
  const eduCount = Math.floor(random() * (config.maxEducation - config.minEducation + 1)) + config.minEducation;
  const education = config.includeEducation && eduCount > 0
    ? generateEducation(educationLevel, industry, graduationYear, random).slice(0, eduCount)
    : [];
  
  return {
    title: `${profession.name} Resume - ${experienceLevel.name}`,
    template,
    accent_color: accentColor,
    professional_summary,
    skills,
    personal_info: {
      full_name: name,
      profession: profession.name,
      email,
      phone: `555-${Math.floor(random() * 900) + 100}-${Math.floor(random() * 9000) + 1000}`,
      location: getRandomItemSeeded(INST_LOCATIONS),
      linkedin: `linkedin.com/in/${name.toLowerCase().replace(/[^a-z]/g, '')}${Math.floor(random() * 1000)}`,
      website: `${name.toLowerCase().replace(/[^a-z]/g, '')}${['.com', '.dev', '.io', '.app', '.tech', '.xyz'][Math.floor(random() * 6)]}`,
      image: ' ',
    },
    experience,
    project: projects,
    education,
    public: randomBoolSeeded(0.3),
    _meta: {
      profession: profession.name,
      experienceLevel: experienceLevel.name,
      industry,
      educationLevel,
      skillProfile,
      completeness,
      seed,
    },
  };
}

export function main() {
  const COUNT = 1000;
  const SEED = 42;
  const OUTPUT_DIR = join(__dirname, '..', 'fixtures', 'generated');
  
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  console.log(`Generating ${COUNT} synthetic resumes with seed ${SEED}...`);
  
  const resumes: SyntheticResume[] = [];
  const index: Record<string, number[]> = {
    profession: {},
    experienceLevel: {},
    industry: {},
    educationLevel: {},
    skillProfile: {},
    completeness: {},
  };
  
  for (let i = 0; i < COUNT; i++) {
    const resume = generateResume(SEED + i);
    resumes.push(resume);
    
    // Build index
    const meta = resume._meta;
    if (!index.profession[meta.profession]) index.profession[meta.profession] = [];
    index.profession[meta.profession].push(i);
    if (!index.experienceLevel[meta.experienceLevel]) index.experienceLevel[meta.experienceLevel] = [];
    index.experienceLevel[meta.experienceLevel].push(i);
    if (!index.industry[meta.industry]) index.industry[meta.industry] = [];
    index.industry[meta.industry].push(i);
    if (!index.educationLevel[meta.educationLevel]) index.educationLevel[meta.educationLevel] = [];
    index.educationLevel[meta.educationLevel].push(i);
    if (!index.skillProfile[meta.skillProfile]) index.skillProfile[meta.skillProfile] = [];
    index.skillProfile[meta.skillProfile].push(i);
    if (!index.completeness[meta.completeness]) index.completeness[meta.completeness] = [];
    index.completeness[meta.completeness].push(i);
  }
  
  // Write main file
  const outputFile = join(OUTPUT_DIR, `resumes-${SEED}.json`);
  writeFileSync(outputFile, JSON.stringify(resumes, null, 2));
  console.log(`Written ${resumes.length} resumes to ${outputFile}`);
  
  // Write index
  const indexFile = join(OUTPUT_DIR, 'index.json');
  writeFileSync(indexFile, JSON.stringify(index, null, 2));
  console.log(`Written index to ${indexFile}`);
  
  // Generate invalid test cases
  const invalidResumes = [
    { _meta: { reason: 'empty-object', seed: -1 }, ...({} as any) },
    { _meta: { reason: 'missing-required-fields', seed: -2 }, title: '' },
    { ...generateResume(-3), _meta: { reason: 'invalid-email', seed: -3 }, personal_info: { ...generateResume(-3).personal_info, email: 'not-an-email' } },
    { ...generateResume(-4), _meta: { reason: 'malformed-dates', seed: -4 }, experience: [{ ...generateResume(-4).experience[0], start_date: 'not-a-date', end_date: 'also-not-a-date' }] },
    { ...generateResume(-5), _meta: { reason: 'empty-arrays', seed: -5 }, skills: [], experience: [], project: [], education: [] },
    { ...generateResume(-6), _meta: { reason: 'unicode-stress', seed: -6 }, professional_summary: '测试中文 🚀 ñoño \u0000\u0001\u0002', skills: ['Python\u0000', 'JavaScript'] },
    { ...generateResume(-7), _meta: { reason: 'extremely-long-text', seed: -7 }, professional_summary: 'A'.repeat(10000) },
    { ...generateResume(-8), _meta: { reason: 'null-values', seed: -8 }, skills: ['Python', null, 'JavaScript'] as any },
    { ...generateResume(-9), _meta: { reason: 'negative-experience', seed: -9 }, experience: [{ ...generateResume(-9).experience[0], start_date: '2025-01', end_date: '2020-01' }] },
    { ...generateResume(-10), _meta: { reason: 'duplicate-skills', seed: -10 }, skills: ['Python', 'python', 'PYTHON', 'JavaScript', 'javascript'] },
  ];
  
  const invalidFile = join(OUTPUT_DIR, 'invalid-resumes.json');
  writeFileSync(invalidFile, JSON.stringify(invalidResumes, null, 2));
  console.log(`Written ${invalidResumes.length} invalid test cases to ${invalidFile}`);
  
  // Print summary
  console.log('\n--- Generation Summary ---');
  console.log(`Total resumes: ${resumes.length}`);
  console.log('\nBy Profession:');
  for (const [prof, indices] of Object.entries(index.profession)) {
    console.log(`  ${prof}: ${indices.length}`);
  }
  console.log('\nBy Experience Level:');
  for (const [level, indices] of Object.entries(index.experienceLevel)) {
    console.log(`  ${level}: ${indices.length}`);
  }
  console.log('\nBy Industry:');
  for (const [ind, indices] of Object.entries(index.industry)) {
    console.log(`  ${ind}: ${indices.length}`);
  }
  console.log('\nBy Education Level:');
  for (const [edu, indices] of Object.entries(index.educationLevel)) {
    console.log(`  ${edu}: ${indices.length}`);
  }
  console.log('\nBy Skill Profile:');
  for (const [profile, indices] of Object.entries(index.skillProfile)) {
    console.log(`  ${profile}: ${indices.length}`);
  }
  console.log('\nBy Completeness:');
  for (const [comp, indices] of Object.entries(index.completeness)) {
    console.log(`  ${comp}: ${indices.length}`);
  }
  
  console.log('\n✅ Generation complete!');
}

// Only run main when executed directly, not when imported
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}