import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import mammoth from "mammoth";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_RESUME_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_JD_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ensureTmpDir = () => {
  const tmpDir = path.join(__dirname, "../../data/tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  return tmpDir;
};

const safeUnlink = (filePath) => {
  if (!filePath) return;
  try {
    fs.unlinkSync(filePath);
  } catch (_err) {
    // ignore cleanup errors
  }
};

export const extractTextFromPdf = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ verbosity: 0, data: buffer });
  try {
    await parser.load();
    const result = await parser.getText();
    return result.text || "";
  } finally {
    await parser.destroy();
  }
};

export const extractTextFromDocx = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value || "";
};

export const extractTextFromFile = async (filePath, mimetype) => {
  if (mimetype === "application/pdf") {
    return extractTextFromPdf(filePath);
  }
  if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return extractTextFromDocx(filePath);
  }
  if (mimetype === "text/plain") {
    return fs.readFileSync(filePath, "utf-8");
  }
  throw new Error(`Unsupported file type: ${mimetype}`);
};

export { ALLOWED_RESUME_MIME, ALLOWED_JD_MIME, MAX_FILE_SIZE, ensureTmpDir, safeUnlink };
