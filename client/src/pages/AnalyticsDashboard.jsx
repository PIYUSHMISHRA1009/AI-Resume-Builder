import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../configs/api";
import { toast } from "react-hot-toast";
import JDMatchTool from "../components/JDMatchTool";
import {
  BarChart3,
  TrendingUp,
  Award,
  Layers,
  GitBranch,
  BookOpen,
  CheckCircle,
  HelpCircle,
  Loader2,
  Sparkles,
} from "lucide-react";

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [versionProgression, setVersionProgression] = useState([]);
  const [lastMatchData, setLastMatchData] = useState(null);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch user resumes
      const resumesRes = await api.get("/api/users/resumes");
      const loadedResumes = resumesRes.data.resumes || [];
      setResumes(loadedResumes);

      if (loadedResumes.length > 0) {
        setSelectedResumeId(loadedResumes[0]._id);
      }

      // 2. Fetch dashboard analytics metrics
      const analyticsRes = await api.get("/api/analytics/dashboard");
      setDashboardData(analyticsRes.data.analytics);
    } catch {
      toast.error("Failed to load analytics dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  const fetchVersionProgression = async (resumeId) => {
    if (!resumeId) return;
    try {
      const res = await api.get(`/api/analytics/versions/${resumeId}`);
      setVersionProgression(res.data.progression || []);
    } catch (err) {
      console.error("Failed to fetch version progression:", err);
    }
  };

  const handleMatchComplete = (matchData) => {
    setLastMatchData(matchData);
    fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedResumeId) {
      fetchVersionProgression(selectedResumeId);
    }
  }, [selectedResumeId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const overview = dashboardData?.overview || {};

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Career Intelligence & JD Analytics
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Analyze candidate-JD alignment, identify skill gaps, and track resume progression across target roles.
            </p>
          </div>
        </div>

        {/* Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Evaluated JDs</span>
              <Layers className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              {overview.total_jds_evaluated || 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">Analyzed job descriptions</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Avg Candidate-JD Match</span>
              <BarChart3 className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              {overview.avg_match_score || 0}%
            </div>
            <p className="text-xs text-slate-400 mt-1">Weighted match score average</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Max Match Score</span>
              <Award className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              {overview.max_match_score || 0}%
            </div>
            <p className="text-xs text-slate-400 mt-1">Highest target role alignment</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Matches Evaluated</span>
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              {overview.total_matches_analyzed || 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">Stored match records</p>
          </div>
        </div>

        {/* JD Match Tool Section */}
        <JDMatchTool resumes={resumes} onMatchComplete={handleMatchComplete} />

        {/* Optimizer CTA */}
        {lastMatchData && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Optimize This Resume for This JD</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Get AI-powered recommendations and improve your match score.
              </p>
            </div>
            <button
              onClick={() =>
                navigate("/app/resume-optimizer", {
                  state: {
                    token: localStorage.getItem("token"),
                    resumeId: lastMatchData.matchRecord?.resumeId || selectedResumeId,
                    jobId: lastMatchData.matchRecord?.jobId,
                    jobTitle: lastMatchData.matchRecord?.jdTitle,
                    matchData: lastMatchData,
                  },
                })
              }
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition"
            >
              <Sparkles className="w-4 h-4" />
              Optimize This Resume for This JD
            </button>
          </div>
        )}

        {/* SQL Analytics Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Demanded Skills (SQL GROUP BY) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Most Demanded Skills Across Target JDs</h3>
                <p className="text-xs text-slate-400">SQL Construct: GROUP BY skill_id ORDER BY COUNT(*) DESC</p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono">SQLite OLAP</span>
            </div>

            <div className="space-y-3">
              {(dashboardData?.topDemandedSkills || []).map((skill, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{skill.skill_name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${Math.min(100, skill.demand_count * 25)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-500 w-12 text-right">{skill.demand_count} JDs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skill Gap Severity Rankings (SQL DENSE_RANK) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Skill Gap Severity Ranking</h3>
                <p className="text-xs text-slate-400">SQL Construct: DENSE_RANK() OVER (ORDER BY frequency DESC)</p>
              </div>
              <span className="text-xs bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md font-mono font-medium">Gap Rank</span>
            </div>

            <div className="space-y-3">
              {(dashboardData?.skillGaps || []).map((gap, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center">
                      #{gap.gap_rank}
                    </span>
                    <span className="font-semibold text-slate-800">{gap.skill_name}</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Missing in {gap.missing_frequency} JDs</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resume Version Progression Section (SQL Window Function LAG) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-800">Resume Version Progression Tracking</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                SQL Construct: Window Function <code className="bg-slate-100 px-1 py-0.5 rounded text-purple-700 font-mono">LAG(overall_score) OVER (PARTITION BY job_id ORDER BY version_number)</code>
              </p>
            </div>

            {resumes.length > 0 && (
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                {resumes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 font-semibold">
                <tr>
                  <th className="p-3">Version</th>
                  <th className="p-3">Target Job Title</th>
                  <th className="p-3">Candidate-JD Match Score</th>
                  <th className="p-3">Previous Version Score</th>
                  <th className="p-3">Improvement Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {versionProgression.map((v, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-purple-900">{v.version_title || `v${v.version_number}`}</td>
                    <td className="p-3 font-semibold text-slate-800">{v.job_title}</td>
                    <td className="p-3 font-extrabold text-slate-900">{v.overall_score}%</td>
                    <td className="p-3 text-slate-500">{v.prev_score}%</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center font-bold px-2 py-0.5 rounded-full ${
                          v.score_improvement > 0
                            ? "bg-emerald-100 text-emerald-800"
                            : v.score_improvement < 0
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {v.score_improvement > 0 ? `+${v.score_improvement}%` : `${v.score_improvement}%`}
                      </span>
                    </td>
                  </tr>
                ))}
                {versionProgression.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                      No version progression records stored yet for this resume. Run match evaluation to create progression data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
