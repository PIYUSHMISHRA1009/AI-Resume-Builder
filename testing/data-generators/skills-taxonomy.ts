// Skill taxonomy with aliases matching the normalization service

export const SKILL_ALIASES: Record<string, string[]> = {
  // Databases
  'POSTGRESQL': ['postgres', 'postgresql', 'postgresql db', 'postgres db', 'psql'],
  'MYSQL': ['mysql', 'my sql'],
  'MONGODB': ['mongodb', 'mongo db', 'mongo'],
  'MS SQL SERVER': ['sql server', 'mssql'],
  'SQLITE': ['sqlite', 'sqlite3'],
  'ORACLE': ['oracle', 'oracle db'],
  'REDIS': ['redis'],
  'SNOWFLAKE': ['snowflake'],
  'DYNAMODB': ['dynamodb', 'dynamo db'],
  'CASSANDRA': ['cassandra'],
  'ELASTICSEARCH': ['elasticsearch', 'elastic search', 'es'],
  'BIGQUERY': ['bigquery', 'big query'],
  
  // Languages
  'PYTHON': ['python', 'py', 'python3'],
  'R': ['r', 'r programming'],
  'SQL': ['sql', 'structured query language'],
  'JAVASCRIPT': ['javascript', 'js'],
  'TYPESCRIPT': ['typescript', 'ts'],
  'JAVA': ['java'],
  'C++': ['c++', 'cpp'],
  'GO': ['go', 'golang'],
  'RUST': ['rust'],
  'SWIFT': ['swift'],
  'KOTLIN': ['kotlin'],
  'SCALA': ['scala'],
  'PHP': ['php'],
  'RUBY': ['ruby'],
  'C#': ['c#', 'csharp', 'dotnet'],
  
  // BI & Visualization
  'POWER BI': ['powerbi', 'power bi', 'power-bi'],
  'TABLEAU': ['tableau', 'tableau desktop'],
  'LOOKER': ['looker', 'google looker studio'],
  'EXCEL': ['excel', 'ms excel', 'advanced excel'],
  'METABASE': ['metabase'],
  'SUPERSET': ['superset', 'apache superset'],
  
  // Data Engineering
  'ETL': ['etl', 'extract transform load'],
  'DATA WAREHOUSING': ['data warehousing', 'dwh'],
  'DATA PIPELINES': ['data pipeline', 'data pipelines'],
  'DATA MODELING': ['data modeling'],
  'DATA ANALYTICS': ['data analytics', 'data analysis'],
  'BUSINESS INTELLIGENCE': ['business intelligence', 'bi'],
  'AIRFLOW': ['airflow', 'apache airflow'],
  'DBT': ['dbt', 'data build tool'],
  'KAFKA': ['kafka', 'apache kafka'],
  'SPARK': ['spark', 'apache spark', 'pyspark'],
  'FLINK': ['flink', 'apache flink'],
  
  // ML/AI
  'MACHINE LEARNING': ['machine learning', 'ml', 'machine-learning'],
  'DEEP LEARNING': ['deep learning', 'dl'],
  'NLP': ['nlp', 'natural language processing'],
  'LLM': ['llm', 'large language models'],
  'COMPUTER VISION': ['computer vision', 'cv'],
  'SCIKIT-LEARN': ['scikit-learn', 'sklearn'],
  'PANDAS': ['pandas'],
  'NUMPY': ['numpy'],
  'TENSORFLOW': ['tensorflow', 'tf'],
  'PYTORCH': ['pytorch'],
  'KERAS': ['keras'],
  'XGBOOST': ['xgboost'],
  'LIGHTGBM': ['lightgbm'],
  'MLFLOW': ['mlflow'],
  'KUBEFLOW': ['kubeflow'],
  
  // Cloud
  'AWS': ['aws', 'amazon web services'],
  'AZURE': ['azure', 'microsoft azure'],
  'GCP': ['gcp', 'google cloud', 'google cloud platform'],
  'VERCEL': ['vercel'],
  'NETLIFY': ['netlify'],
  'HEROKU': ['heroku'],
  'DIGITALOCEAN': ['digitalocean', 'digital ocean'],
  
  // DevOps
  'DOCKER': ['docker'],
  'KUBERNETES': ['kubernetes', 'k8s'],
  'TERRAFORM': ['terraform'],
  'ANSIBLE': ['ansible'],
  'HELM': ['helm'],
  'PROMETHEUS': ['prometheus'],
  'GRAFANA': ['grafana'],
  'DATADOG': ['datadog'],
  'NEW RELIC': ['new relic', 'newrelic'],
  'SPLUNK': ['splunk'],
  'ELK': ['elk', 'elastic stack'],
  'CIRCLECI': ['circleci'],
  'GITHUB ACTIONS': ['github actions', 'gh actions'],
  'GITLAB CI': ['gitlab ci', 'gitlab ci/cd'],
  'JENKINS': ['jenkins'],
  'ARGOCD': ['argocd', 'argo cd'],
  
  // Version Control
  'GIT': ['git', 'github', 'gitlab', 'bitbucket'],
  
  // Frontend
  'REACT': ['react', 'reactjs', 'react.js'],
  'NEXT.JS': ['next.js', 'nextjs', 'next'],
  'VUE.JS': ['vue.js', 'vuejs', 'vue'],
  'ANGULAR': ['angular', 'angularjs'],
  'SVELTE': ['svelte'],
  'TAILWIND': ['tailwind', 'tailwindcss', 'tailwind css'],
  'CSS': ['css', 'css3', 'scss', 'sass', 'less'],
  'HTML': ['html', 'html5'],
  'WEBPACK': ['webpack'],
  'VITE': ['vite'],
  'STORYBOOK': ['storybook'],
  'REDUX': ['redux', 'react-redux'],
  'ZUSTAND': ['zustand'],
  'REACT QUERY': ['react query', 'tanstack query'],
  
  // Backend
  'NODE.JS': ['node.js', 'nodejs', 'node'],
  'EXPRESS': ['express', 'express.js', 'expressjs'],
  'FASTAPI': ['fastapi'],
  'DJANGO': ['django'],
  'FLASK': ['flask'],
  'SPRING BOOT': ['spring boot', 'spring'],
  'GIN': ['gin', 'gin-gonic'],
  'GRPC': ['grpc', 'g rpc'],
  'REST APIS': ['rest api', 'rest apis', 'restful'],
  'MICROSERVICES': ['microservices', 'micro services'],
  'MESSAGE QUEUES': ['rabbitmq', 'kafka', 'redis streams', 'sqs', 'pub/sub'],
  
  // Testing
  'JEST': ['jest'],
  'CYPRESS': ['cypress'],
  'PLAYWRIGHT': ['playwright'],
  'SELENIUM': ['selenium'],
  'POSTMAN': ['postman'],
  'K6': ['k6'],
  'JMETER': ['jmeter'],
  
  // Mobile
  'REACT NATIVE': ['react native', 'rn'],
  'FLUTTER': ['flutter'],
  'IOS': ['ios', 'swift', 'xcode'],
  'ANDROID': ['android', 'kotlin', 'java android'],
  
  // Security
  'OAUTH': ['oauth', 'oauth2', 'oauth 2.0'],
  'JWT': ['jwt', 'json web token'],
  'SSL/TLS': ['ssl', 'tls', 'ssl/tls'],
  'PENETRATION TESTING': ['penetration testing', 'pentesting', 'pentest'],
  'OWASP': ['owasp'],
  'SIEM': ['siem'],
  'ZERO TRUST': ['zero trust'],
  
  // Soft Skills
  'PROBLEM SOLVING': ['problem solving', 'problem-solving'],
  'COMMUNICATION': ['communication', 'written communication', 'verbal communication'],
  'STAKEHOLDER MANAGEMENT': ['stakeholder management', 'stakeholder engagement'],
  'BUSINESS REQUIREMENTS': ['business requirements', 'requirement gathering', 'requirements analysis'],
  'PROJECT MANAGEMENT': ['project management', 'project planning'],
  'AGILE': ['agile', 'scrum', 'kanban'],
  'CRITICAL THINKING': ['critical thinking', 'analytical thinking'],
  'LEADERSHIP': ['leadership', 'team leadership', 'technical leadership'],
  'MENTORING': ['mentoring', 'coaching', 'teaching'],
  'DECISION MAKING': ['decision making', 'data-driven decisions'],
  
  // Product
  'PRODUCT STRATEGY': ['product strategy', 'product vision'],
  'ROADMAPPING': ['roadmapping', 'product roadmap'],
  'USER RESEARCH': ['user research', 'ux research', 'user interviews'],
  'A/B TESTING': ['a/b testing', 'ab testing', 'experimentation'],
  'PRIORITIZATION': ['prioritization', 'feature prioritization'],
  'GO-TO-MARKET': ['go-to-market', 'gtm', 'product launch'],
  
  // Design
  'FIGMA': ['figma'],
  'SKETCH': ['sketch'],
  'ADOBE XD': ['adobe xd', 'xd'],
  'PROTOTYPING': ['prototyping', 'prototype'],
  'DESIGN SYSTEMS': ['design systems', 'design system'],
  'USABILITY TESTING': ['usability testing', 'user testing'],
  'WIREFRAMING': ['wireframing', 'wireframes'],
  'INTERACTION DESIGN': ['interaction design', 'ixd'],
  'ACCESSIBILITY': ['accessibility', 'a11y', 'wcag'],
};

