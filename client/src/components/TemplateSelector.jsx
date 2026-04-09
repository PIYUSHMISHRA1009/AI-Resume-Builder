import React, { useState } from "react";
import { Layout } from "lucide-react";

const TemplateSelector = ({ selectedTemplate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const templates = [
    {
      id: "classic",
      name: "Classic",
      preview:
        "A clean, traditional resume format with clear sections and professional typography",
    },
    {
      id: "modern",
      name: "Modern",
      preview:
        "A modern layout with balanced spacing and stylish typography",
    },
    {
      id: "minimal-image",
      name: "Minimal Image",
      preview:
        "Minimal design with a single image and clean typography",
    },
    {
      id: "minimal",
      name: "Minimal",
      preview:
        "Ultra-clean design that puts your content front and center",
    },
  ];

  return (
    <div className="relative inline-block">
      {/* BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-sm text-blue-600 
        bg-linear-to-br from-blue-100 ring-1 ring-blue-300 
        hover:ring-blue-400 transition-all px-3 py-2 rounded-lg"
      >
        <Layout size={14} />
        <span className="max-sm:hidden">Template</span>
      </button>

      {/* DROPDOWN */}
      {isOpen && (
        <div
          className="absolute top-full mt-2 w-64 p-3 space-y-3 z-10 bg-white
          rounded-md border border-gray-200 shadow-sm"
        >
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => {
                onChange(template.id); // ✅ fixed typo
                setIsOpen(false);
              }}
              className={`p-2 rounded cursor-pointer border transition
                ${
                  selectedTemplate === template.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
            >
              <p className="font-medium text-sm">{template.name}</p>
              <p className="text-xs text-gray-500">
                {template.preview}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;