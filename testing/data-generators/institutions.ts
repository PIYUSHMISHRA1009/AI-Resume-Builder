// Institutions, companies, and date generators

export const UNIVERSITIES = [
  'Stanford University', 'Massachusetts Institute of Technology', 'University of California, Berkeley',
  'Carnegie Mellon University', 'Georgia Institute of Technology', 'University of Washington',
  'University of Texas at Austin', 'University of Michigan', 'Cornell University', 'Harvard University',
  'Princeton University', 'Yale University', 'Columbia University', 'New York University',
  'University of California, Los Angeles', 'University of Southern California', 'California Institute of Technology',
  'University of Illinois Urbana-Champaign', 'Purdue University', 'Texas A&M University',
  'Ohio State University', 'University of Maryland', 'Northeastern University', 'Drexel University',
  'Rochester Institute of Technology', 'University of Pennsylvania', 'Duke University',
  'Northwestern University', 'Johns Hopkins University', 'Brown University', 'Dartmouth College',
];

export const BOOTCAMPS = [
  'Fullstack Academy', 'Flatiron School', 'General Assembly', 'Hack Reactor', 'App Academy',
  'Lambda School (BloomTech)', 'Springboard', 'Thinkful', 'Codecademy Pro', 'CareerFoundry',
  'Ironhack', 'Le Wagon', 'BrainStation', 'Devmountain', 'Coding Dojo',
];

export const ONLINE_PLATFORMS = [
  'Coursera', 'edX', 'Udacity', 'Udemy', 'Pluralsight', 'DataCamp', 'freeCodeCamp',
  'Frontend Masters', 'Egghead.io', 'LinkedIn Learning', 'O\'Reilly', 'A Cloud Guru',
];

export const CERTIFICATIONS = [
  'AWS Certified Solutions Architect', 'AWS Certified Developer', 'AWS Certified SysOps Administrator',
  'Google Cloud Professional Cloud Architect', 'Google Cloud Professional Data Engineer',
  'Microsoft Azure Fundamentals (AZ-900)', 'Microsoft Azure Administrator (AZ-104)',
  'Certified Kubernetes Administrator (CKA)', 'Certified Kubernetes Application Developer (CKAD)',
  'Docker Certified Associate', 'HashiCorp Certified: Terraform Associate',
  'PMP', 'CSM', 'PSM I', 'SAFe Agilist',
  'CISSP', 'CEH', 'CompTIA Security+', 'CCNA', 'CCNP',
  'TensorFlow Developer Certificate', 'NVIDIA Deep Learning Institute Certificate',
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
  // Consulting
  'McKinsey & Company', 'Bain & Company', 'Boston Consulting Group', 'Deloitte', 'PwC', 'EY', 'KPMG', 'Accenture',
];

export const LOCATIONS = [
  'San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX', 'Boston, MA',
  'Los Angeles, CA', 'Chicago, IL', 'Denver, CO', 'Atlanta, GA', 'Remote',
  'London, UK', 'Toronto, Canada', 'Berlin, Germany', 'Singapore', 'Sydney, Australia',
  'Paris, France', 'Amsterdam, Netherlands', 'Tel Aviv, Israel', 'Bangalore, India', 'Tokyo, Japan',
];

export function randomDate(startYear: number, endYear: number): string {
  const year = Math.floor(Math.random() * (endYear - startYear + 1)) + startYear;
  const month = Math.floor(Math.random() * 12) + 1;
  return `${year}-${month.toString().padStart(2, '0')}`;
}

export function randomDateRange(startYear: number, endYear: number, minMonths: number = 6): { start: string; end: string; isCurrent: boolean } {
  const start = randomDate(startYear, endYear);
  const [startYearNum, startMonthNum] = start.split('-').map(Number);
  const startDate = new Date(startYearNum, startMonthNum - 1);
  
  const isCurrent = Math.random() < 0.3 && endYear === new Date().getFullYear();
  let end: string;
  
  if (isCurrent) {
    end = 'Present';
  } else {
    const minEndDate = new Date(startDate);
    minEndDate.setMonth(minEndDate.getMonth() + minMonths);
    const maxEndDate = new Date(endYear, 11, 31);
    const endTime = minEndDate.getTime() + Math.random() * (maxEndDate.getTime() - minEndDate.getTime());
    const endDate = new Date(endTime);
    end = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}`;
  }
  
  return { start, end, isCurrent };
}

export function randomGPA(): string {
  return (3.0 + Math.random() * 1.0).toFixed(2);
}

export function randomPhone(): string {
  return `555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
}

export function randomLinkedIn(name: string): string {
  const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
  return `linkedin.com/in/${cleanName}${Math.floor(Math.random() * 1000)}`;
}

export function randomGitHub(name: string): string {
  const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
  return `github.com/${cleanName}${Math.floor(Math.random() * 1000)}`;
}

export function randomWebsite(name: string): string {
  const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
  const domains = ['.com', '.dev', '.io', '.app', '.tech', '.xyz'];
  return `${cleanName}${domains[Math.floor(Math.random() * domains.length)]}`;
}