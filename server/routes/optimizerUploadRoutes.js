import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { uploadResumeDocument, uploadJdDocument } from "../controllers/optimizerUploadController.js";
import { uploadResumeDocument as multerResume, uploadJdDocument as multerJd } from "../configs/multerDocument.js";

const optimizerUploadRouter = express.Router();

optimizerUploadRouter.post("/upload-resume-document", protect, multerResume.single("file"), uploadResumeDocument);
optimizerUploadRouter.post("/upload-jd-document", protect, multerJd.single("file"), uploadJdDocument);

export default optimizerUploadRouter;
