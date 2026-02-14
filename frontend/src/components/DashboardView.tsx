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

    const totalBaseline = fields.reduce(
        (sum, f) => sum + (f.analysis?.audit.baseline_tco2e_y ?? 0),
        0
    );
    const totalCredits = fields.reduce((sum, f) => sum + f.creditBalance, 0);

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
                if (toastTimeout) clearTimeout(toastTimeout);
                setToast({ msg: "Step completed - projected credits updated", undoIdx: fieldIdx, stepId });
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
                <div className="glass-card text-center space-y-4 p-8">
                    <Leaf className="h-12 w-12 text-white/40 mx-auto" />
                    <h2 className="text-xl font-semibold text-white/90">No fields yet</h2>
                    <p className="text-sm text-white/60">Add your first field to see your dashboard</p>
                </div>
            </div>
        );
    }

    const completedSteps = activeField.steps.filter((s) => s.completed).length;
    const completionPct = activeField.steps.length > 0 ? (completedSteps / activeField.steps.length) * 100 : 0;

    return (
        <div className="min-h-screen">
            <header className="glass-card sticky top-0 z-30 rounded-none border-x-0 border-t-0">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg glass-secondary border border-emerald-400/50 flex items-center justify-center">
                            <Leaf className="h-4 w-4 text-emerald-300" />
                        </div>
                        <div>
                            <h1 className="font-bold text-white text-sm">{farm.farm_name}</h1>
                            <p className="text-xs text-white/60">{farm.state}{farm.country ? `, ${farm.country}` : ""}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="text-xs text-white/70 hover:text-emerald-300 flex items-center gap-1 transition-colors px-3 py-2 rounded-full glass-secondary">
                            <Plus className="h-3 w-3" /> Add Field
                        </button>
                        <button className="text-xs text-white/70 hover:text-cyan-300 flex items-center gap-1 transition-colors px-3 py-2 rounded-full glass-secondary">
                            <RefreshCw className="h-3 w-3" /> Re-analyze
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-card p-5">
                        <div className="text-xs font-medium text-white/60 uppercase mb-1">Baseline Carbon Estimate</div>
                        <div className="text-3xl font-bold text-white financial-number">
                            {totalBaseline.toFixed(1)}{" "}
                            <span className="text-base font-normal text-white/50">tCO2e/yr</span>
                        </div>
                        <div className="mt-2 inline-flex items-center text-xs text-white/60 glass-secondary px-2 py-1 rounded-md">
                            <Calendar className="h-3 w-3 mr-1" />
                            Last computed: {lastComputed}
                        </div>
                    </div>

                    <div className="glass-card p-5 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-60" style={{ background: "var(--gradient-eco)" }} />
                        <div className="relative">
                            <div className="text-xs font-medium text-emerald-200 uppercase mb-1">Est. Carbon Credit Balance</div>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold text-emerald-100 financial-number">${totalCredits.toLocaleString()}</span>
                                <TrendingUp className="h-5 w-5 text-emerald-200 mb-1" />
                            </div>
                            <div className="text-xs text-emerald-200 mt-1">Annual projected value</div>
                        </div>
                    </div>

                    <div className="glass-card p-4">
                        <div className="text-xs font-medium text-white/60 uppercase mb-2 flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" /> Credit Balance Timeline
                        </div>
                        <div className="h-20">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={activeField?.timeline || []}>
                                    <defs>
                                        <linearGradient id="ecoGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                                            <stop offset="65%" stopColor="#06b6d4" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)" }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px", background: "rgba(23,23,23,0.92)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }} />
                                    <Area type="monotone" dataKey="value" stroke="#4ade80" fill="url(#ecoGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="glass-card overflow-hidden">
                    <div className="px-6 pt-5 pb-4 border-b border-white/10">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm text-white/70">Net Zero Progress</div>
                            <div className="text-xs text-emerald-200">
                                {completedSteps}/{activeField.steps.length} actions complete
                            </div>
                        </div>
                        <div className="mt-2 h-2.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${completionPct}%`,
                                    background: "linear-gradient(90deg, #22c55e 0%, #06b6d4 100%)",
                                    boxShadow: "0 0 16px rgba(34,197,94,0.45)",
                                    transition: "width 300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                                }}
                            />
                        </div>
                        <div className="mt-3 flex gap-2">
                            <span className="px-3 py-1 text-[11px] rounded-full border border-emerald-300/60 text-emerald-200 shadow-[0_0_16px_rgba(34,197,94,0.3)]">
                                EQIP Active
                            </span>
                            <span className="px-3 py-1 text-[11px] rounded-full border border-cyan-300/60 text-cyan-200 shadow-[0_0_16px_rgba(6,182,212,0.3)]">
                                CSP Active
                            </span>
                        </div>
                    </div>

                    <div className="flex border-b border-white/10 overflow-x-auto">
                        {fields.map((f, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveTab(i)}
                                className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${i === activeTab
                                    ? "border-emerald-400 text-emerald-200 bg-emerald-500/10"
                                    : "border-transparent text-white/60 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                {f.fieldName}
                            </button>
                        ))}
                    </div>

                    {activeField && (
                        <div className="p-6">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                                <MetricPill label="Baseline" value={`${activeField.analysis?.audit.baseline_tco2e_y.toFixed(1)} tCO2e`} />
                                <MetricPill label="Savings" value={`${activeField.analysis?.reduction_summary.annual_tco2e_saved[0].toFixed(1)}-${activeField.analysis?.reduction_summary.annual_tco2e_saved[1].toFixed(1)} tCO2e`} />
                                <MetricPill label="NDVI" value={`${activeField.analysis?.satellite.ndvi_mean.toFixed(2)}`} />
                                <MetricPill label="Confidence" value={`${((activeField.analysis?.satellite.cropland_confidence ?? 0) * 100).toFixed(0)}%`} />
                            </div>

                            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                                Steps to Reduce Emissions
                            </h3>
                            <div className="space-y-2">
                                {activeField.steps.map((step) => (
                                    <div key={step.id} className="border border-white/10 rounded-xl overflow-hidden bg-black/15">
                                        <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                                            <button
                                                onClick={() => toggleStep(activeTab, step.id)}
                                                className="flex-shrink-0"
                                            >
                                                {step.completed ? (
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-white/35 hover:text-emerald-300 transition-colors" />
                                                )}
                                            </button>
                                            <button
                                                className="flex-1 text-left"
                                                onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                                            >
                                                <span className={`text-sm font-medium ${step.completed ? "line-through text-white/40" : "text-white/90"}`}>
                                                    {step.title}
                                                </span>
                                            </button>
                                            <button onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}>
                                                {expandedStep === step.id ? (
                                                    <ChevronUp className="h-4 w-4 text-white/45" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 text-white/45" />
                                                )}
                                            </button>
                                        </div>

                                        {expandedStep === step.id && (
                                            <div className="px-4 pb-4 pt-0 ml-8 text-sm space-y-3 border-t border-white/10">
                                                <p className="text-white/70 pt-3">{step.description}</p>
                                                <div>
                                                    <span className="text-xs font-medium text-white/55 uppercase">Tips / Actions</span>
                                                    <ul className="mt-1 space-y-1">
                                                        {step.tips.map((t, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-white/70">
                                                                <span className="text-emerald-300 mt-0.5">•</span> {t}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-white/55 uppercase">Expected Impact:</span>
                                                    <span className="text-xs text-emerald-200 bg-emerald-500/20 px-2 py-0.5 rounded-full font-medium border border-emerald-400/35">{step.expectedImpact}</span>
                                                </div>
                                                <div className="text-xs text-white/45 italic">Evidence upload (coming soon)</div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 text-xs text-white/50">
                                {activeField.steps.filter((s) => s.completed).length} of {activeField.steps.length} steps completed
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-card text-white px-5 py-3 rounded-xl flex items-center gap-3 text-sm animate-slide-up">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300 flex-shrink-0" />
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
        <div className="glass-secondary rounded-xl px-3 py-2.5">
            <div className="text-[10px] font-medium text-white/55 uppercase">{label}</div>
            <div className="text-sm font-semibold text-white mt-0.5 financial-number">{value}</div>
        </div>
    );
}
