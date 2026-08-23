import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import api from '../configs/api'
import toast from 'react-hot-toast'
import {
  Sparkles,
  Database,
  ListChecks,
  Edit3,
  Brain,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Info,
  ExternalLink,
  Search
} from 'lucide-react'

const AITools = ({ resumeId, resumeData, setResumeData }) => {
  const { token } = useSelector(state => state.auth)

  // Tailor Resume state
  const [showTailorModal, setShowTailorModal] = useState(false)
  const [jdText, setJdText] = useState('')
  const [tailoredBullets, setTailoredBullets] = useState([])
  const [retrievedContext, setRetrievedContext] = useState([])
  const [hitRate, setHitRate] = useState(0)
  const [latencyMs, setLatencyMs] = useState(0)
  const [isTailoring, setIsTailoring] = useState(false)
  const [tailorError, setTailorError] = useState(null)

  // Index Resume state
  const [isIndexing, setIsIndexing] = useState(false)
  const [indexResult, setIndexResult] = useState(null)

  // RAG Logs state
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [ragLogs, setRagLogs] = useState([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)

  // Refine Bullet state
  const [showRefineModal, setShowRefineModal] = useState(false)
  const [refineBulletId, setRefineBulletId] = useState('')
  const [refineFeedback, setRefineFeedback] = useState('')
  const [refinedText, setRefinedText] = useState('')
  const [conversationHistory, setConversationHistory] = useState([])
  const [isRefining, setIsRefining] = useState(false)
  const [availableBullets, setAvailableBullets] = useState([])
  const [showBulletPicker, setShowBulletPicker] = useState(false)

  // Skill Gaps state
  const [showSkillGapsModal, setShowSkillGapsModal] = useState(false)
  const [skillGapsJdText, setSkillGapsJdText] = useState('')
  const [skillGaps, setSkillGaps] = useState([])
  const [isAnalyzingGaps, setIsAnalyzingGaps] = useState(false)

  // Load available bullets for refine bullet picker
  const loadAvailableBullets = async () => {
    try {
      // Get bullets from the current resume's experience, skills, etc.
      const bullets = []
      if (resumeData.professional_summary) {
        bullets.push({ id: 'summary', text: resumeData.professional_summary, source: 'summary' })
      }
      resumeData.skills?.forEach((skill, i) => {
        if (skill.trim()) bullets.push({ id: `skill-${i}`, text: skill, source: 'skill' })
      })
      resumeData.experience?.forEach((exp, i) => {
        if (exp.description) {
          exp.description.split('\n').forEach((line, j) => {
            const trimmed = line.trim()
            if (trimmed) bullets.push({ id: `exp-${i}-${j}`, text: trimmed, source: 'experience', company: exp.company, position: exp.position })
          })
        }
      })
      resumeData.project?.forEach((proj, i) => {
        if (proj.description) bullets.push({ id: `proj-${i}`, text: proj.description, source: 'project', name: proj.name })
      })
      setAvailableBullets(bullets)
    } catch (error) {
      console.error('Error loading bullets:', error)
    }
  }

  // Tailor Resume
  const handleTailorResume = async () => {
    if (!jdText.trim()) {
      toast.error('Please enter a job description')
      return
    }

    setIsTailoring(true)
    setTailorError(null)
    setTailoredBullets([])
    setRetrievedContext([])

    try {
      const response = await api.post('/api/ai/tailor-resume', {
        jd_text: jdText,
        resume_id: resumeId
      }, {
        headers: { Authorization: token }
      })

      setTailoredBullets(response.data.tailoredBullets || [])
      setRetrievedContext(response.data.retrievedContext || [])
      setHitRate(response.data.hitRate || 0)
      setLatencyMs(response.data.latencyMs || 0)
      toast.success('Resume tailored successfully!')
    } catch (error) {
      const msg = error?.response?.data?.message || error.message
      setTailorError(msg)
      toast.error(msg)
    } finally {
      setIsTailoring(false)
    }
  }

  // Apply tailored bullets to resume
  const applyTailoredBullets = () => {
    if (tailoredBullets.length === 0) return

    // For now, add to professional summary or create experience entries
    // In a real implementation, you'd want more sophisticated mapping
    const bulletsText = tailoredBullets.map(b => b.bullet || b).join('\n\n')

    setResumeData(prev => ({
      ...prev,
      professional_summary: prev.professional_summary
        ? prev.professional_summary + '\n\n--- AI Tailored ---\n\n' + bulletsText
        : bulletsText
    }))

    toast.success('Tailored bullets added to professional summary!')
    setShowTailorModal(false)
    setJdText('')
    setTailoredBullets([])
  }

  // Index Resume
  const handleIndexResume = async () => {
    setIsIndexing(true)
    setIndexResult(null)

    try {
      const response = await api.post('/api/ai/index-resume', {
        resume_id: resumeId
      }, {
        headers: { Authorization: token }
      })

      setIndexResult(response.data)
      toast.success(`Indexed ${response.data.count} bullets from ${response.data.sources?.join(', ') || 'resume'}`)
    } catch (error) {
      const msg = error?.response?.data?.message || error.message
      toast.error(msg)
    } finally {
      setIsIndexing(false)
    }
  }

  // Load RAG Logs
  const loadRagLogs = async () => {
    setIsLoadingLogs(true)
    try {
      const response = await api.get('/api/ai/rag-logs?limit=20', {
        headers: { Authorization: token }
      })
      setRagLogs(response.data.logs || [])
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message)
    } finally {
      setIsLoadingLogs(false)
    }
  }

  // Refine Bullet
  const handleRefineBullet = async () => {
    if (!refineBulletId || !refineFeedback.trim()) {
      toast.error('Please select a bullet and provide feedback')
      return
    }

    setIsRefining(true)
    try {
      const response = await api.post('/api/ai/refine-bullet', {
        bulletId: refineBulletId,
        userFeedback: refineFeedback,
        conversationHistory
      }, {
        headers: { Authorization: token }
      })

      setRefinedText(response.data.refinedText)
      setConversationHistory(prev => [...prev, refineFeedback, response.data.refinedText])
      setRefineFeedback('')
      toast.success('Bullet refined!')
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message)
    } finally {
      setIsRefining(false)
    }
  }

  // Apply refined bullet
  const applyRefinedBullet = () => {
    // This would need more sophisticated mapping to update the right field
    // For now, append to professional summary
    setResumeData(prev => ({
      ...prev,
      professional_summary: prev.professional_summary
        ? prev.professional_summary + '\n\n--- Refined ---\n\n' + refinedText
        : refinedText
    }))
    toast.success('Refined bullet added!')
    setRefinedText('')
    setConversationHistory([])
    setRefineBulletId('')
    setShowRefineModal(false)
  }

  // Analyze Skill Gaps
  const handleAnalyzeSkillGaps = async () => {
    if (!skillGapsJdText.trim()) {
      toast.error('Please enter a job description')
      return
    }

    setIsAnalyzingGaps(true)
    setSkillGaps([])

    try {
      const response = await api.post('/api/ai/skill-gaps', {
        jdText: skillGapsJdText,
        threshold: 0.4
      }, {
        headers: { Authorization: token }
      })

      setSkillGaps(response.data.skillGaps || [])
      toast.success(`Found ${response.data.skillGaps?.length || 0} skill gaps`)
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message)
    } finally {
      setIsAnalyzingGaps(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Brain className="size-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">AI Tools</h3>
        <p className="text-sm text-gray-500">RAG-powered resume intelligence</p>
      </div>

      {/* Tool Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Tailor Resume Card */}
        <button
          onClick={() => { setShowTailorModal(true); loadAvailableBullets() }}
          className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <Sparkles className="size-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Tailor Resume to JD</h4>
              <p className="text-sm text-gray-500 mt-1">Paste a job description and get AI-rewritten bullets grounded in your resume history</p>
            </div>
          </div>
        </button>

        {/* Index Resume Card */}
        <button
          onClick={handleIndexResume}
          disabled={isIndexing}
          className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left group disabled:opacity-50"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
              <Database className="size-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Index Resume for RAG</h4>
              <p className="text-sm text-gray-500 mt-1">Build vector embeddings for this resume to enable semantic search</p>
            </div>
            {isIndexing && <Loader2 className="size-5 animate-spin text-blue-600" />}
          </div>
          {indexResult && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              Indexed {indexResult.count} bullets from {indexResult.sources?.join(', ') || 'resume'}
            </div>
          )}
        </button>

        {/* RAG Logs Card */}
        <button
          onClick={() => { setShowLogsModal(true); loadRagLogs() }}
          className="p-4 border border-gray-200 rounded-lg hover:border-amber-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
              <ListChecks className="size-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">RAG Evaluation Logs</h4>
              <p className="text-sm text-gray-500 mt-1">View retrieval quality metrics and generated outputs for debugging</p>
            </div>
          </div>
        </button>

        {/* Refine Bullet Card */}
        <button
          onClick={() => { setShowRefineModal(true); loadAvailableBullets() }}
          className="p-4 border border-gray-200 rounded-lg hover:border-pink-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-pink-100 rounded-lg group-hover:bg-pink-200 transition-colors">
              <Edit3 className="size-5 text-pink-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Refine Bullet with Feedback</h4>
              <p className="text-sm text-gray-500 mt-1">Iteratively improve a bullet point by providing natural language feedback</p>
            </div>
          </div>
        </button>

        {/* Skill Gaps Card */}
        <button
          onClick={() => setShowSkillGapsModal(true)}
          className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
              <AlertCircle className="size-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Skill Gap Analysis</h4>
              <p className="text-sm text-gray-500 mt-1">Compare your skills against a job description to find missing keywords</p>
            </div>
          </div>
        </button>

      </div>

      {/* Tailor Resume Modal */}
      {showTailorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur z-50 flex items-center justify-center p-4" onClick={() => setShowTailorModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="text-purple-600" /> Tailor Resume to Job Description
              </h2>
              <button onClick={() => setShowTailorModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="size-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Description</label>
                <textarea
                  value={jdText}
                  onChange={e => setJdText(e.target.value)}
                  rows={6}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                  placeholder="Paste the job description here..."
                />
              </div>

              <button
                onClick={handleTailorResume}
                disabled={isTailoring || !jdText.trim()}
                className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isTailoring ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Tailor Resume
                  </>
                )}
              </button>

              {tailorError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="size-4" />
                  {tailorError}
                </div>
              )}

              {/* Results */}
              {tailoredBullets.length > 0 && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Tailored Bullets</h3>
                    <div className="text-xs text-gray-500 flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Info className="size-3" />
                        Hit Rate: {(hitRate * 100).toFixed(0)}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Database className="size-3" />
                        {latencyMs}ms
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {tailoredBullets.map((bullet, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded border border-gray-200 flex items-start gap-2">
                        <span className="text-sm font-mono text-purple-600">#{i + 1}</span>
                        <p className="flex-1 text-sm text-gray-800">{bullet.bullet || bullet}</p>
                        {bullet.source_id && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">src: {bullet.source_id.slice(-8)}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={applyTailoredBullets}
                      className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <Check className="size-4" />
                      Apply to Resume
                    </button>
                    <button
                      onClick={() => copyToClipboard(tailoredBullets.map(b => b.bullet || b).join('\n\n'))}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Copy className="size-4" />
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {/* Retrieved Context (Collapsible) */}
              {retrievedContext.length > 0 && (
                <div className="border-t pt-4">
                  <button
                    onClick={() => {}}
                    className="flex items-center justify-between text-sm text-gray-600 hover:text-gray-900"
                  >
                    <span className="flex items-center gap-2">
                      <Database className="size-4" />
                      Retrieved Context ({retrievedContext.length} bullets)
                    </span>
                    <ChevronDown className="size-4" />
                  </button>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {retrievedContext.map((ctx, i) => (
                      <div key={i} className="p-2 bg-gray-50 rounded text-xs border border-gray-200">
                        <div className="flex items-center gap-1 text-gray-500 mb-1">
                          <span className="font-mono">#{i + 1}</span>
                          <span className="px-1.5 py-0.5 bg-gray-200 rounded text-[10px]">{ctx.source}</span>
                          <span className="text-green-600 font-mono">sim: {ctx.score?.toFixed(3) || 'N/A'}</span>
                        </div>
                        <p className="text-gray-700">{ctx.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RAG Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur z-50 flex items-center justify-center p-4" onClick={() => setShowLogsModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ListChecks className="text-amber-600" /> RAG Evaluation Logs
              </h2>
              <button onClick={() => setShowLogsModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="size-5" /></button>
            </div>
            <div className="p-4">
              {isLoadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-amber-600" />
                </div>
              ) : ragLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ListChecks className="size-12 mx-auto mb-3 text-gray-300" />
                  <p>No evaluation logs found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {ragLogs.map((log, i) => (
                    <div
                      key={log._id || i}
                      onClick={() => setSelectedLog(log)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedLog?._id === log._id
                          ? 'border-amber-400 bg-amber-50'
                          : 'border-gray-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500">#{i + 1}</span>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                            Hit Rate: {(log.hitRate * 100).toFixed(0)}%
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                            {log.latencyMs}ms
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            Top-{log.topK}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">{formatDate(log.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-1">{log.jdText}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Log Detail */}
              {selectedLog && (
                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Log Details</h3>
                    <button onClick={() => setSelectedLog(null)} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
                  </div>
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-sm font-medium text-gray-700">Job Description:</p>
                      <p className="text-sm text-gray-600 mt-1">{selectedLog.jdText}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Retrieved Bullets:</p>
                      <div className="space-y-2">
                        {selectedLog.retrieved?.map((r, i) => (
                          <div key={i} className="p-2 bg-gray-50 rounded border border-gray-200 text-xs">
                            <div className="flex items-center gap-1 text-gray-500 mb-1">
                              <span className="px-1.5 py-0.5 bg-gray-200 rounded text-[10px]">{r.source}</span>
                              <span className="text-green-600 font-mono">sim: {r.score?.toFixed(3) || 'N/A'}</span>
                            </div>
                            <p className="text-gray-700">{r.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Generated Bullets:</p>
                      <div className="space-y-2">
                        {selectedLog.generatedBullets?.map((b, i) => (
                          <div key={i} className="p-2 bg-purple-50 rounded border border-purple-100 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-purple-600">#{i + 1}</span>
                              {b.source_id && (
                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px]">src: {b.source_id.slice(-8)}</span>
                              )}
                            </div>
                            <p className="text-gray-800 mt-1">{b.bullet || b}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Refine Bullet Modal */}
      {showRefineModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur z-50 flex items-center justify-center p-4" onClick={() => setShowRefineModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Edit3 className="text-pink-600" /> Refine Bullet with Feedback
              </h2>
              <button onClick={() => { setShowRefineModal(false); setRefineBulletId(''); setRefinedText(''); setConversationHistory([]) }} className="p-1 hover:bg-gray-100 rounded"><X className="size-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              {/* Bullet Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Bullet to Refine</label>
                <button
                  onClick={() => setShowBulletPicker(!showBulletPicker)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-left hover:border-pink-500 focus:ring-2 focus:ring-pink-500 flex items-center justify-between"
                >
                  <span className={refineBulletId ? 'text-gray-900' : 'text-gray-500'}>
                    {refineBulletId
                      ? availableBullets.find(b => b.id === refineBulletId)?.text?.slice(0, 80) + '...'
                      : 'Click to select a bullet from your resume'}
                  </span>
                  <ChevronDown className="size-4 text-gray-500" />
                </button>

                {showBulletPicker && (
                  <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded bg-white z-10 absolute w-full">
                    {availableBullets.map((bullet) => (
                      <button
                        key={bullet.id}
                        onClick={() => { setRefineBulletId(bullet.id); setShowBulletPicker(false) }}
                        className={`w-full p-3 text-left border-b last:border-0 hover:bg-pink-50 ${
                          refineBulletId === bullet.id ? 'bg-pink-50 border-l-2 border-pink-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{bullet.source}</span>
                          {bullet.company && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{bullet.company}</span>}
                          {bullet.position && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">{bullet.position}</span>}
                        </div>
                        <p className="mt-1 text-sm text-gray-700 line-clamp-2">{bullet.text}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Feedback Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Feedback</label>
                <textarea
                  value={refineFeedback}
                  onChange={e => setRefineFeedback(e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none resize-none"
                  placeholder="e.g., 'Make it more concise', 'Add specific metrics', 'Focus on leadership aspect'..."
                />
              </div>

              <button
                onClick={handleRefineBullet}
                disabled={isRefining || !refineBulletId || !refineFeedback.trim()}
                className="w-full py-2 px-4 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRefining ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Refining...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Refine Bullet
                  </>
                )}
              </button>

              {/* Refined Result */}
              {refinedText && (
                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-medium text-gray-900">Refined Version</h3>
                  <div className="p-3 bg-pink-50 border border-pink-200 rounded">
                    <p className="text-gray-800">{refinedText}</p>
                  </div>

                  {conversationHistory.length > 2 && (
                    <div className="border-t pt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Conversation History</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {conversationHistory.slice(0, -1).map((turn, i) => (
                          <div key={i} className={`p-2 rounded text-sm ${i % 2 === 0 ? 'bg-blue-50 text-blue-800' : 'bg-pink-50 text-pink-800'}`}>
                            <span className="font-medium">{i % 2 === 0 ? 'You: ' : 'AI: '}</span>
                            {turn}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={applyRefinedBullet}
                      className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <Check className="size-4" />
                      Apply to Resume
                    </button>
                    <button
                      onClick={() => copyToClipboard(refinedText)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Copy className="size-4" />
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Skill Gaps Modal */}
      {showSkillGapsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur z-50 flex items-center justify-center p-4" onClick={() => setShowSkillGapsModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <AlertCircle className="text-orange-600" /> Skill Gap Analysis
              </h2>
              <button onClick={() => { setShowSkillGapsModal(false); setSkillGapsJdText(''); setSkillGaps([]) }} className="p-1 hover:bg-gray-100 rounded"><X className="size-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Description</label>
                <textarea
                  value={skillGapsJdText}
                  onChange={e => setSkillGapsJdText(e.target.value)}
                  rows={6}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                  placeholder="Paste the job description to analyze skill gaps..."
                />
              </div>

              <button
                onClick={handleAnalyzeSkillGaps}
                disabled={isAnalyzingGaps || !skillGapsJdText.trim()}
                className="w-full py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAnalyzingGaps ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="size-4" />
                    Analyze Skill Gaps
                  </>
                )}
              </button>

              {skillGaps.length > 0 && (
                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-medium text-gray-900">Missing Skills ({skillGaps.length})</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {skillGaps.map((gap, i) => (
                      <div key={i} className="p-3 bg-orange-50 border border-orange-200 rounded">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-orange-800">{gap.skill}</span>
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-mono">
                                Similarity: {(gap.similarity * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-sm text-orange-700">{gap.suggestion}</p>
                            {gap.learningResource && (
                              <a
                                href={gap.learningResource}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-2 text-xs text-orange-600 hover:underline"
                              >
                                <ExternalLink className="size-3" />
                                Learning Resource
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {skillGaps.length === 0 && skillGapsJdText && !isAnalyzingGaps && (
                <div className="border-t pt-4 text-center text-gray-500 py-4">
                  <Check className="size-12 mx-auto mb-2 text-green-500" />
                  <p>No significant skill gaps found! Your profile aligns well with this job.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AITools