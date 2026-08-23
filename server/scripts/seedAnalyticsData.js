import mongoose from "mongoose";
import "dotenv/config";
import connectDB from "../configs/db.js";
import User from "../models/User.js";
import Resume from "../models/Resume.js";
import JobDescription from "../models/JobDescription.js";
import ResumeVersion from "../models/ResumeVersion.js";
import MatchRecord from "../models/MatchRecord.js";
import { calculateCandidateJDMatch } from "../services/matchingService.js";
import { syncDataToSQLite } from "../services/analyticsSyncService.js";

const SEED_JDS = [
  {
    _id: new mongoose.Types.ObjectId(),
    title: "Business Technology Solutions Associate (BTSA)",
    company: "ZS Associates",
    category: "Business Technology",
    rawText: `ZS is a management consulting and technology firm. We are looking for a BTSA to solve complex business problems using SQL, Python, PostgreSQL, Data Warehousing, and Power BI. Experience with ETL data pipelines and stakeholder management is preferred. Bachelor degree required.`,
    extractedRequirements: {
      technicalSkills: ["SQL", "PYTHON", "POSTGRESQL", "DATA WAREHOUSING"],
      tools: ["POWER BI", "EXCEL"],
      domainSkills: ["ETL", "DATA ANALYTICS"],
      softSkills: ["STAKEHOLDER MANAGEMENT", "PROBLEM SOLVING", "COMMUNICATION"],
      experienceYears: 2,
      educationLevel: "Bachelor",
    },
  },
  {
    _id: new mongoose.Types.ObjectId(),
    title: "Senior Data Analyst",
    company: "McKinsey Analytics",
    category: "Data Analytics",
    rawText: `Seeking a Senior Data Analyst proficient in Python, SQL, Tableau, Snowflake, and Machine Learning. Must have strong experience in data modeling and business requirements gathering.`,
    extractedRequirements: {
      technicalSkills: ["PYTHON", "SQL", "SNOWFLAKE", "MACHINE LEARNING"],
      tools: ["TABLEAU", "LOOKER"],
      domainSkills: ["DATA MODELING", "ETL"],
      softSkills: ["BUSINESS REQUIREMENTS", "CRITICAL THINKING"],
      experienceYears: 3,
      educationLevel: "Bachelor",
    },
  },
  {
    _id: new mongoose.Types.ObjectId(),
    title: "Technology Consultant",
    company: "Deloitte",
    category: "Technology Consulting",
    rawText: `Deloitte Consulting is hiring Technology Consultants skilled in AWS, Microservices, MongoDB, Agile, and Business Intelligence solutions.`,
    extractedRequirements: {
      technicalSkills: ["MONGODB", "JAVA", "PYTHON"],
      tools: ["AWS", "DOCKER", "GIT"],
      domainSkills: ["BUSINESS INTELLIGENCE", "DATA PIPELINES"],
      softSkills: ["AGILE", "PROJECT MANAGEMENT", "COMMUNICATION"],
      experienceYears: 2,
      educationLevel: "Bachelor",
    },
  },
  {
    _id: new mongoose.Types.ObjectId(),
    title: "Software Engineer — Backend Analytics",
    company: "Amazon",
    category: "Software Engineering",
    rawText: `Amazon Web Services is seeking a Backend Engineer with strong proficiency in Java, Node.js, PostgreSQL, Docker, AWS, and REST API design.`,
    extractedRequirements: {
      technicalSkills: ["JAVA", "JAVASCRIPT", "POSTGRESQL", "C++"],
      tools: ["AWS", "DOCKER", "KUBERNETES", "GIT"],
      domainSkills: ["ETL", "DATA PIPELINES"],
      softSkills: ["PROBLEM SOLVING"],
      experienceYears: 3,
      educationLevel: "Bachelor",
    },
  },
];

