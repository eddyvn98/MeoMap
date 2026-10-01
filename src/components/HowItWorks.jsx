import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sections } from './how-it-works/howItWorksSections';

const HowItWorks = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');

  // Content lives in a dedicated module to keep this component focused.

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span className="text-xl">←</span>
            <span className="font-semibold">Quay lại</span>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">📚 Cách Sử Dụng MeoMap</h1>
            <p className="text-sm text-gray-600">Hướng dẫn chi tiết từng bước</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {Object.entries(sections).map(([key, section]) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`p-4 rounded-lg font-semibold transition-all border-2 ${
                activeSection === key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-900 border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="text-2xl mb-1">{section.icon}</div>
              <div className="text-sm">{section.title}</div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-3xl font-bold mb-6">
            {sections[activeSection].icon} {sections[activeSection].title}
          </h2>
          {sections[activeSection].content}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>❓ Vẫn có câu hỏi? <a href="/faq" className="text-blue-600 hover:underline">Xem FAQ</a> • <a href="/glossary" className="text-blue-600 hover:underline">Từ điển</a> hoặc liên hệ hỗ trợ</p>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
