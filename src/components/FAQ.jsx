import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { faqs } from './faq/faqData';

const FAQ = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('deposits');
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = (id) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Content lives in a dedicated module to keep this component focused.

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span className="text-xl">←</span>
            <span className="font-semibold">Quay lại</span>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">❓ Câu Hỏi Thường Gặp</h1>
            <p className="text-sm text-gray-600">Tìm câu trả lời cho câu hỏi của bạn</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Category tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-8">
          {Object.entries(faqs).map(([key, category]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`p-3 rounded-lg font-semibold transition-all border-2 text-center ${
                activeCategory === key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-900 border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="text-2xl mb-1">{category.icon}</div>
              <div className="text-xs sm:text-sm">{category.title.split(' ')[0]}</div>
            </button>
          ))}
        </div>

        {/* FAQ Content */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-3xl font-bold mb-6">
            {faqs[activeCategory].icon} {faqs[activeCategory].title}
          </h2>

          <div className="space-y-3">
            {faqs[activeCategory].items.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 text-left">{item.q}</span>
                  <span
                    className={`text-gray-500 transition-transform ${
                      expandedItems[item.id] ? 'rotate-180' : ''
                    }`}
                  >
                    ▼
                  </span>
                </button>

                {expandedItems[item.id] && (
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <p className="text-gray-700 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center text-gray-600">
          <p className="mb-3">Vẫn không tìm thấy câu trả lời?</p>
          <a href="mailto:support@meomap.com" className="text-blue-600 hover:underline font-semibold">
            Liên hệ hỗ trợ →
          </a>
        </div>

        {/* Footer link */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>
            📚 <a href="/how-it-works" className="text-blue-600 hover:underline">Xem hướng dẫn chi tiết</a> • <a href="/glossary" className="text-blue-600 hover:underline">Từ điển</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
