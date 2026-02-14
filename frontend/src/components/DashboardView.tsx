"use client";

import { useState, useCallback } from "react";
import {
    TrendingUp,
    Calendar,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Circle,
    Undo2,
    Leaf,
    BarChart3,
    Plus,
    RefreshCw,

} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { DashboardField, FarmConfig } from "@/lib/types";

interface Props {
    farm: FarmConfig;
    fields: DashboardField[];
    onFieldsChange: (fields: DashboardField[]) => void;
}

export default function DashboardView({ farm, fields, onFieldsChange }: Props) {
    const [activeTab, setActiveTab] = useState(0);
    const [expandedStep, setExpandedStep] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; undoIdx: number; stepId: string } | null>(null);
    const [toastTimeout, setToastTimeout] = useState<NodeJS.Timeout | null>(null);

    const activeField = fields[activeTab];

    // Totals across all fields
    const totalBaseline = fields.reduce(
        (sum, f) => sum + (f.analysis?.audit.baseline_tco2e_y ?? 0),
        0
    );
    const totalCredits = fields.reduce((sum, f) => sum + f.creditBalance, 0);

    // Latest timestamp
    const lastComputed = new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });

    const toggleStep = useCallback(
        (fieldIdx: number, stepId: string) => {
            const updated = [...fields];
            const field = { ...updated[fieldIdx] };
            const stepIdx = field.steps.findIndex((s) => s.id === stepId);
            if (stepIdx === -1) return;

            const wasCompleted = field.steps[stepIdx].completed;
            const newSteps = [...field.steps];
            newSteps[stepIdx] = { ...newSteps[stepIdx], completed: !wasCompleted };
            field.steps = newSteps;

            // Optimistic credit update
            if (!wasCompleted) {
                field.creditBalance = Math.round(field.creditBalance * 1.08);
                field.timeline = [
                    ...field.timeline,
                    {
                        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                        value: field.creditBalance,
                    },
                ];
            } else {
                field.creditBalance = Math.round(field.creditBalance / 1.08);
                field.timeline = field.timeline.slice(0, -1);
            }

            updated[fieldIdx] = field;
            onFieldsChange(updated);

            if (!wasCompleted) {
                // Show undo toast
                if (toastTimeout) clearTimeout(toastTimeout);
                setToast({ msg: "Step completed — projected credits updated", undoIdx: fieldIdx, stepId });
                const t = setTimeout(() => setToast(null), 5000);
                setToastTimeout(t);
            }
        },
        [fields, onFieldsChange, toastTimeout]
    );

    const handleUndo = () => {
        if (!toast) return;
        toggleStep(toast.undoIdx, toast.stepId);
        setToast(null);
        if (toastTimeout) clearTimeout(toastTimeout);
    };

    if (fields.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Leaf className="h-12 w-12 text-slate-300 mx-auto" />
                    <h2 className="text-xl font-semibold text-slate-600">No fields yet</h2>
                    <p className="text-sm text-slate-400">Add your first field to see your dashboard</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top Nav */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                            <Leaf className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-900 text-sm">{farm.farm_name}</h1>
                            <p className="text-xs text-slate-400">{farm.state}{farm.country ? `, ${farm.country}` : ""}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 transition-colors px-3 py-2 rounded-lg hover:bg-slate-50">
                            <Plus className="h-3 w-3" /> Add Field
                        </button>
                        <button className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 transition-colors px-3 py-2 rounded-lg hover:bg-slate-50">
                            <RefreshCw className="h-3 w-3" /> Re-analyze
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
                {/* ── Summary Band ───────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Baseline */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Baseline Carbon Estimate</div>
                        <div className="text-3xl font-bold text-slate-900">
                            {totalBaseline.toFixed(1)}{" "}
                            <span className="text-base font-normal text-slate-400">tCO₂e/yr</span>
                        </div>
                        <div className="mt-2 inline-flex items-center text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                            <Calendar className="h-3 w-3 mr-1" />
                            Last computed: {lastComputed}
                        </div>
                    </div>

                    {/* Credit Balance */}
                    <div className="bg-emerald-600 rounded-2xl p-5 text-white">
                        <div className="text-xs font-medium text-emerald-200 uppercase tracking-wide mb-1">Est. Carbon Credit Balance</div>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold">${totalCredits.toLocaleString()}</span>
                            <TrendingUp className="h-5 w-5 text-emerald-200 mb-1" />
                        </div>
                        <div className="text-xs text-emerald-200 mt-1">Annual projected value</div>
                    </div>

                    {/* Timeline Chart */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-4">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" /> Credit Balance Timeline
                        </div>
                        <div className="h-20">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={activeField?.timeline || []}>
                                    <defs>
                                        <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                                    <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#emeraldGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* ── Field Tabs ─────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    {/* Tab Bar */}
                    <div className="flex border-b border-slate-100 overflow-x-auto">
                        {fields.map((f, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveTab(i)}
                                className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${i === activeTab
                                    ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
                                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                    }`}
                            >
                                {f.fieldName}
                            </button>
                        ))}
                    </div>

                    {/* Active Field Content */}
                    {activeField && (
                        <div className="p-6">
                            {/* Field Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                                <MetricPill label="Baseline" value={`${activeField.analysis?.audit.baseline_tco2e_y.toFixed(1)} tCO₂e`} />
                                <MetricPill label="Savings" value={`${activeField.analysis?.reduction_summary.annual_tco2e_saved[0].toFixed(1)}–${activeField.analysis?.reduction_summary.annual_tco2e_saved[1].toFixed(1)} tCO₂e`} />
                                <MetricPill label="NDVI" value={`${activeField.analysis?.satellite.ndvi_mean.toFixed(2)}`} />
                                <MetricPill label="Confidence" value={`${((activeField.analysis?.satellite.cropland_confidence ?? 0) * 100).toFixed(0)}%`} />
                            </div>

                            {/* Steps */}
                            <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                Steps to Reduce Emissions
                            </h3>
                            <div className="space-y-2">
                                {activeField.steps.map((step) => (
                                    <div key={step.id} className="border border-slate-100 rounded-xl overflow-hidden">
                                        {/* Step Header */}
                                        <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                                            <button
                                                onClick={() => toggleStep(activeTab, step.id)}
                                                className="flex-shrink-0"
                                            >
                                                {step.completed ? (
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-slate-300 hover:text-emerald-400 transition-colors" />
                                                )}
                                            </button>
                                            <button
                                                className="flex-1 text-left"
                                                onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                                            >
                                                <span className={`text-sm font-medium ${step.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
                                                    {step.title}
                                                </span>
                                            </button>
                                            <button onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}>
                                                {expandedStep === step.id ? (
                                                    <ChevronUp className="h-4 w-4 text-slate-400" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Expanded Detail */}
                                        {expandedStep === step.id && (
                                            <div className="px-4 pb-4 pt-0 ml-8 text-sm space-y-3 border-t border-slate-50">
                                                <p className="text-slate-600 pt-3">{step.description}</p>
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tips / Actions</span>
                                                    <ul className="mt-1 space-y-1">
                                                        {step.tips.map((t, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-slate-600">
                                                                <span className="text-emerald-500 mt-0.5">•</span> {t}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Expected Impact:</span>
                                                    <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">{step.expectedImpact}</span>
                                                </div>
                                                <div className="text-xs text-slate-400 italic">Evidence upload (coming soon)</div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Completed count */}
                            <div className="mt-4 text-xs text-slate-400">
                                {activeField.steps.filter((s) => s.completed).length} of {activeField.steps.length} steps completed
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Toast ────────────────────────────────── */}
            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm animate-slide-up">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span>{toast.msg}</span>
                    <button
                        onClick={handleUndo}
                        className="flex items-center gap-1 text-emerald-300 hover:text-white font-medium transition-colors"
                    >
                        <Undo2 className="h-3.5 w-3.5" /> Undo
                    </button>
                </div>
            )}

            <style jsx>{`
        @keyframes slide-up {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
        </div>
    );
}

function MetricPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-slate-50 rounded-xl px-3 py-2.5">
            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</div>
            <div className="text-sm font-semibold text-slate-800 mt-0.5">{value}</div>
        </div>
    );
}
