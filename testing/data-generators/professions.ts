// Profession and industry definitions for synthetic resume generation

export const PROFESSIONS = [
  { 
    name: 'Software Engineer', 
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Go', 'Java', 'C++', 'SQL', 'Git', 'Docker', 'AWS', 'GraphQL', 'REST APIs', 'Microservices'],
    experienceTitles: ['Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Principal Engineer', 'Engineering Lead'],
    industries: ['SaaS', 'Fintech', 'E-commerce', 'Gaming', 'Enterprise', 'HealthTech', 'EdTech'],
  },
  { 
    name: 'Data Scientist', 
    skills: ['Python', 'R', 'SQL', 'Machine Learning', 'Deep Learning', 'Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow', 'PyTorch', 'MLOps', 'Statistics', 'Data Visualization', 'Tableau', 'Jupyter'],
    experienceTitles: ['Data Scientist', 'Senior Data Scientist', 'Lead Data Scientist', 'Principal Data Scientist', 'ML Engineer'],
    industries: ['Fintech', 'HealthTech', 'E-commerce', 'SaaS', 'Research', 'Crypto'],
  },
  { 
    name: 'Data Analyst', 
    skills: ['SQL', 'Python', 'Tableau', 'Power BI', 'Excel', 'Looker', 'ETL', 'Data Modeling', 'Statistics', 'A/B Testing', 'Dashboarding', 'Snowflake', 'BigQuery'],
    experienceTitles: ['Data Analyst', 'Senior Data Analyst', 'Lead Data Analyst', 'Analytics Engineer', 'Business Analyst'],
    industries: ['Fintech', 'E-commerce', 'SaaS', 'HealthTech', 'Enterprise', 'EdTech'],
  },
  { 
    name: 'DevOps Engineer', 
    skills: ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'CI/CD', 'Jenkins', 'GitHub Actions', 'Prometheus', 'Grafana', 'Linux', 'Python', 'Go', 'Helm'],
    experienceTitles: ['DevOps Engineer', 'Senior DevOps Engineer', 'Platform Engineer', 'SRE', 'Infrastructure Engineer'],
    industries: ['SaaS', 'Fintech', 'Enterprise', 'Gaming', 'Crypto'],
  },
  { 
    name: 'Product Manager', 
    skills: ['Product Strategy', 'Roadmapping', 'Agile', 'Scrum', 'Jira', 'Analytics', 'A/B Testing', 'User Research', 'SQL', 'Figma', 'Stakeholder Management', 'Prioritization', 'Go-to-Market'],
    experienceTitles: ['Product Manager', 'Senior Product Manager', 'Group Product Manager', 'Director of Product', 'VP Product'],
    industries: ['SaaS', 'Fintech', 'E-commerce', 'HealthTech', 'EdTech', 'Enterprise'],
  },
  { 
    name: 'UX/UI Designer', 
    skills: ['Figma', 'Sketch', 'Adobe XD', 'User Research', 'Prototyping', 'Design Systems', 'Usability Testing', 'Wireframing', 'Interaction Design', 'HTML', 'CSS', 'Accessibility'],
    experienceTitles: ['UX Designer', 'UI Designer', 'Product Designer', 'Senior Designer', 'Design Lead'],
    industries: ['SaaS', 'E-commerce', 'Fintech', 'HealthTech', 'Consumer Tech', 'Enterprise'],
  },
  { 
    name: 'Frontend Engineer', 
    skills: ['React', 'TypeScript', 'JavaScript', 'Next.js', 'Vue.js', 'CSS', 'Tailwind', 'Webpack', 'Vite', 'Testing', 'Storybook', 'GraphQL', 'Redux', 'Performance'],
    experienceTitles: ['Frontend Engineer', 'Senior Frontend Engineer', 'Frontend Lead', 'Staff Frontend Engineer'],
    industries: ['SaaS', 'E-commerce', 'Consumer Tech', 'Fintech', 'HealthTech', 'Enterprise'],
  },
  { 
    name: 'Backend Engineer', 
    skills: ['Node.js', 'Go', 'Python', 'Java', 'PostgreSQL', 'MongoDB', 'Redis', 'RabbitMQ', 'Kafka', 'gRPC', 'REST APIs', 'Microservices', 'Docker', 'Kubernetes', 'AWS'],
    experienceTitles: ['Backend Engineer', 'Senior Backend Engineer', 'Backend Lead', 'Staff Backend Engineer'],
    industries: ['SaaS', 'Fintech', 'E-commerce', 'Gaming', 'Enterprise', 'Crypto'],
  },
  { 
    name: 'Mobile Engineer', 
    skills: ['React Native', 'Swift', 'Kotlin', 'Flutter', 'iOS', 'Android', 'TypeScript', 'GraphQL', 'Firebase', 'App Store', 'Play Store', 'CI/CD', 'Testing'],
    experienceTitles: ['Mobile Engineer', 'Senior Mobile Engineer', 'Mobile Lead', 'iOS Engineer', 'Android Engineer'],
    industries: ['Consumer Tech', 'Fintech', 'HealthTech', 'E-commerce', 'Gaming', 'Social'],
  },
  { 
    name: 'ML Engineer', 
    skills: ['Python', 'TensorFlow', 'PyTorch', 'MLOps', 'Kubeflow', 'MLflow', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Feature Stores', 'Model Serving', 'ONNX', 'CUDA'],
    experienceTitles: ['ML Engineer', 'Senior ML Engineer', 'ML Platform Engineer', 'Applied Scientist', 'Research Engineer'],
    industries: ['AI/ML', 'Fintech', 'HealthTech', 'Autonomous Vehicles', 'Research', 'SaaS'],
  },
  { 
    name: 'Security Engineer', 
    skills: ['Security', 'Penetration Testing', 'OWASP', 'Cryptography', 'SIEM', 'Incident Response', 'Compliance', 'AWS Security', 'Kubernetes Security', 'Zero Trust', 'Python', 'Go'],
    experienceTitles: ['Security Engineer', 'Senior Security Engineer', 'Security Lead', 'AppSec Engineer', 'Cloud Security Engineer'],
    industries: ['Fintech', 'Enterprise', 'SaaS', 'HealthTech', 'Government', 'Crypto'],
  },
  { 
    name: 'QA Engineer', 
    skills: ['Testing', 'Automation', 'Selenium', 'Cypress', 'Playwright', 'Jest', 'Postman', 'API Testing', 'Performance Testing', 'CI/CD', 'TestRail', 'Jira', 'Python', 'JavaScript'],
    experienceTitles: ['QA Engineer', 'Senior QA Engineer', 'QA Lead', 'SDET', 'Test Architect'],
    industries: ['SaaS', 'E-commerce', 'Fintech', 'Enterprise', 'HealthTech', 'Gaming'],
  },
];

