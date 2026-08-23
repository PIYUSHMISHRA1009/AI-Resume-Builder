/**
 * One-off backfill script: index all existing resumes into the RAG vector store.
 *
 * Usage:
 *   node server/scripts/indexAllResumes.js
 *
 * For each Resume document in the database, extracts text bullets (skills,
 * experience descriptions, projects, professional summary), embeds them via
 * the configured embedding model, and stores them as Bullet documents.
 */
import mongoose from "mongoose";
import connectDB from "../configs/db.js";
import Resume from "../models/Resume.js";
import { indexResumeBullets } from "../services/ragService.js";

const run = async () => {
  await connectDB();

  const resumes = await Resume.find({}).lean();
  console.log(`Found ${resumes.length} resumes to index.\n`);

  let totalBullets = 0;
  let errors = 0;

  for (const resume of resumes) {
    try {
      const created = await indexResumeBullets(resume._id, resume.userId);
      totalBullets += created.length;
      const sources = Array.from(new Set(created.map((c) => c.source)));
      console.log(`  ✓  Resume "${resume.title}" → ${created.length} bullets [${sources.join(", ")}]`);
    } catch (err) {
      errors++;
      console.error(`  ✗  Resume "${resume.title}" → ${err.message}`);
    }
  }

  console.log(`\nDone: ${totalBullets} bullets indexed across ${resumes.length - errors}/${resumes.length} resumes.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
