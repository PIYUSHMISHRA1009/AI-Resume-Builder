import React from 'react'
import ClassicTemplate from '../assets/templates/ClassicTemplate'
import ModernTemplate from '../assets/templates/ModernTemplate'
import MinimalTemplate from '../assets/templates/MinimalTemplate'
import MinimalImageTemplate from '../assets/templates/MinimalImageTemplate'

const ResumePreview = ({ template, data, accentColor, classes = "" }) => {

  const renderTemplate = () => {
    switch (template) {
      case "modern":
        return <ModernTemplate data={data} accentColor={accentColor} />
      case "minimal":
        return <MinimalTemplate data={data} accentColor={accentColor} />
      case "minimal-image":
        return <MinimalImageTemplate data={data} accentColor={accentColor} />
      default:
        return <ClassicTemplate data={data} accentColor={accentColor} />
    }
  }

  return (
    <div className='w-full bg-gray-100'>
      <div
        id="resume-preview"
        className={`bg-white border border-gray-200 print:shadow-none print:border-none ${classes}`}
        style={{ minHeight: "1000px" }}
      >
        {renderTemplate()}
      </div>

      <style>
        {`
          @page {
            size: A4;
            margin: 0;
          }

          @media print {
            html, body {
              width: 210mm;
              height: 297mm;
              margin: 0;
              padding: 0;
              overflow: hidden;
            }

            body * {
              visibility: hidden;
            }

            #resume-preview,
            #resume-preview * {
              visibility: visible;
            }

            #resume-preview {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
              box-shadow: none !important;
              border: none !important;
            }
          }
        `}
      </style>
    </div>
  )
}

export default ResumePreview