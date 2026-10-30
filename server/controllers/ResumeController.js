import Resume from "../models/Resume.js";
import imagekit from "../configs/imageKit.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const safeUnlink = (filePath) => {
  if (!filePath) return;
  try {
    fs.unlinkSync(filePath);
  } catch (_err) {
    // ignore cleanup errors
  }
};

const TMP_DIR = path.join(__dirname, "../../data/tmp");

const ensureTmpDir = () => {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
};

//Controller for creating a new Resume
//POST: /api/resumes/create
export const createResume = async (req, res) => {
    try {
        const userId = req.userId;
        const { title } = req.body;

        const newResume = await Resume.create({ userId, title });

        return res.status(201).json({ message: "Resume Created Successfully", resume: newResume });

    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

//controller for deleting the Resume
//DELETE:/api/resumes/delete/:resumeId
export const deleteResume = async (req, res) => {
    try {
        const userId = req.userId;
        const { resumeId } = req.params;

        await Resume.findOneAndDelete({ userId, _id: resumeId });

        return res.status(200).json({ message: 'Resume deleted successfully' });

    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

//get user resume by id
//GET:/api/resumes/get/:resumeId
export const getResumeById = async (req, res) => {
    try {
        const userId = req.userId;
        const { resumeId } = req.params;

        const resume = await Resume.findOne({ userId, _id: resumeId });

        if (!resume) {
            return res.status(404).json({ message: "Resume not found" });
        }

        resume.__v = undefined;
        resume.createdAt = undefined;
        resume.updatedAt = undefined;

        return res.status(200).json({ resume });

    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

//get Resume by id public
//GET: /api/resumes/public/:resumeId
export const getPublicResumeId = async (req, res) => {
    try {
        const { resumeId } = req.params;

        const resume = await Resume.findOne({ public: true, _id: resumeId });

        if (!resume) {
            return res.status(404).json({ message: "Resume not found" });
        }

        return res.status(200).json({ resume });

    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

//controller for updating a resume
//PUT: /api/resumes/update
export const updateResume = async (req, res) => {
    ensureTmpDir();
    const uploadedFilePath = req.file?.path || null;

    try {
        const userId = req.userId;
        const { resumeId, resumeData, removeBackground } = req.body;
        const image = req.file;

        let resumeDataCopy;
        if(typeof resumeData==='string'){
            resumeDataCopy=await JSON.parse(resumeData)
        }
        else{
            resumeDataCopy=structuredClone(resumeData)
        }

        if (!resumeDataCopy || typeof resumeDataCopy !== "object" || Array.isArray(resumeDataCopy)) {
            return res.status(400).json({ message: "resumeData is required" });
        }

        // Ownership comes from the authenticated request and is immutable via resume edits.
        delete resumeDataCopy.userId;

        if (image) {
            try {
                const imageBufferData = fs.createReadStream(image.path);

                const response = await imagekit.files.upload({
                    file: imageBufferData,
                    fileName: 'resume.png',
                    folder: 'user-resumes',
                    transformation: {
                        pre: 'w-300,h-300,fo-face,z-0.75' +
                            (removeBackground ? ',e-bgremove' : '')
                    }
                });

                resumeDataCopy.personal_info = resumeDataCopy.personal_info || {};
                resumeDataCopy.personal_info.image = response.url;
            } catch (imageError) {
                console.error("ImageKit upload failed:", imageError.message);
                return res.status(400).json({ message: `Image upload failed: ${imageError.message}` });
            } finally {
                safeUnlink(uploadedFilePath);
            }
        }

        const resume = await Resume.findOneAndUpdate(
             { userId, _id: resumeId },
                { $set: resumeDataCopy },
                { returnDocument:'after' }
        );

        return res.status(200).json({ message: 'Saved Successfully', resume });

    } catch (error) {
        safeUnlink(uploadedFilePath);
        console.error("Resume update error:", error);
        return res.status(error instanceof multer.MulterError ? 400 : 500).json({ message: error.message });
    }
};
