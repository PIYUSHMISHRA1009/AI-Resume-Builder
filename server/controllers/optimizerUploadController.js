import { extractTextFromFile, safeUnlink } from "../utils/documentParser.js";
import { parseResumeTextAndCreate } from "../services/resumeParserService.js";

export const uploadResumeDocument = async (req, res) => {
  const uploadedFilePath = req.file?.path || null;

  try {
    const userId = req.userId;
    const { title } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    let extractedText;
    try {
      extractedText = await extractTextFromFile(file.path, file.mimetype);
    } catch (extractError) {
      safeUnlink(uploadedFilePath);
      return res.status(400).json({ message: `Failed to extract text from file: ${extractError.message}` });
    } finally {
      safeUnlink(uploadedFilePath);
    }

    extractedText = extractedText == null ? "" : String(extractedText);

    if (!extractedText || !extractedText.trim()) {
      return res.status(400).json({ message: "Could not extract text from the uploaded file. Please ensure the file contains readable text." });
    }

    const newResume = await parseResumeTextAndCreate(extractedText, title || "Uploaded Resume", userId);

    return res.status(201).json({
      message: "Resume uploaded and parsed successfully",
      resume: newResume,
    });
  } catch (error) {
    safeUnlink(uploadedFilePath);
    console.error("uploadResumeDocument error:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const uploadJdDocument = async (req, res) => {
  const uploadedFilePath = req.file?.path || null;

  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    let extractedText;
    try {
      extractedText = await extractTextFromFile(file.path, file.mimetype);
    } catch (extractError) {
      safeUnlink(uploadedFilePath);
      return res.status(400).json({ message: `Failed to extract text from file: ${extractError.message}` });
    } finally {
      safeUnlink(uploadedFilePath);
    }

    extractedText = extractedText == null ? "" : String(extractedText);

    if (!extractedText || !extractedText.trim()) {
      return res.status(400).json({ message: "Could not extract text from the uploaded file. Please ensure the file contains readable text." });
    }

    return res.status(200).json({
      message: "JD document processed successfully",
      extractedText,
      filename: file.originalname,
    });
  } catch (error) {
    safeUnlink(uploadedFilePath);
    console.error("uploadJdDocument error:", error);
    return res.status(500).json({ message: error.message });
  }
};
