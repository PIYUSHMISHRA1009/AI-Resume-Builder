import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../configs/api";
import { toast } from "react-hot-toast";
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Brain,
  Sparkles,
  Loader2,
  ArrowLeft,
  RefreshCw,
  FileText,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Upload,
  X,
} from "lucide-react";
import ClassicTemplate from "../assets/templates/ClassicTemplate";
import ModernTemplate from "../assets/templates/ModernTemplate";
import MinimalTemplate from "../assets/templates/MinimalTemplate";
import MinimalImageTemplate from "../assets/templates/MinimalImageTemplate";

const EMPTY_RESUME = {
  _id: "",
  title: "",
  personal_info: {},
  professional_summary: "",
  experience: [],
  education: [],
  project: [],
  skills: [],
  template: "classic",
  accent_color: "#3B82F6",
};

export default function ResumeOptimizer() {
  const navigate = useNavigate();
  const location = useLocation();

  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("");
  const [jdText, setJdText] = useState("");
  const [jobId, setJobId] = useState("");

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [reEvaluating, setReEvaluating] = useState(false);

  const [analysisResult, setAnalysisResult] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [optimizedResume, setOptimizedResume] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [matchBefore, setMatchBefore] = useState(null);
  const [matchAfter, setMatchAfter] = useState(null);
  const [appliedRecIds, setAppliedRecIds] = useState(new Set());
  const [expandedRecId, setExpandedRecId] = useState(null);
  const [aiError, setAiError] = useState("");
  const [aiAttempted, setAiAttempted] = useState(false);

  const [resumeInputMode, setResumeInputMode] = useState("select");
  const [jdInputMode, setJdInputMode] = useState("paste");
  const [resumeUploadFile, setResumeUploadFile] = useState(null);
  const [jdUploadFile, setJdUploadFile] = useState(null);
  const [resumeUploadLoading, setResumeUploadLoading] = useState(false);
  const [jdUploadLoading, setJdUploadLoading] = useState(false);
  const [resumeUploadError, setResumeUploadError] = useState("");
  const [jdUploadError, setJdUploadError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data } = await api.get("/api/users/resumes");
        const loadedResumes = data.resumes || [];
        setResumes(loadedResumes);

        if (loadedResumes.length > 0) {
          setSelectedResumeId(loadedResumes[0]._id);
        }

        if (location.state?.resumeId) {
          setSelectedResumeId(location.state.resumeId);
        }
        if (location.state?.jobTitle) setJobTitle(location.state.jobTitle);
        if (location.state?.company) setCompany(location.state.company);
        if (location.state?.category) setCategory(location.state.category);
        if (location.state?.jdText) setJdText(location.state.jdText);
        if (location.state?.jobId) setJobId(location.state.jobId);
      } catch (err) {
        toast.error("Failed to load resumes");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [location.state]);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!selectedResumeId) {
      toast.error("Please select or upload a resume");
      return;
    }
    if (!jdText.trim()) {
      toast.error("Please provide a Job Description");
      return;
    }

    setAnalyzing(true);
    try {
      let currentJobId = jobId;

      if (!currentJobId) {
        const jdRes = await api.post(
          "/api/analytics/jd/parse",
          { title: jobTitle || "Target Role", company, category, rawText: jdText }
        );
        currentJobId = jdRes.data.jd._id;
        setJobId(currentJobId);
      }

      const matchRes = await api.post(
        "/api/analytics/match",
        { resumeId: selectedResumeId, jobId: currentJobId }
      );

      setAnalysisResult(matchRes.data);
      setMatchBefore({
        score: matchRes.data.matchRecord.overallScore,
        breakdown: matchRes.data.matchRecord.breakdownScores,
      });
      toast.success("Analysis complete!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGetRecommendations = async () => {
    if (!analysisResult) return;

    setOptimizing(true);
    setAiError("");
    setAiAttempted(true);
    try {
      const optRes = await api.post(
        "/api/analytics/optimize",
        { resumeId: selectedResumeId, jobId: jobId }
      );

      setRecommendations(optRes.data.recommendations || []);
      setOptimizedResume(optRes.data.optimizedResume || null);
      toast.success("Recommendations generated!");
    } catch (err) {
      const status = err.response?.status;
      let message = err.response?.data?.message || "Failed to generate recommendations";

      if (status === 429) {
        message = "AI recommendations are temporarily unavailable due to provider rate limits. Please try again shortly.";
      } else if (status === 503) {
        message = "AI recommendations are temporarily unavailable. Please try again shortly.";
      } else if (status === 504) {
        message = "AI recommendation request timed out. Please try again.";
      } else if (status === 500) {
        message = "AI recommendations could not be generated. Please try again.";
      }

      setAiError(message);
      toast.error(message);
    } finally {
      setOptimizing(false);
    }
  };

  const handleApplyRecommendation = (rec) => {
    if (!optimizedResume) return;

    const updated = structuredClone(optimizedResume);
    const section = rec.section;
    const index = rec.index;
    const field = rec.field;

    if (section === "summary" && field === "professional_summary") {
      updated.professional_summary = rec.suggestedText;
    } else if (section === "skills") {
      if (Array.isArray(updated.skills) && index < updated.skills.length) {
        updated.skills[index] = rec.suggestedText;
      }
    } else if (section === "experience" && Array.isArray(updated.experience)) {
      if (index < updated.experience.length) {
        updated.experience[index] = {
          ...updated.experience[index],
          [field]: rec.suggestedText,
        };
      }
    } else if (section === "project" && Array.isArray(updated.project)) {
      if (index < updated.project.length) {
        updated.project[index] = {
          ...updated.project[index],
          [field]: rec.suggestedText,
        };
      }
    } else if (section === "education" && Array.isArray(updated.education)) {
      if (index < updated.education.length) {
        updated.education[index] = {
          ...updated.education[index],
          [field]: rec.suggestedText,
        };
      }
    }

    setOptimizedResume(updated);
    setAppliedRecIds((prev) => new Set(prev).add(rec.id));
    toast.success("Recommendation applied");
  };

  const handleSaveAndReevaluate = async () => {
    if (!optimizedResume || !selectedResumeId) return;

    setReEvaluating(true);
    try {
      const formData = new FormData();
      formData.append("resumeId", selectedResumeId);
      formData.append("resumeData", JSON.stringify(optimizedResume));

      await api.put("/api/resumes/update", formData);

      const matchRes = await api.post(
        "/api/analytics/match",
        { resumeId: selectedResumeId, jobId: jobId }
      );

      setMatchAfter({
        score: matchRes.data.matchRecord.overallScore,
        breakdown: matchRes.data.matchRecord.breakdownScores,
      });
      toast.success("Resume optimized and re-evaluated!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Re-evaluation failed");
    } finally {
      setReEvaluating(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setRecommendations([]);
    setOptimizedResume(null);
    setMatchBefore(null);
    setMatchAfter(null);
    setAppliedRecIds(new Set());
    setExpandedRecId(null);
    setAiError("");
    setAiAttempted(false);
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeUploadError("");
    setResumeUploadLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post("/api/optimizer/upload-resume-document", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResumeUploadFile({ name: file.name, size: file.size, type: file.type });
      setSelectedResumeId(data.resume._id);
      setResumes((prev) => [...prev, data.resume]);
      toast.success("Resume uploaded and parsed successfully");
    } catch (err) {
      setResumeUploadError(err.response?.data?.message || "Upload failed");
    } finally {
      setResumeUploadLoading(false);
    }
  };

  const handleJdUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setJdUploadError("");
    setJdUploadLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post("/api/optimizer/upload-jd-document", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setJdUploadFile({ name: file.name, size: file.size, type: file.type });
      setJdText(data.extractedText);
      toast.success("JD document processed successfully");
    } catch (err) {
      setJdUploadError(err.response?.data?.message || "Upload failed");
    } finally {
      setJdUploadLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const improvement =
    matchBefore && matchAfter ? matchAfter.score - matchBefore.score : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Resume ↔ JD Optimizer
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Optimize your resume for a specific job description using evidence from your existing experience.
            </p>
          </div>
          <button
            onClick={() => navigate("/app/analytics")}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Career Analytics
          </button>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Resume & Job Description</h2>
              <p className="text-sm text-slate-500">
                Select or upload your resume, then provide the target job description.
              </p>
            </div>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-6">
            {/* Resume Section */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600 uppercase">Resume</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setResumeInputMode("select")}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                    resumeInputMode === "select"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Select Existing Resume
                </button>
                <button
                  type="button"
                  onClick={() => setResumeInputMode("upload")}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                    resumeInputMode === "upload"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Upload Resume
                </button>
              </div>

              {resumeInputMode === "select" && (
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="" disabled>Select a resume</option>
                  {resumes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              )}

              {resumeInputMode === "upload" && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 transition">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-600">
                      Click to upload resume (PDF or DOCX, max 10MB)
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={handleResumeUpload}
                      disabled={resumeUploadLoading}
                    />
                  </label>
                  {resumeUploadLoading && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing resume...
                    </div>
                  )}
                  {resumeUploadError && (
                    <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">
                      {resumeUploadError}
                    </div>
                  )}
                  {resumeUploadFile && (
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        <FileText className="w-4 h-4" />
                        {resumeUploadFile.name}
                        <span className="text-slate-400">
                          ({(resumeUploadFile.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setResumeUploadFile(null);
                          setSelectedResumeId("");
                        }}
                        className="text-slate-400 hover:text-slate-600 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* JD Section */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600 uppercase">Job Description</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setJdInputMode("paste")}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                    jdInputMode === "paste"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Paste JD
                </button>
                <button
                  type="button"
                  onClick={() => setJdInputMode("upload")}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                    jdInputMode === "upload"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Upload JD
                </button>
              </div>

              {jdInputMode === "paste" && (
                <textarea
                  rows={6}
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  placeholder="Paste the complete job description here..."
                />
              )}

              {jdInputMode === "upload" && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 transition">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-600">
                      Click to upload JD (PDF, DOCX, or TXT, max 10MB)
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      className="hidden"
                      onChange={handleJdUpload}
                      disabled={jdUploadLoading}
                    />
                  </label>
                  {jdUploadLoading && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Extracting text...
                    </div>
                  )}
                  {jdUploadError && (
                    <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">
                      {jdUploadError}
                    </div>
                  )}
                  {jdUploadFile && (
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        <FileText className="w-4 h-4" />
                        {jdUploadFile.name}
                        <span className="text-slate-400">
                          ({(jdUploadFile.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setJdUploadFile(null);
                          setJdText("");
                        }}
                        className="text-slate-400 hover:text-slate-600 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {jdText && (
                    <textarea
                      rows={6}
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                      placeholder="Extracted JD text will appear here. You can edit it before analysis."
                    />
                  )}
                </div>
              )}
            </div>

            {/* Job Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Software Engineer"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Google"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Job Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="" disabled>Select a category</option>
                <option value="Business Technology">Business Technology</option>
                <option value="Data Analytics">Data Analytics</option>
                <option value="Technology Consulting">Technology Consulting</option>
                <option value="Software Engineering">Software Engineering</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={analyzing}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-6 py-3 rounded-lg transition disabled:opacity-50"
            >
              {analyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Target className="w-4 h-4" />
              )}
              {analyzing ? "Analyzing..." : "Analyze Resume Match"}
            </button>
          </form>
        </div>

        {/* Analysis Results */}
        {analysisResult && (
          <div className="space-y-6">
            {/* Match Score */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <span className="text-xs uppercase font-semibold text-blue-500 tracking-wider">
                    Resume–JD Match Score
                  </span>
                  <div className="text-5xl font-extrabold text-slate-900 mt-2">
                    {analysisResult.matchRecord.overallScore}%
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Evaluated across {analysisResult.matchRecord.matchedSkillsCount} matched skills and{" "}
                    {analysisResult.matchRecord.missingSkillsCount} missing gaps.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center w-full md:w-auto">
                  {[
                    { label: "Skills", value: analysisResult.matchRecord.breakdownScores.technicalScore, color: "text-blue-300" },
                    { label: "Soft Skills", value: analysisResult.matchRecord.breakdownScores.softSkillScore, color: "text-emerald-300" },
                    { label: "Experience", value: analysisResult.matchRecord.breakdownScores.experienceScore, color: "text-purple-300" },
                    { label: "Projects", value: analysisResult.matchRecord.breakdownScores.projectScore, color: "text-amber-300" },
                    { label: "Education", value: analysisResult.matchRecord.breakdownScores.educationScore, color: "text-pink-300" },
                  ].map((item) => (
                    <div key={item.label} className="bg-slate-800 p-3 rounded-lg">
                      <div className="text-xs text-slate-400">{item.label}</div>
                      <div className={`text-lg font-bold ${item.color}`}>{item.value}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Explanation */}
            {analysisResult.aiExplanation && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-center gap-2 text-blue-800 font-semibold mb-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  AI Evaluation
                </div>
                <div className="text-sm text-blue-950 whitespace-pre-line leading-relaxed">
                  {analysisResult.aiExplanation}
                </div>
              </div>
            )}

            {/* Skill Evidence Table */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-base font-bold text-slate-800 mb-4">Skill Evidence & Strength</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-3">Skill</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Evidence Strength</th>
                      <th className="p-3">Evidence Quote</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analysisResult.matchRecord.skillEvidences.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-900">{item.skill}</td>
                        <td className="p-3 text-slate-500">{item.category}</td>
                        <td className="p-3">
                          {item.status === "MATCHED" && (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> MATCHED
                            </span>
                          )}
                          {item.status === "PARTIAL" && (
                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" /> PARTIAL
                            </span>
                          )}
                          {item.status === "MISSING" && (
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-medium">
                              <XCircle className="w-3.5 h-3.5" /> MISSING
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`font-semibold ${
                              item.evidenceStrength === "Strong"
                                ? "text-emerald-600"
                                : item.evidenceStrength === "Moderate"
                                ? "text-blue-600"
                                : item.evidenceStrength === "Weak"
                                ? "text-amber-600"
                                : "text-slate-400"
                            }`}
                          >
                            {item.evidenceStrength}
                          </span>
                        </td>
                        <td className="p-3 italic text-slate-600 max-w-md truncate">
                          {item.evidenceQuote ? `"${item.evidenceQuote}"` : <span className="text-slate-400 font-normal">None found</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Error Banner */}
            {aiError && analysisResult && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-rose-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-rose-800 font-medium">{aiError}</p>
                  <button
                    onClick={handleGetRecommendations}
                    disabled={optimizing}
                    className="mt-2 text-xs bg-rose-100 hover:bg-rose-200 text-rose-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    {optimizing ? "Retrying..." : "Retry"}
                  </button>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && !aiError && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-800">AI Recommendations</h3>
                </div>
                <div className="space-y-4">
                  {recommendations.map((rec) => {
                    const isExpanded = expandedRecId === rec.id;
                    const isApplied = appliedRecIds.has(rec.id);
                    return (
                      <div
                        key={rec.id}
                        className={`border rounded-xl p-4 transition ${
                          isApplied ? "bg-emerald-50 border-emerald-200" : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  rec.priority === "high"
                                    ? "bg-rose-100 text-rose-700"
                                    : rec.priority === "medium"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {rec.priority || "medium"} priority
                              </span>
                              <span className="text-xs text-slate-500 capitalize">
                                {rec.section}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800">{rec.what}</h4>
                            <p className="text-xs text-slate-500 mt-1">{rec.why}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isApplied ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Applied
                              </span>
                            ) : (
                              <button
                                onClick={() => handleApplyRecommendation(rec)}
                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition"
                              >
                                Apply
                              </button>
                            )}
                            <button
                              onClick={() =>
                                setExpandedRecId(isExpanded ? null : rec.id)
                              }
                              className="p-1.5 text-slate-400 hover:text-slate-600 transition"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                            <div>
                              <span className="text-xs font-semibold text-slate-600 uppercase">Where</span>
                              <p className="text-sm text-slate-700 mt-1">{rec.where}</p>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-slate-600 uppercase">Suggested Change</span>
                              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                  <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">Current</span>
                                  <p className="text-sm text-slate-700 italic">"{rec.currentText}"</p>
                                </div>
                                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                                  <span className="text-xs font-semibold text-emerald-600 uppercase block mb-1">Suggested</span>
                                  <p className="text-sm text-emerald-900 font-medium">"{rec.suggestedText}"</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Optimized Resume Preview */}
            {optimizedResume && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Optimized Resume Preview</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Review and select a template for the optimized version.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="classic">Classic</option>
                      <option value="modern">Modern</option>
                      <option value="minimal">Minimal</option>
                      <option value="minimal-image">Minimal Image</option>
                    </select>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 overflow-x-auto">
                  <div className="max-w-3xl mx-auto bg-white border border-gray-200" style={{ minHeight: "600px" }}>
                    {selectedTemplate === "modern" && <ModernTemplate data={optimizedResume} accentColor={optimizedResume.accent_color} />}
                    {selectedTemplate === "minimal" && <MinimalTemplate data={optimizedResume} accentColor={optimizedResume.accent_color} />}
                    {selectedTemplate === "minimal-image" && <MinimalImageTemplate data={optimizedResume} accentColor={optimizedResume.accent_color} />}
                    {selectedTemplate === "classic" && <ClassicTemplate data={optimizedResume} accentColor={optimizedResume.accent_color} />}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleSaveAndReevaluate}
                    disabled={reEvaluating}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition disabled:opacity-50"
                  >
                    {reEvaluating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {reEvaluating ? "Re-evaluating..." : "Save & Re-evaluate"}
                  </button>
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm px-5 py-2.5 rounded-lg transition"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}

            {/* Before / After */}
            {matchBefore && matchAfter && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-base font-bold text-slate-800 mb-4">Optimization Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                    <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Before</div>
                    <div className="text-3xl font-extrabold text-slate-900">{matchBefore.score}%</div>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center">
                    <div className="text-xs text-emerald-600 uppercase font-semibold mb-1">After</div>
                    <div className="text-3xl font-extrabold text-emerald-700">{matchAfter.score}%</div>
                    <div className="text-xs text-emerald-600 font-medium mt-1">
                      +{improvement} points
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                    <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Recommendations Applied</div>
                    <div className="text-3xl font-extrabold text-slate-900">{appliedRecIds.size}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Get Recommendations CTA */}
            {analysisResult && recommendations.length === 0 && !optimizedResume && !aiError && (
              <>
                {!aiAttempted ? (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Lightbulb className="w-6 h-6 text-amber-500" />
                      <h3 className="text-lg font-bold text-slate-800">AI Recommendations</h3>
                    </div>
                    <p className="text-sm text-slate-500 mb-4 max-w-xl mx-auto">
                      Get evidence-based suggestions to improve your resume alignment with this JD.
                    </p>
                    <button
                      onClick={handleGetRecommendations}
                      disabled={optimizing}
                      className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm px-6 py-3 rounded-lg transition disabled:opacity-50"
                    >
                      {optimizing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {optimizing ? "Generating..." : "Get AI Recommendations"}
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      <h3 className="text-lg font-bold text-slate-800">No Major Improvements Identified</h3>
                    </div>
                    <p className="text-sm text-slate-500 mb-4 max-w-xl mx-auto">
                      No major resume improvements were identified for this JD. Your resume already aligns well with the target role.
                    </p>
                    <button
                      onClick={handleGetRecommendations}
                      disabled={optimizing}
                      className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm px-5 py-2.5 rounded-lg transition disabled:opacity-50"
                    >
                      {optimizing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {optimizing ? "Re-analyzing..." : "Re-analyze"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Empty State */}
        {!analysisResult && !analyzing && (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-200 text-center">
            <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Ready to optimize your resume?
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Select or upload your resume, then paste or upload a job description to analyze alignment, identify gaps, and get AI-powered recommendations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
