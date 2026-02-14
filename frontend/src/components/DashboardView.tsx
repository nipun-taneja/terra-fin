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
    ArrowLeft,
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
    onBack: () => void;
    onEditReanalyze: () => void;
}

export default function DashboardView({ farm, fields, onFieldsChange, onBack, onEditReanalyze }: Props) {
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
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="glass-card text-center space-y-4 p-10 max-w-md w-full">
                    <Leaf className="h-12 w-12 text-[#8C9A84] mx-auto" strokeWidth={1.5} />
                    <h2 className="font-display text-3xl font-semibold">No Fields Yet</h2>
                    <p className="text-sm text-muted">Add your first field to begin analysis.</p>
                </div>
            </div>
        );
    }

    const completedSteps = activeField.steps.filter((s) => s.completed).length;
    const completionPct = activeField.steps.length > 0 ? (completedSteps / activeField.steps.length) * 100 : 0;

    return (
        <div className="min-h-screen botanical-reveal">
            <header className="sticky top-0 z-30 border-b border-[#E6E2DA] bg-[#F9F8F4]/90 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full soft-pill flex items-center justify-center">
                            <Leaf className="h-5 w-5 text-[#8C9A84]" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h1 className="font-display text-2xl md:text-3xl font-semibold leading-tight">{farm.farm_name}</h1>
                            <p className="text-sm text-muted">{farm.state}{farm.country ? `, ${farm.country}` : ""}</p>
                        </div>
                    </div>
                    <button
                        onClick={onBack}
                        className="px-3 md:px-4 py-2 text-xs md:text-sm btn-organic-secondary inline-flex items-center gap-1"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                    </button>
                </div>
            </header>

            <div id="dashboard-main" className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
                <div className="flex items-center justify-between gap-3">
                    <a href="#dashboard-steps" className="text-xs btn-organic-secondary px-3 py-1.5 inline-flex items-center gap-1">
                        <ChevronDown className="h-3.5 w-3.5" /> Scroll Down
                    </a>
                    <button onClick={onEditReanalyze} className="text-xs btn-organic-secondary px-3 py-1.5">
                        Edit Fields and Re-analyze
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger-md">
                    <div className="glass-card card-lift p-6">
                        <div className="text-xs font-semibold tracking-[0.16em] uppercase text-muted mb-2">Baseline Carbon Estimate</div>
                        <div className="text-4xl font-display font-semibold financial-number">
                            {totalBaseline.toFixed(1)}
                            <span className="text-base font-body font-medium text-muted ml-2">tCO2e/yr</span>
                        </div>
                        <div className="mt-3 inline-flex items-center text-xs text-muted soft-pill px-2.5 py-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            Last computed: {lastComputed}
                        </div>
                    </div>

                    <div className="glass-card card-lift p-6 border-[#DCCFC2]">
                        <div className="text-xs font-semibold tracking-[0.16em] uppercase text-muted mb-2">Estimated Credit Balance</div>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-display font-semibold financial-number text-[#2D3A31]">${totalCredits.toLocaleString()}</span>
                            <TrendingUp className="h-5 w-5 text-[#C27B66] mb-1" />
                        </div>
                        <div className="text-xs text-muted mt-1">Annual projected value</div>
                    </div>

                    <div className="glass-card card-lift p-5">
                        <div className="text-xs font-semibold tracking-[0.16em] uppercase text-muted mb-2 flex items-center gap-1">
                            <BarChart3 className="h-3.5 w-3.5" /> Credit Timeline
                        </div>
                        <div className="h-24">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={activeField?.timeline || []}>
                                    <defs>
                                        <linearGradient id="ecoGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8C9A84" stopOpacity={0.45} />
                                            <stop offset="95%" stopColor="#C27B66" stopOpacity={0.06} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#7A847E" }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: "14px",
                                            fontSize: "12px",
                                            background: "#fff",
                                            border: "1px solid #E6E2DA",
                                            color: "#2D3A31",
                                        }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#8C9A84" fill="url(#ecoGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div id="dashboard-steps" className="glass-card card-lift overflow-hidden">
                    <div className="px-6 pt-6 pb-5 border-b border-[#E6E2DA]">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm text-muted">Net Zero Progress</div>
                            <div className="text-xs text-muted">
                                {completedSteps}/{activeField.steps.length} actions complete
                            </div>
                        </div>
                        <div className="mt-3 h-2.5 rounded-full bg-[#EFEAE1] overflow-hidden">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${completionPct}%`,
                                    background: "linear-gradient(90deg, #8C9A84 0%, #C27B66 100%)",
                                    transition: "width 500ms ease-out",
                                }}
                            />
                        </div>
                        <div className="mt-3 flex gap-2">
                            <span className="px-3 py-1 text-[11px] rounded-full border border-[#8C9A84]/50 text-[#6F7D73] bg-[#8C9A84]/10">EQIP Active</span>
                            <span className="px-3 py-1 text-[11px] rounded-full border border-[#C27B66]/45 text-[#A46958] bg-[#C27B66]/10">CSP Active</span>
                        </div>
                    </div>

                    <div className="flex border-b border-[#E6E2DA] overflow-x-auto">
                        {fields.map((f, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveTab(i)}
                                className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${i === activeTab
                                    ? "border-[#8C9A84] text-[#2D3A31] bg-[#8C9A84]/10"
                                    : "border-transparent text-muted hover:text-[#2D3A31] hover:bg-[#DCCFC2]/25"
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

                            <h3 className="font-display text-2xl font-semibold mb-4 flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-[#8C9A84]" />
                                Emissions Reduction Steps
                            </h3>
                            <div className="space-y-3">
                                {activeField.steps.map((step) => (
                                    <div key={step.id} className="border border-[#E6E2DA] rounded-3xl overflow-hidden bg-white/75 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_15px_-3px_rgba(45,58,49,0.05)]">
                                        <div className="flex items-center gap-3 px-4 py-3">
                                            <button onClick={() => toggleStep(activeTab, step.id)} className="flex-shrink-0">
                                                {step.completed ? (
                                                    <CheckCircle2 className="h-5 w-5 text-[#8C9A84]" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-[#9EA79E] hover:text-[#8C9A84] transition-colors" />
                                                )}
                                            </button>
                                            <button
                                                className="flex-1 text-left"
                                                onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                                            >
                                                <span className={`text-sm font-medium ${step.completed ? "line-through text-muted" : "text-[#2D3A31]"}`}>
                                                    {step.title}
                                                </span>
                                            </button>
                                            <button onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}>
                                                {expandedStep === step.id ? (
                                                    <ChevronUp className="h-4 w-4 text-[#7E8882]" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 text-[#7E8882]" />
                                                )}
                                            </button>
                                        </div>

                                        {expandedStep === step.id && (
                                            <div className="px-4 pb-4 pt-0 ml-8 text-sm space-y-3 border-t border-[#E6E2DA]">
                                                <p className="text-muted pt-3">{step.description}</p>
                                                <div>
                                                    <span className="text-xs font-semibold tracking-[0.12em] uppercase text-muted">Tips / Actions</span>
                                                    <ul className="mt-1 space-y-1">
                                                        {step.tips.map((t, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-muted">
                                                                <span className="text-[#8C9A84] mt-0.5">•</span> {t}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold tracking-[0.12em] uppercase text-muted">Expected Impact:</span>
                                                    <span className="text-xs text-[#6F7D73] bg-[#8C9A84]/12 px-2 py-0.5 rounded-full font-medium border border-[#8C9A84]/35">{step.expectedImpact}</span>
                                                </div>
                                                <div className="text-xs text-muted italic">Evidence upload (coming soon)</div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 text-xs text-muted">
                                {activeField.steps.filter((s) => s.completed).length} of {activeField.steps.length} steps completed
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-card px-5 py-3 rounded-2xl flex items-center gap-3 text-sm animate-slide-up">
                    <CheckCircle2 className="h-4 w-4 text-[#8C9A84] flex-shrink-0" />
                    <span className="text-muted">{toast.msg}</span>
                    <button
                        onClick={handleUndo}
                        className="flex items-center gap-1 text-[#A46958] hover:text-[#2D3A31] font-medium transition-colors"
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
          animation: slide-up 0.4s ease-out;
        }
      `}</style>
        </div>
    );
}

function MetricPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-3xl px-3 py-3 border border-[#E6E2DA] bg-[#F7F4EE]">
            <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted">{label}</div>
            <div className="text-sm font-semibold text-[#2D3A31] mt-0.5 financial-number">{value}</div>
        </div>
    );
}