export const ALL_CANONICAL_SKILLS = Object.keys(SKILL_ALIASES);

export const SKILL_CATEGORY_MAP: Record<string, string> = {
  // Technical
  'POSTGRESQL': 'Technical',
  'MYSQL': 'Technical',
  'MONGODB': 'Technical',
  'MS SQL SERVER': 'Technical',
  'SQLITE': 'Technical',
  'ORACLE': 'Technical',
  'REDIS': 'Technical',
  'SNOWFLAKE': 'Technical',
  'DYNAMODB': 'Technical',
  'CASSANDRA': 'Technical',
  'ELASTICSEARCH': 'Technical',
  'BIGQUERY': 'Technical',
  'PYTHON': 'Technical',
  'R': 'Technical',
  'SQL': 'Technical',
  'JAVASCRIPT': 'Technical',
  'TYPESCRIPT': 'Technical',
  'JAVA': 'Technical',
  'C++': 'Technical',
  'GO': 'Technical',
  'RUST': 'Technical',
  'SWIFT': 'Technical',
  'KOTLIN': 'Technical',
  'SCALA': 'Technical',
  'PHP': 'Technical',
  'RUBY': 'Technical',
  'C#': 'Technical',
  
  // Tool
  'POWER BI': 'Tool',
  'TABLEAU': 'Tool',
  'LOOKER': 'Tool',
  'EXCEL': 'Tool',
  'METABASE': 'Tool',
  'SUPERSET': 'Tool',
  'AWS': 'Tool',
  'AZURE': 'Tool',
  'GCP': 'Tool',
  'VERCEL': 'Tool',
  'NETLIFY': 'Tool',
  'HEROKU': 'Tool',
  'DIGITALOCEAN': 'Tool',
  'DOCKER': 'Tool',
  'KUBERNETES': 'Tool',
  'TERRAFORM': 'Tool',
  'ANSIBLE': 'Tool',
  'HELM': 'Tool',
  'PROMETHEUS': 'Tool',
  'GRAFANA': 'Tool',
  'DATADOG': 'Tool',
  'NEW RELIC': 'Tool',
  'SPLUNK': 'Tool',
  'ELK': 'Tool',
  'CIRCLECI': 'Tool',
  'GITHUB ACTIONS': 'Tool',
  'GITLAB CI': 'Tool',
  'JENKINS': 'Tool',
  'ARGOCD': 'Tool',
  'GIT': 'Tool',
  'REACT': 'Tool',
  'NEXT.JS': 'Tool',
  'VUE.JS': 'Tool',
  'ANGULAR': 'Tool',
  'SVELTE': 'Tool',
  'TAILWIND': 'Tool',
  'CSS': 'Tool',
  'HTML': 'Tool',
  'WEBPACK': 'Tool',
  'VITE': 'Tool',
  'STORYBOOK': 'Tool',
  'REDUX': 'Tool',
  'ZUSTAND': 'Tool',
  'REACT QUERY': 'Tool',
  'NODE.JS': 'Tool',
  'EXPRESS': 'Tool',
  'FASTAPI': 'Tool',
  'DJANGO': 'Tool',
  'FLASK': 'Tool',
  'SPRING BOOT': 'Tool',
  'GIN': 'Tool',
  'GRPC': 'Tool',
  'REST APIS': 'Tool',
  'MICROSERVICES': 'Tool',
  'MESSAGE QUEUES': 'Tool',
  'JEST': 'Tool',
  'CYPRESS': 'Tool',
  'PLAYWRIGHT': 'Tool',
  'SELENIUM': 'Tool',
  'POSTMAN': 'Tool',
  'K6': 'Tool',
  'JMETER': 'Tool',
  'REACT NATIVE': 'Tool',
  'FLUTTER': 'Tool',
  'IOS': 'Tool',
  'ANDROID': 'Tool',
  'OAUTH': 'Tool',
  'JWT': 'Tool',
  'SSL/TLS': 'Tool',
  'SIEM': 'Tool',
  
  // Domain
  'ETL': 'Domain',
  'DATA WAREHOUSING': 'Domain',
  'DATA PIPELINES': 'Domain',
  'DATA MODELING': 'Domain',
  'DATA ANALYTICS': 'Domain',
  'BUSINESS INTELLIGENCE': 'Domain',
  'AIRFLOW': 'Domain',
  'DBT': 'Domain',
  'KAFKA': 'Domain',
  'SPARK': 'Domain',
  'FLINK': 'Domain',
  'MACHINE LEARNING': 'Domain',
  'DEEP LEARNING': 'Domain',
  'NLP': 'Domain',
  'LLM': 'Domain',
  'COMPUTER VISION': 'Domain',
  'SCIKIT-LEARN': 'Domain',
  'PANDAS': 'Domain',
  'NUMPY': 'Domain',
  'TENSORFLOW': 'Domain',
  'PYTORCH': 'Domain',
  'KERAS': 'Domain',
  'XGBOOST': 'Domain',
  'LIGHTGBM': 'Domain',
  'MLFLOW': 'Domain',
  'KUBEFLOW': 'Domain',
  'PENETRATION TESTING': 'Domain',
  'OWASP': 'Domain',
  'ZERO TRUST': 'Domain',
  'PRODUCT STRATEGY': 'Domain',
  'ROADMAPPING': 'Domain',
  'USER RESEARCH': 'Domain',
  'A/B TESTING': 'Domain',
  'PRIORITIZATION': 'Domain',
  'GO-TO-MARKET': 'Domain',
  
  // Soft Skill
  'PROBLEM SOLVING': 'Soft Skill',
  'COMMUNICATION': 'Soft Skill',
  'STAKEHOLDER MANAGEMENT': 'Soft Skill',
  'BUSINESS REQUIREMENTS': 'Soft Skill',
  'PROJECT MANAGEMENT': 'Soft Skill',
  'AGILE': 'Soft Skill',
  'CRITICAL THINKING': 'Soft Skill',
  'LEADERSHIP': 'Soft Skill',
  'MENTORING': 'Soft Skill',
  'DECISION MAKING': 'Soft Skill',
};

export function getCanonicalSkill(rawSkill: string): string {
  const cleaned = rawSkill
    .trim()
    .toLowerCase()
    .replace(/[^\w\s\+\#\-\.]/g, '')
    .replace(/\s+/g, ' ');
  
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.includes(cleaned)) {
      return canonical;
    }
  }
  return cleaned.toUpperCase();
}

export function getSkillCategory(canonicalSkill: string): string {
  return SKILL_CATEGORY_MAP[canonicalSkill] || 'Technical';
}

export function normalizeSkillList(skills: string[]): Array<{ original: string; canonical: string; category: string }> {
  const seen = new Set<string>();
  const result: Array<{ original: string; canonical: string; category: string }> = [];
  
  for (const raw of skills) {
    if (!raw || typeof raw !== 'string') continue;
    const canonical = getCanonicalSkill(raw);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    result.push({
      original: raw.trim(),
      canonical,
      category: getSkillCategory(canonical),
    });
  }
  return result;
}