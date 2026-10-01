import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import RescueOverviewTab from "./RescueOverviewTab";
import RescueAppealTab from "./RescueAppealTab";
import RescueUpdatesTab from "./RescueUpdatesTab";
import RescueCompleteTab from "./RescueCompleteTab";

export default function RescueActivityPanelView({ scope }) {
  const { caseId, rescuerId, isRescuer, activeTab, onCaseUpdated, activeSection, setActiveSection, caseData, setCaseData, loading, setLoading, error, setError, appealTitle, setAppealTitle, appealContent, setAppealContent, appealBudget, setAppealBudget, submittingAppeal, setSubmittingAppeal, updateTitle, setUpdateTitle, updateContent, setUpdateContent, updateCost, setUpdateCost, updateImages, setUpdateImages, submittingUpdate, setSubmittingUpdate, completionNotes, setCompletionNotes, completionImages, setCompletionImages, submittingCompletion, setSubmittingCompletion, handleCreateAppeal, handleAddUpdate, handleCompleteCase, isCaseClosed } = scope;
  return (
    <div className="space-y-4">
      {/* TIÊU ĐỀ & TRẠNG THÁI */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-1">🚑 Trung tâm cứu hộ của bạn</h2>
        <p className="text-sm opacity-90">Quản lý ca cứu hộ: {caseData.name}</p>
        <div className="mt-3">
          <div
            className={`inline-block px-3 py-1 rounded-full font-semibold text-sm ${
              isCaseClosed
                ? "bg-green-600 text-white"
                : "bg-yellow-300 text-gray-900"
            }`}
          >
            {isCaseClosed ? "✅ Đã hoàn thành" : "⏳ Đang tiến hành"}
          </div>
        </div>
      </div>

      {/* TABS */}
      {!isCaseClosed && activeTab === "overview" && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveSection("overview")}
            className={`flex-1 min-w-[120px] px-3 py-2 rounded font-semibold text-sm transition ${
              activeSection === "overview"
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            📊 Tổng quan
          </button>
          <button
            onClick={() => setActiveSection("appeal")}
            className={`flex-1 min-w-[120px] px-3 py-2 rounded font-semibold text-sm transition ${
              activeSection === "appeal"
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            📢 Kêu gọi
          </button>
          <button
            onClick={() => setActiveSection("updates")}
            className={`flex-1 min-w-[120px] px-3 py-2 rounded font-semibold text-sm transition ${
              activeSection === "updates"
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            📸 Cập nhật
          </button>
          <button
            onClick={() => setActiveSection("complete")}
            className={`flex-1 min-w-[120px] px-3 py-2 rounded font-semibold text-sm transition ${
              activeSection === "complete"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            ✅ Hoàn thành
          </button>
        </div>
      )}

      {/* NỘI DUNG TỪNG TAB */}

      <RescueOverviewTab scope={scope} />
      <RescueAppealTab scope={scope} />
      <RescueUpdatesTab scope={scope} />
      <RescueCompleteTab scope={scope} />
    </div>
  );
}
