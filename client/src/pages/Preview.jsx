import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import ResumePreview from '../components/ResumePreview'
import { ArrowLeft } from 'lucide-react'
import api from "../configs/api"

const Preview = () => {
  const { resumeId } = useParams()

  const [isLoading, setIsLoading] = useState(true)
  const [resumeData, setResumeData] = useState(null)

  const loadResume = useCallback(async() => {
     console.log("resumeId from URL:", resumeId) 
    try{
      const {data} = await api.get('/api/resumes/public/'+resumeId)
      setResumeData(data.resume)

    } catch(error){
      console.log(error.message)
    }finally{
      setIsLoading(false)
    }
  }, [resumeId])

  useEffect(() => {
    loadResume()
  }, [loadResume])

  // ✅ 1. Loading state
  if (isLoading) {
    return <p className="p-6">Loading...</p>
  }

  // ✅ 2. Not found state
  if (!resumeData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-semibold text-gray-600">
          Resume Not Found
        </h2>

        <a
          href="/"
          className="mt-6 inline-flex items-center gap-2
          bg-green-500 hover:bg-green-600 text-white
          rounded-full px-6 py-2"
        >
          <ArrowLeft className="size-4" />
          Go to Home Page
        </a>
      </div>
    )
  }

  // ✅ 3. Success state
  return (
    <div className="bg-slate-100 min-h-screen">
      <div className="max-w-3xl mx-auto py-10">
        <ResumePreview
          data={resumeData}
          template={resumeData.template}
          accentColor={resumeData.accent_color}
          classes="py-4 bg-white"
        />
      </div>
    </div>
  )
}

export default Preview
