import React, { useState } from "react";
import api from "../configs/api";
import { toast } from "react-hot-toast";
import { Target, CheckCircle2, AlertTriangle, XCircle, Brain, Sparkles, Loader2 } from "lucide-react";

export default function JDMatchTool({ resumes = [], onMatchComplete }) {
  const [selectedResumeId, setSelectedResumeId] = useState(resumes[0]?._id || "");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("");
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [matchData, setMatchData] = useState(null);

  const handleRunMatch = async (e) => {
    e.preventDefault();
    if (!selectedResumeId) {
      toast.error("Please select a resume first");
      return;
    }
    if (!jdText.trim()) {
      toast.error("Please provide a Job Description");
      return;
    }

    setLoading(true);
    try {
      // 1. Parse and save Job Description
      const jdRes = await api.post("/api/analytics/jd/parse", {
        title: jobTitle,
        company,
        category,
        rawText: jdText,
      });

      const jobId = jdRes.data.jd._id;

      // 2. Evaluate Match
      const matchRes = await api.post("/api/analytics/match", {
        resumeId: selectedResumeId,
        jobId,
      });

      setMatchData(matchRes.data);
      toast.success("Candidate-JD Match Score calculated!");
      if (onMatchComplete) onMatchComplete(matchRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to calculate match score");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
          <Target className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Job Description Alignment & Matching</h2>
          <p className="text-sm text-slate-500">
            Extract JD requirements, calculate deterministic match scores, and extract supporting resume evidence.
          </p>
        </div>
      </div>

      <form onSubmit={handleRunMatch} className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Target Resume</label>
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {resumes.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Target Role Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g. Software Engineer, Data Analyst, Business Analyst"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Job Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="" disabled>Select a job category</option>
              <option value="Business Technology">Business Technology</option>
              <option value="Data Analytics">Data Analytics</option>
              <option value="Technology Consulting">Technology Consulting</option>
              <option value="Software Engineering">Software Engineering</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Job Description Raw Text</label>
          <textarea
            rows={4}
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
            placeholder="Paste the Job Description here..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Evaluate Candidate-JD Match Score
        </button>
      </form>

      {matchData && (
        <div className="mt-8 border-t border-slate-200 pt-6 space-y-6">
          {/* Match Score Header */}
          <div className="flex flex-col md:flex-row items-center justify-between bg-slate-900 text-white rounded-xl p-6 gap-6">
            <div>
              <span className="text-xs uppercase font-semibold text-blue-400 tracking-wider">Overall Candidate-JD Match Score</span>
              <div className="text-4xl font-extrabold text-white mt-1">
                {matchData.matchRecord.overallScore}%
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Evaluated across {matchData.matchRecord.matchedSkillsCount} matched skills and {matchData.matchRecord.missingSkillsCount} missing gaps.
              </p>
            </div>

            {/* Breakdown Scores */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center w-full md:w-auto">
              <div className="bg-slate-800 p-2.5 rounded-lg">
                <div className="text-xs text-slate-400">Tech (40%)</div>
                <div className="text-lg font-bold text-blue-300">{matchData.matchRecord.breakdownScores.technicalScore}%</div>
              </div>
              <div className="bg-slate-800 p-2.5 rounded-lg">
                <div className="text-xs text-slate-400">Soft (15%)</div>
                <div className="text-lg font-bold text-emerald-300">{matchData.matchRecord.breakdownScores.softSkillScore}%</div>
              </div>
              <div className="bg-slate-800 p-2.5 rounded-lg">
                <div className="text-xs text-slate-400">Exp (20%)</div>
                <div className="text-lg font-bold text-purple-300">{matchData.matchRecord.breakdownScores.experienceScore}%</div>
              </div>
              <div className="bg-slate-800 p-2.5 rounded-lg">
                <div className="text-xs text-slate-400">Project (15%)</div>
                <div className="text-lg font-bold text-amber-300">{matchData.matchRecord.breakdownScores.projectScore}%</div>
              </div>
              <div className="bg-slate-800 p-2.5 rounded-lg">
                <div className="text-xs text-slate-400">Edu (10%)</div>
                <div className="text-lg font-bold text-pink-300">{matchData.matchRecord.breakdownScores.educationScore}%</div>
              </div>
            </div>
          </div>

          {/* AI Explanation Box */}
          {matchData.aiExplanation && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-blue-800 font-semibold mb-2">
                <Brain className="w-5 h-5 text-blue-600" />
                Executive AI Recommendation & Evaluation
              </div>
              <div className="text-sm text-blue-950 whitespace-pre-line leading-relaxed">
                {matchData.aiExplanation}
              </div>
            </div>
          )}

          {/* Skill Evidence & Strength Details */}
          <div>
            <h3 className="text-base font-bold text-slate-800 mb-3">Extracted Resume Evidence & Skill Strength</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="p-3">Skill</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Evidence Strength</th>
                    <th className="p-3">Resume Evidence Quote</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matchData.matchRecord.skillEvidences.map((item, idx) => (
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
        </div>
      )}
    </div>
  );
}