export const seedAnalyticsData = async () => {
  console.log("Seeding Analytics Data to SQLite OLAP Read-Model...");

  const userId = new mongoose.Types.ObjectId();
  const resumeId = new mongoose.Types.ObjectId();

  const user = { _id: userId, name: "Demo Candidate", email: "demo@zs.com" };
  const resumeData = {
    _id: resumeId,
    userId,
    title: "Analytics Consultant Resume",
    professional_summary: "Results-driven Business Technology Associate with 3+ years experience leveraging SQL, Python, PostgreSQL, and Power BI to build data analytics solutions.",
    skills: ["SQL", "Python", "PostgreSQL", "Power BI", "Excel", "ETL", "Problem Solving", "Communication"],
    experience: [
      {
        company: "Data Corp",
        position: "Data Analyst",
        description: "Optimized PostgreSQL database queries, reducing report latency by 40%\nDesigned Power BI executive dashboards for 15+ stakeholders\nBuilt ETL data pipelines in Python handling 50k daily records",
        is_current: true,
      },
    ],
    project: [
      {
        name: "Sentinel Analytics Platform",
        type: "Data Analytics",
        description: "Developed PostgreSQL analytical read-model with window functions and CTEs to rank candidate skill gaps with 95% accuracy.",
      },
    ],
    education: [
      { degree: "Bachelor of Science", field: "Computer Science", institution: "Tech University" }
    ],
  };

  const ver1 = {
    _id: new mongoose.Types.ObjectId(),
    resumeId,
    userId,
    versionNumber: 1,
    versionTitle: "Resume v1 — General Tech",
    structuredData: resumeData,
  };

  const ver2 = {
    _id: new mongoose.Types.ObjectId(),
    resumeId,
    userId,
    versionNumber: 2,
    versionTitle: "Resume v2 — Added Data Warehousing & Snowflake",
    structuredData: { ...resumeData, skills: [...resumeData.skills, "Data Warehousing", "Snowflake"] },
  };

  const ver3 = {
    _id: new mongoose.Types.ObjectId(),
    resumeId,
    userId,
    versionNumber: 3,
    versionTitle: "Resume v3 — ZS BTSA Targeted",
    structuredData: { ...resumeData, skills: [...resumeData.skills, "Data Warehousing", "Snowflake", "Stakeholder Management", "Machine Learning"] },
  };

  const createdMatches = [];

  for (const jd of SEED_JDS) {
    const matchV1 = calculateCandidateJDMatch(ver1.structuredData, jd);
    const matchV2 = calculateCandidateJDMatch(ver2.structuredData, jd);
    const matchV3 = calculateCandidateJDMatch(ver3.structuredData, jd);

    createdMatches.push(
      { _id: new mongoose.Types.ObjectId(), userId, resumeId, versionId: ver1._id, jobId: jd._id, jobTitle: jd.title, ...matchV1 },
      { _id: new mongoose.Types.ObjectId(), userId, resumeId, versionId: ver2._id, jobId: jd._id, jobTitle: jd.title, ...matchV2 },
      { _id: new mongoose.Types.ObjectId(), userId, resumeId, versionId: ver3._id, jobId: jd._id, jobTitle: jd.title, ...matchV3 }
    );
  }

  // Populate SQLite OLAP store
  await syncDataToSQLite({
    users: [user],
    jds: SEED_JDS,
    versions: [ver1, ver2, ver3],
    matches: createdMatches,
  });

  // Try MongoDB connection if available
  try {
    await connectDB();
    await User.findOneAndUpdate({ email: user.email }, user, { upsert: true });
    await Resume.findOneAndUpdate({ _id: resumeId }, resumeData, { upsert: true });
    for (const jd of SEED_JDS) {
      await JobDescription.findOneAndUpdate({ _id: jd._id }, jd, { upsert: true });
    }
    console.log("✓ Also synced with MongoDB!");
  } catch (err) {
    console.log("ℹ️ MongoDB skipped (offline mode) — SQLite OLAP read-model fully populated.");
  }

  console.log("✓ Seed Analytics Data successfully populated!");
  process.exit(0);
};

if (process.argv[1].includes("seedAnalyticsData.js")) {
  seedAnalyticsData();
}
