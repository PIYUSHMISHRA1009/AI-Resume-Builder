import multer from "multer";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import { ALLOWED_RESUME_MIME, ALLOWED_JD_MIME, MAX_FILE_SIZE } from "../utils/documentParser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const tmpDir = path.join(__dirname, "../../data/tmp");
    fs.mkdir(tmpDir, { recursive: true }, (error) => cb(error, tmpDir));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `upload-${Date.now()}${ext}`);
  },
});

const fileFilter = (allowedMimes) => (_req, file, cb) => {
  if (!allowedMimes.has(file.mimetype)) {
    return cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        `Unsupported file type: ${file.mimetype}. Only PDF and DOCX are allowed.`
      ),
      false
    );
  }
  cb(null, true);
};

export const uploadResumeDocument = multer({
  storage,
  fileFilter: fileFilter(ALLOWED_RESUME_MIME),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

export const uploadJdDocument = multer({
  storage,
  fileFilter: fileFilter(ALLOWED_JD_MIME),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});