export const EXPERIENCE_LEVELS = [
  { name: 'Intern', yearsRange: [0, 1], numRoles: 1, descriptionStyle: 'learning' },
  { name: 'Junior', yearsRange: [1, 3], numRoles: [1, 2], descriptionStyle: 'execution' },
  { name: 'Mid', yearsRange: [3, 5], numRoles: [2, 3], descriptionStyle: 'ownership' },
  { name: 'Senior', yearsRange: [5, 8], numRoles: [2, 4], descriptionStyle: 'leadership' },
  { name: 'Staff/Principal', yearsRange: [8, 15], numRoles: [3, 5], descriptionStyle: 'strategic' },
];

export const EDUCATION_LEVELS = [
  { level: 'PhD', degrees: ['PhD in Computer Science', 'PhD in Machine Learning', 'PhD in Statistics', 'PhD in Electrical Engineering'], gpaRange: [3.5, 4.0] },
  { level: 'MS', degrees: ['Master of Science in Computer Science', 'MS in Data Science', 'MS in Machine Learning', 'MS in Software Engineering', 'MS in Statistics'], gpaRange: [3.3, 4.0] },
  { level: 'BS', degrees: ['Bachelor of Science in Computer Science', 'BS in Software Engineering', 'BS in Data Science', 'BS in Information Technology', 'BS in Mathematics'], gpaRange: [3.0, 4.0] },
  { level: 'Bootcamp', degrees: ['Full Stack Bootcamp', 'Data Science Bootcamp', 'UX Design Bootcamp', 'Cybersecurity Bootcamp'], gpaRange: [null, null] },
  { level: 'Self-taught', degrees: ['Self-taught Developer', 'Online Certifications', 'Industry Certifications'], gpaRange: [null, null] },
  { level: 'Associate', degrees: ['Associate Degree in Computer Science', 'Associate in Information Technology'], gpaRange: [2.5, 3.5] },
];

