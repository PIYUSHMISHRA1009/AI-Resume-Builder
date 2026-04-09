import React from 'react'
import { Zap } from 'lucide-react'
import Title from "./Title";

const Features = () => {
  return (
    <div
      id="features"
      className="flex flex-col items-center my-10 scroll-mt-12"
    >
      {/* Badge */}
      <div className="flex items-center gap-2 text-sm text-green-800 bg-green-400/10 rounded-full px-6 py-1.5 mb-6">
        <Zap width={14} />
        <span>Optimized for ATS & recruiters</span>
      </div>
      <Title title='Build Your Resume' description='Our streamlined process helps you create a professional Resume in minutes with Intelligent AI-Powered tools and features.' />

      {/* Features Grid */}
      <div className="grid border rounded-lg max-w-6xl mx-auto border-gray-200/70 grid-cols-1 divide-y divide-gray-200/70 lg:grid-cols-3 lg:divide-x lg:divide-y-0 mt-6">
        
        {/* Feature 1 */}
        <div className="flex flex-col items-start gap-4 hover:bg-gray-50 transition duration-300 p-8 pb-14">
          <div className="flex items-center gap-2 text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
              aria-hidden="true"
            >
              <rect width="18" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
              <rect width="7" height="7" x="14" y="14" rx="1" />
            </svg>
            <h2 className="font-medium text-base">AI Resume Builder</h2>
          </div>
          <p className="text-gray-500 text-sm/6 max-w-72">
            Instantly generates professional resumes tailored to your role and experience.
          </p>
        </div>

        {/* Feature 2 */}
        <div className="flex flex-col items-start gap-4 hover:bg-gray-50 transition duration-300 p-8 pb-14">
          <div className="flex items-center gap-2 text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
              aria-hidden="true"
            >
              <path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4" />
              <path d="M2 6h4" />
              <path d="M2 10h4" />
              <path d="M2 14h4" />
              <path d="M2 18h4" />
              <path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
            </svg>
            <h2 className="font-medium text-base">Smart Content Suggestions</h2>
          </div>
          <p className="text-gray-500 text-sm/6 max-w-72">
            Generates impactful summaries, skills, and bullet points using AI.
          </p>
        </div>

        {/* Feature 3 */}
        <div className="flex flex-col items-start gap-4 hover:bg-gray-50 transition duration-300 p-8 pb-14">
          <div className="flex items-center gap-2 text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
              aria-hidden="true"
            >
              <path d="M3 3v16a2 2 0 0 0 2 2h16" />
              <path d="M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7" />
            </svg>
            <h2 className="font-medium text-base">ATS Optimized</h2>
          </div>
          <p className="text-gray-500 text-sm/6 max-w-72">
            Ensures your resume passes applicant tracking systems and recruiter scans.
          </p>
        </div>

      </div>
    </div>
  )
}

export default Features
