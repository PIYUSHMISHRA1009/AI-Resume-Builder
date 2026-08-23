import React, { useState, useEffect, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import {Share2,Eye,EyeOff,Download} from 'lucide-react'


import PersonalInfoForm from "../components/PersonalInfoForm"
import ProfessionalSummaryForm from "../components/ProfessionalSummaryForm.jsx"
import ResumePreview from "../components/ResumePreview"
import TemplateSelector from "../components/TemplateSelector"
import ColorPicker from "../components/ColorPicker.jsx"
import ExperienceForm from "../components/ExperienceForm"
import EducationForm from "../components/EducationForm"
import ProjectForm from "../components/ProjectForm"
import SkillsForm from "../components/SkillsForm"
import AITools from "../components/AITools"
import {useSelector} from 'react-redux'
import api from "../configs/api"
import toast from "react-hot-toast"

const ResumeBuilder = () => {
  const { resumeId } = useParams()
  const {token}=useSelector(state=>state.auth)
  const navigate = useNavigate()

  const sections = [
    { id: "personal", label: "Personal Info" },
    { id: "summary", label: "Summary" },
    { id: "education", label: "Education" },
    { id: "experience", label: "Experience" },
    { id: "skills", label: "Skills" },
    { id: "projects", label: "Projects" },
  ]

  const [resumeData, setResumeData] = useState({
    _id: '',
    title: '',
    personal_info: {},
    professional_summary: "",
    experience: [],
    education: [],
    project: [],
    skills: [],
    template: "classic",
    accent_color: "#3B82F6",
    public: false,
  })

  const [activeSectionIndex, setActiveSectionIndex] = useState(0)
  const [removeBackground, setRemoveBackground] = useState(false)

  const totalSections = sections.length
  const activeSection = sections[activeSectionIndex]

  const loadExistingResume = useCallback(async (id) => {
    try {
      const { data } = await api.get(`/api/resumes/get/${id}`, {
        headers: {
          Authorization: token
        }
      })

      if (data.resume) {
        setResumeData(data.resume)
        document.title = data.resume.title
      }

    } catch (error) {
      console.log(error.message)
    }
  }, [token])

  // Handle "new" resume creation
  useEffect(() => {
    if (resumeId === 'new') {
      const createNewResume = async () => {
        try {
          const { data } = await api.post('/api/resumes/create', { title: 'Untitled Resume' }, {
            headers: { Authorization: token }
          })
          navigate(`/app/builder/${data.resume._id}`, { replace: true })
        } catch (error) {
          toast.error(error?.response?.data?.message || error.message)
          navigate('/app')
        }
      }
      createNewResume()
    } else if (resumeId) {
      loadExistingResume(resumeId)
    }
  }, [resumeId, token, navigate, loadExistingResume])

  const nextSection = () => {
    setActiveSectionIndex(prev =>
      Math.min(prev + 1, totalSections - 1)
    )
  }

  const prevSection = () => {
    setActiveSectionIndex(prev =>
      Math.max(prev - 1, 0)
    )
  }

  const renderSection = () => {
    switch (activeSection.id) {

      case "personal":
        return (
          <PersonalInfoForm
            data={resumeData.personal_info}
            onChange={(data) =>
              setResumeData(prev => ({
                ...prev,
                personal_info: data,
              }))
            }
            removeBackground={removeBackground}
            setRemoveBackground={setRemoveBackground}
          />
        )

      case "summary":
        return (
          <ProfessionalSummaryForm
            data={resumeData.professional_summary}
            onChange={(data) =>
              setResumeData(prev => ({
                ...prev,
                professional_summary: data
              }))
            }
            setResumeData={setResumeData}
          />
        )

      case "education":
        return (
          <EducationForm
            data={resumeData.education}
            onChange={(data) =>
              setResumeData(prev => ({
                ...prev,
                education: data
              }))
            }
            setResumeData={setResumeData}
          />
        )

      case "experience":
        return (
          <ExperienceForm
            data={resumeData.experience}
            onChange={(data) =>
              setResumeData(prev => ({
                ...prev,
                experience: data
              }))
            }
            setResumeData={setResumeData}
          />
        )

      case "skills":
        return (
          <SkillsForm
            data={resumeData.skills}
            onChange={(data) =>
              setResumeData(prev => ({
                ...prev,
                skills:data
              }))
            }
            setResumeData={setResumeData}
          />
        )

      case "projects":
        return (
          <ProjectForm
            data={resumeData.project}
            onChange={(data) =>
              setResumeData(prev => ({
                ...prev,
                project:data
              }))
            }
            setResumeData={setResumeData}
          />
        )

      default:
        return null
    }
  }

  const changeResumeVisibility=async()=>{
    try{
      const formData=new FormData()
      formData.append("resumeId",resumeId)
      formData.append("resumeData",JSON.stringify({public:!resumeData.public}))

      const {data}= await api.put('/api/resumes/update',formData,{headers:{
        Authorization:token
      }})

      setResumeData({...resumeData,public:!resumeData.public})
      toast.success(data.message)
    }catch(error){
      console.error("Error Saving Resume",error)
    }
  }

  const handleShare = () => {
    const resumeUrl = `${window.location.origin}/view/${resumeId}`;
    if (navigator.share) {
        navigator.share({ url: resumeUrl })
    } else {
        navigator.clipboard.writeText(resumeUrl)
        toast.success("Link copied to clipboard!")
    }
}

  const downloadResume=()=>{
    window.print();
  }

  const saveResume=async()=>{
    try{
      let updatedResumeData=structuredClone(resumeData)

      if(typeof resumeData.personal_info.image=='object'){
        delete updatedResumeData.personal_info.image
      }

      const formData=new FormData();
      formData.append("resumeId",resumeId)
      formData.append('resumeData',JSON.stringify(updatedResumeData))
      removeBackground && formData.append("removeBackground","yes");
      typeof resumeData.personal_info.image==='object' && formData.append("image",
        resumeData.personal_info.image
      )
      const {data}=await api.put('/api/resumes/update',formData,{headers:{
        Authorization:token
      }})

      setResumeData(data.resume)
      toast.success(data.message)

    }catch(error){
      console.error("Error Saving resume:",error)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* BACK */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Link
          to="/app"
          className="inline-flex gap-2 items-center text-slate-500 hover:text-slate-700 transition-all"
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="grid lg:grid-cols-12 gap-8">

          {/* LEFT PANEL */}
          <div className="relative lg:col-span-5 rounded-lg overflow-hidden">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 pt-8">

              {/* PROGRESS BAR */}
              <hr className="absolute top-0 left-0 right-0 border-2 border-gray-200" />
              <hr
                className="absolute top-0 left-0 h-1 bg-linear-to-r from-green-500 to-green-600 border-none transition-all duration-500"
                style={{
                  width:
                    sections.length > 1
                      ? `${(activeSectionIndex * 100) / (sections.length - 1)}%`
                      : "0%",
                }}
              />

              {/* NAVIGATION */}
              <div className="flex justify-between items-center mb-6 border-b border-gray-300 py-2">

                <div className="flex items-center gap-2">
                  <TemplateSelector
                    selectedTemplate={resumeData.template}
                    onChange={(template) =>
                      setResumeData(prev => ({
                        ...prev,
                        template,
                      }))
                    }
                  />

                  <ColorPicker
                    selectedColor={resumeData.accent_color}
                    onChange={(color) =>
                      setResumeData(prev => ({
                        ...prev,
                        accent_color: color,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center gap-2">

                  {activeSectionIndex !== 0 && (
                    <button
                      onClick={prevSection}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      <ChevronLeft className="size-4" />
                      Previous
                    </button>
                  )}

                  <button
                    onClick={nextSection}
                    disabled={activeSectionIndex === totalSections - 1}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </button>

                </div>
              </div>

              {/* FORM */}
              <div className="space-y-6">

                {renderSection()}

                {/* ✅ ONLY ADDITION */}
                <button onClick={()=>toast.promise(saveResume(),{
                      loading:'Saving...',
                      success:'Saved!',
                      error:'Failed to save'
                    })}className='bg-linear-to-br from-green-100 to-green-200
                ring-green-300 text-green-600 ring hover:ring-green-400
                transition-all rounded-md px-6 py-2 mt-6 text-sm'>
                  Save Changes
                </button>

                {/* AI Tools */}
                <AITools
                  resumeId={resumeId}
                  resumeData={resumeData}
                  setResumeData={setResumeData}
                />

              </div>

            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="lg:col-span-7 max-lg:mt-6">
            <div className='relative w-full'>
              <div className='absolute bottom-2 right-2 flex items-center
              justify-end gap-2'>
                {resumeData.public && (
                  <button onClick={handleShare} className='flex items-center p-2 px-4
                  gap-2 text-xs bg-linear-to-br from-blue-200 text-blue-600
                  rounded-lg ring-blue-300 hover:ring transition-colors'>
                    <Share2 className='size-4' />
                  </button>
                )}
                <button onClick={changeResumeVisibility} className="flex items-center gap-2 px-4 py-2 text-xs">
                  {resumeData.public ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  {resumeData.public ? 'Public' : 'Private'}
                </button>
                <button onClick={downloadResume} className='flex items-center gap-2 px-6 py-2 text-xs
                bg-linear-to-br from-green-100 to green-200 text-green-600
                rounded-lg ring-green-300 hover:ring transition-colors'>
                <Download className='size-4' /> Download


                </button>

              </div>

            </div>
            <ResumePreview
              data={resumeData}
              template={resumeData.template}
              accentColor={resumeData.accent_color}
            />
          </div>

        </div>
      </div>

    </div>
  )
}

export default ResumeBuilder