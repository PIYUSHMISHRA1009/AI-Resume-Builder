import React, { useState, useEffect, useCallback } from "react"
import { Plus, UploadCloud, FilePenLine, Trash2, Pencil, X, LoaderCircleIcon, Brain, Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useSelector } from "react-redux";
import api from "../configs/api";
import toast from "react-hot-toast";
import pdfToText from 'react-pdftotext'

const Dashboard = () => {

  const { token } = useSelector(state => state.auth)

  const colors = ["#9333ea", "#d97706", "#dc2626", "#0284c7", "#16a34a"]
  const [allResumes, setAllResumes] = useState([])
  const [showCreateResume, setShowCreateResume] = useState(false)
  const [title, setTitle] = useState("")
  const [showUploadResume, setShowUploadResume] = useState(false)
  const [resume, setResume] = useState(null)

  const [isLoading, setIsLoading] = useState(false)

  const navigate = useNavigate()
  // Fixed naming consistency here
  const [editResumeId, setEditResumeId] = useState('')

  const loadAllResumes = useCallback(async () => {
    try {
      const { data } = await api.get('/api/users/resumes', {
        headers: { Authorization: token }
      })
      setAllResumes(data.resumes)
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message)
    }
  }, [token])

  useEffect(() => {
    loadAllResumes()
  }, [loadAllResumes])

  const createResume = async (event) => {
    try {
      event.preventDefault()
      const { data } = await api.post('/api/resumes/create', { title }, {
        headers: { Authorization: token }
      })
      setAllResumes([...allResumes, data.resume])
      setTitle('')
      setShowCreateResume(false)
      navigate(`/app/builder/${data.resume._id}`)
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message)
    }
  }

  const uploadResume = async (event) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      const resumeText = await pdfToText(resume)
      const { data } = await api.post('/api/ai/upload-resume', { title, resumeText }, {
        headers: { Authorization: token }
      })
      setAllResumes(prev => [data, ...prev])
      setTitle('')
      setResume(null)
      setShowUploadResume(false)
      navigate(`/app/builder/${data._id}`)
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message)
    }
    setIsLoading(false)
  }

  const editTitle = async (event) => {
    try {
      event.preventDefault()
      const { data } = await api.put('/api/resumes/update', { resumeId: editResumeId, resumeData: { title } }, {
        headers: { Authorization: token }
      })

      setAllResumes(prev =>
        prev.map(resume =>
          resume._id === editResumeId
            ? { ...resume, title }
            : resume
        )
      )

      setEditResumeId('')
      setTitle('')
      toast.success(data.message)
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message)
    }
  }

  const deleteResume = async (resumeId) => {
    try {
      const confirm = window.confirm('Are you sure you want to delete this resume?')
      if (confirm) {
        const { data } = await api.delete(`/api/resumes/delete/${resumeId}`, {
          headers: { Authorization: token }
        })
        setAllResumes(prev => prev.filter(resume => resume._id !== resumeId))
        toast.success(data.message)
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message)
    }
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Welcome */}
        <p className="text-2xl font-medium mb-6 bg-linear-to-r from-slate-600 to-slate-700 bg-clip-text text-transparent sm:hidden">
          Welcome, Joe Doe
        </p>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setShowCreateResume(true)}
            className="w-full bg-white sm:max-w-36 h-48 flex flex-col items-center justify-center rounded-lg gap-2 text-slate-600 border border-dashed border-slate-300 group hover:border-indigo-500 hover:shadow-lg transition-all duration-300 cursor-pointer"
          >
            <Plus className="size-11 p-2.5 bg-linear-to-br from-indigo-400 to-indigo-500 text-white rounded-full" />
            <p className="text-sm group-hover:text-indigo-600">Create Resume</p>
          </button>

          <button onClick={() => setShowUploadResume(true)} className="w-full bg-white sm:max-w-36 h-48 flex flex-col items-center justify-center rounded-lg gap-2 text-slate-600 border border-dashed border-slate-300 group hover:border-purple-500 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <UploadCloud className="size-11 p-2.5 bg-linear-to-br from-purple-300 to-purple-500 text-white rounded-full" />
            <p className="text-sm group-hover:text-purple-600">Upload Existing</p>
          </button>

          <button
            onClick={() => navigate('/app/builder/new')}
            className="w-full bg-white sm:max-w-36 h-48 flex flex-col items-center justify-center rounded-lg gap-2 text-slate-600 border border-dashed border-slate-300 group hover:border-pink-500 hover:shadow-lg transition-all duration-300 cursor-pointer"
          >
            <Brain className="size-11 p-2.5 bg-linear-to-br from-pink-300 to-pink-500 text-white rounded-full" />
            <p className="text-sm group-hover:text-pink-600">AI Tools</p>
          </button>
        </div>

        <hr className="border-slate-300 my-6 sm:w-76.25" />

        {/* Resume Cards */}
        <div className="grid grid-cols-2 sm:flex flex-wrap gap-4">
          {allResumes.map((resume, index) => {
            const baseColor = colors[index % colors.length]

            return (
              <button
                key={index} onClick={() => navigate(`/app/builder/${resume._id}`)}
                className="relative w-full sm:max-w-36 h-48 flex flex-col items-center justify-center rounded-lg gap-2 border group hover:shadow-lg transition-all duration-300 cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${baseColor}10, ${baseColor}40)`,
                  borderColor: baseColor + "40",
                }}
              >
                <FilePenLine className="size-7 group-hover:scale-105" style={{ color: baseColor }} />

                <p className="text-sm font-medium px-2 text-center" style={{ color: baseColor }}>
                  {resume.title || resume.name}
                </p>

                <p className="text-xs px-2 text-center" style={{ color: baseColor + "90" }}>
                  Updated on {new Date(resume.updatedAt).toLocaleDateString()}
                </p>

                <div onClick={e => e.stopPropagation()} className="absolute top-1 right-1 hidden group-hover:flex items-center gap-1">
                  <Trash2 onClick={() => deleteResume(resume._id)} className="size-6 p-1 hover:bg-white/50 rounded text-slate-700" />
                  <Pencil
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent navigating to builder
                      setEditResumeId(resume._id);
                      setTitle(resume.title || resume.name);
                    }}
                    className="size-7 p-1.5 hover:bg-white/50 rounded text-slate-700"
                  />
                </div>
              </button>
            )
          })}
        </div>

        {/* CREATE MODAL */}
        {showCreateResume && (
          <form
            onSubmit={createResume}
            onClick={() => setShowCreateResume(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur bg-opacity-50 z-10 flex items-center justify-center"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white border shadow-md rounded-lg w-full max-w-sm p-6"
            >
              <h2 className="text-xl font-bold mb-4">Create a Resume</h2>
              <input
                type="text"
                placeholder="Enter resume title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 mb-4 border focus:border-green-600 outline-none rounded"
                required
              />
              <button className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                Create Resume
              </button>
              <X
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
                onClick={() => {
                  setShowCreateResume(false)
                  setTitle("")
                }}
              />
            </div>
          </form>
        )}

        {/* UPLOAD MODAL */}
        {showUploadResume && (
          <form
            onSubmit={uploadResume}
            onClick={() => setShowUploadResume(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur bg-opacity-50 z-10 flex items-center justify-center"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white border shadow-md rounded-lg w-full max-w-sm p-6"
            >
              <h2 className="text-xl font-bold mb-4">Upload a Resume</h2>
              <input
                type="text"
                placeholder="Enter resume title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 mb-4 border focus:border-green-600 outline-none rounded"
                required
              />
              <div>
                <label htmlFor="resume-input" className="block text-sm text-slate-700">
                  Select Resume File
                  <div className='flex flex-col items-center justify-center gap-2 border group text-slate-400 border-slate-400 border-dashed rounded-md p-4 py-10 my-4 hover:border-green-500 hover:text-green-700 cursor-pointer transition-colors'>
                    {resume ? (
                      <p className='text-green-700'>{resume.name}</p>
                    ) : (
                      <>
                        <UploadCloud className='size-14 stroke-1' />
                        <p>Upload Resume</p>
                      </>
                    )}
                  </div>
                </label>
                <input type="file" id='resume-input' accept='.pdf' hidden onChange={(e) => setResume(e.target.files[0])} />
              </div>
              <button disabled={isLoading} className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex-items-center justify-center">
                {isLoading && <LoaderCircleIcon className='animate-spin size-4 text-white ' />}
                {isLoading ? 'Uploading...' : 'Upload Resume'}
              </button>
              <X
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
                onClick={() => {
                  setShowUploadResume(false)
                  setTitle("")
                }}
              />
            </div>
          </form>
        )}

        {/* EDIT MODAL */}
        {editResumeId && (
          <form
            onSubmit={editTitle}
            onClick={() => setEditResumeId('')}
            className="fixed inset-0 bg-black/70 backdrop-blur bg-opacity-50 z-10 flex items-center justify-center"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white border shadow-md rounded-lg w-full max-w-sm p-6"
            >
              <h2 className="text-xl font-bold mb-4">Edit Resume Title</h2>
              <input
                type="text"
                placeholder="Enter resume title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 mb-4 border focus:border-green-600 outline-none rounded"
                required
              />
              <button className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                Update
              </button>
              <X
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
                onClick={() => {
                  setEditResumeId('')
                  setTitle("")
                }}
              />
            </div>
          </form>
        )}

      </div>
    </div>
  )
}

export default Dashboard