import React, { useState } from 'react'
import { Palette, Check } from 'lucide-react'

const ColorPicker = ({ selectedColor, onChange }) => {

  const [isOpen, setIsOpen] = useState(false)

  const colors = [
    { name: "Blue", value: "#3B82F6" },
    { name: "Indigo", value: "#6366F1" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Green", value: "#10B981" },
    { name: "Red", value: "#EF4444" },
    { name: "Orange", value: "#F97316" },
    { name: "Teal", value: "#14B8A6" },
    { name: "Pink", value: "#EC4899" },
    { name: "Gray", value: "#6B7280" },
    { name: "Black", value: "#1F2937" }
  ]

  return (
    <div className="relative">

      {/* BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-sm text-purple-600 
        bg-linear-to-br from-purple-50 to-purple-100 
        ring-1 ring-purple-300 hover:ring-purple-400 
        transition-all px-3 py-2 rounded-lg"
      >
        <Palette size={16} />
        <span className="max-sm:hidden">Accent</span>
      </button>

      {/* DROPDOWN */}
      {isOpen && (
        <div
          className="grid grid-cols-4 w-60 gap-2 absolute top-full left-0
          p-3 mt-2 z-10 bg-white rounded-md border border-gray-200 shadow-sm"
        >
          {colors.map((color) => (
            <div
              key={color.value}
              onClick={() => {
                onChange(color.value)
                setIsOpen(false)
              }}
              className="relative cursor-pointer group flex flex-col items-center"
            >

              {/* COLOR CIRCLE */}
              <div
                className="w-12 h-12 rounded-full border-2 border-transparent 
                group-hover:border-black/25 transition-colors"
                style={{ backgroundColor: color.value }}
              />

              {/* SELECTED CHECK */}
              {selectedColor === color.value && (
                <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow">
                  <Check size={12} />
                </div>
              )}

              {/* LABEL */}
              <p className="text-xs mt-1 text-gray-600">
                {color.name}
              </p>

            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default ColorPicker