export const INSTITUTIONS = [
  'Stanford University', 'MIT', 'UC Berkeley', 'Carnegie Mellon', 'Georgia Tech',
  'University of Washington', 'UT Austin', 'University of Michigan', 'Cornell', 'Harvard',
  'Princeton', 'Yale', 'Columbia', 'NYU', 'UCLA', 'USC', 'Caltech', 'University of Illinois',
  'Purdue', 'Texas A&M', 'Ohio State', 'University of Texas', 'University of Maryland',
  'Northeastern', 'Drexel', 'RIT', 'Fullstack Academy', 'Flatiron School', 'General Assembly',
  'Hack Reactor', 'App Academy', 'Lambda School', 'Springboard', 'Coursera', 'edX',
];

export const COMPANIES = [
  // Big Tech
  'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix', 'Uber', 'Airbnb', 'Stripe', 'Databricks',
  'Snowflake', 'Palantir', 'SpaceX', 'Tesla', 'NVIDIA', 'AMD', 'Intel', 'Salesforce', 'Adobe', 'Oracle',
  // Unicorns/Scale-ups
  'Notion', 'Figma', 'Discord', 'Canva', 'Miro', 'Linear', 'Vercel', 'Supabase', 'PlanetScale', 'Retool',
  'Scale AI', 'Anthropic', 'OpenAI', 'Cohere', 'Hugging Face', 'Weights & Biases', 'Modal', 'Replicate',
  // Fintech
  'Plaid', 'Ramp', 'Brex', 'Mercury', 'Chime', 'Robinhood', 'Coinbase', 'Kraken', 'Circle', 'Fireblocks',
  // HealthTech
  'Epic Systems', 'Cerner', 'Tempus', 'Flatiron Health', 'Oscar Health', 'Hims & Hers', 'Ro', 'Aledade',
  // E-commerce
  'Shopify', 'Instacart', 'DoorDash', 'GoPuff', 'Wayfair', 'Chewy', 'Thrive Market', 'Glossier',
  // Enterprise
  'ServiceNow', 'Workday', 'Atlassian', 'Slack', 'Zoom', 'Twilio', 'Okta', 'Auth0', 'MongoDB', 'Elastic',
];

export const LOCATIONS = [
  'San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX', 'Boston, MA',
  'Los Angeles, CA', 'Chicago, IL', 'Denver, CO', 'Atlanta, GA', 'Remote',
  'London, UK', 'Toronto, Canada', 'Berlin, Germany', 'Singapore', 'Sydney, Australia',
];

export const SKILL_CATEGORIES = {
  Technical: ['Python', 'JavaScript', 'TypeScript', 'Go', 'Java', 'C++', 'Rust', 'SQL', 'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL', 'REST APIs', 'gRPC', 'Machine Learning', 'Deep Learning'],
  Tool: ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'Git', 'GitHub', 'GitLab', 'Jenkins', 'GitHub Actions', 'CircleCI', 'Datadog', 'Prometheus', 'Grafana', 'Jira', 'Confluence', 'Figma', 'Tableau', 'Power BI', 'Looker', 'Snowflake', 'BigQuery'],
  Domain: ['Machine Learning', 'Data Engineering', 'DevOps', 'Security', 'Blockchain', 'FinTech', 'HealthTech', 'E-commerce', 'AdTech', 'EdTech', 'IoT', 'Computer Vision', 'NLP', 'Recommendation Systems', 'Time Series'],
  'Soft Skill': ['Communication', 'Leadership', 'Problem Solving', 'Critical Thinking', 'Collaboration', 'Mentoring', 'Project Management', 'Agile', 'Scrum', 'Stakeholder Management', 'Strategic Planning', 'Decision Making'],
};