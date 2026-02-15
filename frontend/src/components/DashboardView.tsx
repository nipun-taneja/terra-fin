"use client";

import { useState, useCallback, type ReactNode } from "react";
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
    Download,
    Award,
    FileText,
    MapPin,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { DashboardField, FarmConfig, FundingPathwayPayload } from "@/lib/types";

interface Props {
    farm: FarmConfig;
    fields: DashboardField[];
    onFieldsChange: (fields: DashboardField[]) => void;
    onBack: () => void;
    fundingData?: FundingPathwayPayload;
}

export default function DashboardView({ farm, fields, onFieldsChange, onBack, fundingData }: Props) {
    const [activeTab, setActiveTab] = useState(0);
    const [activeDrawerTab, setActiveDrawerTab] = useState<"overview" | "funding" | "verification" | "export">("overview");
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

    const handleDownloadJson = () => {
        const payload = {
            farm,
            generated_at: new Date().toISOString(),
            total_baseline_tco2e: totalBaseline,
            total_credits_usd: totalCredits,
            fields,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dashboard-report-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const handleDownloadCsv = () => {
        const header = [
            "field_name",
            "baseline_tco2e_y",
            "savings_low_tco2e",
            "savings_high_tco2e",
            "ndvi",
            "confidence_pct",
            "credit_balance_usd",
        ];
        const rows = fields.map((f) => [
            f.fieldName,
            (f.analysis?.audit.baseline_tco2e_y ?? 0).toFixed(2),
            (f.analysis?.reduction_summary.annual_tco2e_saved?.[0] ?? 0).toFixed(2),
            (f.analysis?.reduction_summary.annual_tco2e_saved?.[1] ?? 0).toFixed(2),
            (f.analysis?.satellite.ndvi_mean ?? 0).toFixed(3),
            (((f.analysis?.satellite.cropland_confidence ?? 0) * 100).toFixed(0)),
            String(f.creditBalance ?? 0),
        ]);
        const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `field-data-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const handleDownloadPdf = () => {
        // Lightweight fallback export for demo environments without a PDF generator.
        const summary = [
            "Credit Summary",
            `Farm: ${farm.farm_name}`,
            `Location: ${farm.state}${farm.country ? `, ${farm.country}` : ""}`,
            `Baseline Carbon Estimate: ${totalBaseline.toFixed(1)} tCO2e/yr`,
            `Estimated Credit Balance: $${totalCredits.toLocaleString()}`,
        ].join("\n");
        const blob = new Blob([summary], { type: "text/plain;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `credit-summary-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
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

    const fundingPayload = fundingData ?? getFallbackFundingPayload();
    const lowRiskMeasures = fundingPayload.recommended_measures.filter((m) => m.risk_level === "low").length;
    const topOffer = [...fundingPayload.offers.ranked_offers].sort(
        (a, b) => b.match_score_0_100 - a.match_score_0_100
    )[0];
    const verificationMilestones = [
        {
            step: 1,
            title: "Initial Assessment",
            detail: "Submit baseline data and implementation plans",
            duration: "1-2 weeks",
        },
        {
            step: 2,
            title: "Field Verification",
            detail: "On-site inspection and soil sampling",
            duration: "2-4 weeks",
        },
        {
            step: 3,
            title: "Certification",
            detail: "Receive verified carbon credit certification",
            duration: "3-6 weeks",
        },
    ];

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
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onBack}
                            className="px-3 md:px-4 py-2 text-xs md:text-sm btn-organic-secondary inline-flex items-center gap-1"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Back
                        </button>
                    </div>
                </div>
            </header>

            <div id="dashboard-main" className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
                <div className="glass-card p-4 md:p-5 border border-[#DCCFC2] shadow-[0_12px_20px_-12px_rgba(45,58,49,0.25)]">
                    <div className="flex items-center gap-6 overflow-x-auto">
                        {[
                            { id: "overview", label: "Overview" },
                            { id: "funding", label: "Funding Pathway" },
                            { id: "verification", label: "Verification" },
                            { id: "export", label: "Export" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveDrawerTab(tab.id as "overview" | "funding" | "verification" | "export")}
                                className={`pb-2 text-base whitespace-nowrap transition-colors border-b-2 ${activeDrawerTab === tab.id
                                    ? "text-[#2D3A31] border-[#2F8F68] font-semibold"
                                    : "text-[#7A8590] border-transparent"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {activeDrawerTab === "overview" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger-md">
                        <div className="glass-card card-lift p-6">
                            <div className="text-xs font-semibold tracking-[0.16em] uppercase text-muted mb-2">Baseline Carbon Estimate</div>
                            <div className="text-4xl font-display font-semibold financial-number">
                                {totalBaseline.toFixed(1)}
                                <span className="text-base font-body font-medium text-muted ml-2">tCO2e/yr</span>
                            </div>
                            <div className="mt-3 inline-flex items-center text-xs text-muted soft-pill px-2.5 py-1">
                                <Calendar className="h-3 w-3 mr-1" />
                                Updated: {lastComputed}
                            </div>
                        </div>

                        <div className="glass-card card-lift p-6 border-[#DCCFC2]">
                            <div className="text-xs font-semibold tracking-[0.16em] uppercase text-muted mb-2">Estimated Credit Balance</div>
                            <div className="flex items-end gap-2">
                                <span className="text-4xl font-display font-semibold financial-number text-[#2D3A31]">${totalCredits.toLocaleString()}</span>
                                <TrendingUp className="h-5 w-5 text-[#C27B66] mb-1" />
                            </div>
                            <div className="text-xs text-muted mt-1">Estimated annual value</div>
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
                )}

                <div id="dashboard-steps" className="glass-card card-lift overflow-hidden">
                    <div className="px-6 pt-6 pb-5 border-b border-[#E6E2DA]">
                        {activeDrawerTab === "verification" && (
                            <div className="rounded-2xl border border-[#E6E2DA] bg-[#F8F6F0] p-6">
                                <h3 className="font-display text-2xl md:text-3xl font-semibold text-[#2D3A31] mb-2">
                                    Verification Journey
                                </h3>
                                <p className="text-sm md:text-base text-muted leading-relaxed mb-5">
                                    Verify your project data to qualify for premium credit markets and program eligibility.
                                </p>
                                <div className="rounded-xl border border-[#E6E2DA] bg-white/75 p-4">
                                    <h4 className="text-sm font-semibold text-[#2D3A31] mb-2">Why This Matters</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted">
                                        <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-[#2F8F68]" /> Access premium carbon credit markets</div>
                                        <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-[#2F8F68]" /> Qualify for federal and state programs</div>
                                        <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-[#2F8F68]" /> Increase credit value potential</div>
                                        <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-[#2F8F68]" /> Build trust with credit buyers</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeDrawerTab === "funding" && (
                            <div className="space-y-6">
                                <div className="rounded-2xl border border-[#D9E5D8] bg-[#EFF6EF] p-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        <div>
                                            <h4 className="font-display text-2xl font-semibold text-[#2D3A31]">Funding Pathway</h4>
                                            <p className="text-sm text-[#4D5C54] mt-1">
                                                Action plan, evidence requirements, and ranked provider options based on your profile.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <span className="rounded-full border border-[#D5E3D4] bg-white/80 px-3 py-1 text-[#4E5C52]">
                                                Measures: {fundingPayload.recommended_measures.length}
                                            </span>
                                            <span className="rounded-full border border-[#D5E3D4] bg-white/80 px-3 py-1 text-[#4E5C52]">
                                                Low-risk quick wins: {lowRiskMeasures}
                                            </span>
                                            {topOffer && (
                                                <span className="rounded-full border border-[#D5E3D4] bg-white/80 px-3 py-1 text-[#4E5C52]">
                                                    Top match: {topOffer.provider_name} ({topOffer.match_score_0_100})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-[#E6E2DA] bg-white/70 p-5">
                                    <h5 className="font-display text-xl font-semibold text-[#2D3A31]">Recommended Actions</h5>
                                    <div className="mt-4 space-y-3">
                                        {fundingPayload.recommended_measures.map((measure, idx) => (
                                            <div key={`${measure.title}-${idx}`} className="rounded-xl border border-[#ECE7DE] bg-[#F8F6F0] p-4">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <h6 className="font-medium text-[#2D3A31]">{idx + 1}. {measure.title}</h6>
                                                    <span className={`text-xs px-2.5 py-1 rounded-full border ${
                                                        measure.risk_level === "low"
                                                            ? "border-[#BFDABF] bg-[#EAF7EA] text-[#2F8F68]"
                                                            : measure.risk_level === "medium"
                                                                ? "border-[#E8D7B8] bg-[#FFF7EA] text-[#946E2F]"
                                                                : "border-[#EBC6C6] bg-[#FFF1F1] text-[#A25252]"
                                                    }`}>
                                                        {measure.risk_level} risk
                                                    </span>
                                                </div>
                                                <p className="text-sm text-[#4D5C54] mt-2">{measure.why_it_helps}</p>
                                                <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                                                    <div className="rounded-lg border border-[#E7E2D8] bg-white/75 p-2">
                                                        <span className="text-muted">Fields:</span> {measure.field_names.join(", ") || "-"}
                                                    </div>
                                                    <div className="rounded-lg border border-[#E7E2D8] bg-white/75 p-2">
                                                        <span className="text-muted">CAPEX:</span> ${measure.capital_required_usd.low.toLocaleString()} - ${measure.capital_required_usd.high.toLocaleString()}
                                                    </div>
                                                    <div className="rounded-lg border border-[#E7E2D8] bg-white/75 p-2">
                                                        <span className="text-muted">Timeline:</span> {measure.timeline_months.min} - {measure.timeline_months.max} months
                                                    </div>
                                                    <div className="rounded-lg border border-[#E7E2D8] bg-white/75 p-2">
                                                        <span className="text-muted">Uplift:</span> +{measure.expected_credit_uplift_tco2e_per_year.low} to +{measure.expected_credit_uplift_tco2e_per_year.high} tCO2e/yr
                                                    </div>
                                                </div>
                                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                                    <div>
                                                        <div className="font-semibold text-[#2D3A31] mb-1">Implementation steps</div>
                                                        <ul className="space-y-1 text-[#4D5C54]">
                                                            {measure.implementation_steps.map((step) => (
                                                                <li key={step} className="flex items-start gap-2"><span className="text-[#2F8F68] mt-0.5">•</span>{step}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-[#2D3A31] mb-1">Verification evidence</div>
                                                        <ul className="space-y-1 text-[#4D5C54]">
                                                            {measure.verification_evidence.map((item) => (
                                                                <li key={item} className="flex items-start gap-2"><span className="text-[#2F8F68] mt-0.5">•</span>{item}</li>
                                                            ))}
                                                        </ul>
                                                        <div className="mt-2 text-[#6B766F]">
                                                            OPEX change: ${measure.annual_opex_change_usd.low.toLocaleString()} to ${measure.annual_opex_change_usd.high.toLocaleString()} / year
                                                        </div>
                                                    </div>
                                                </div>
                                                {measure.notes && measure.notes.length > 0 && (
                                                    <div className="mt-3 text-xs text-[#6B766F]">Notes: {measure.notes.join(" | ")}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                    <div className="rounded-2xl border border-[#E6E2DA] bg-white/70 p-5">
                                        <h5 className="font-display text-xl font-semibold text-[#2D3A31]">Next 30-60 Days</h5>
                                        <ul className="mt-3 space-y-2 text-sm text-[#4D5C54]">
                                            {fundingPayload.what_to_do_next.map((item) => (
                                                <li key={item} className="flex items-start gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-[#2F8F68] mt-0.5 flex-shrink-0" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="rounded-2xl border border-[#E6E2DA] bg-white/70 p-5">
                                        <h5 className="font-display text-xl font-semibold text-[#2D3A31]">Appraiser Evidence Checklist</h5>
                                        <ul className="mt-3 space-y-2 text-sm text-[#4D5C54]">
                                            {fundingPayload.appraiser_evidence_checklist.map((item) => (
                                                <li key={item} className="flex items-start gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-[#8C9A84] mt-0.5 flex-shrink-0" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-[#E6E2DA] bg-white/70 p-5">
                                    <h5 className="font-display text-xl font-semibold text-[#2D3A31]">Matched Offers</h5>
                                    <p className="text-xs text-[#6A766E] mt-1">{fundingPayload.offers.disclaimer}</p>
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                        {fundingPayload.offers.ranked_offers.map((offer) => (
                                            <div key={offer.provider_name} className="rounded-xl border border-[#ECE7DE] bg-[#F8F6F0] p-4">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="font-medium text-[#2D3A31]">{offer.provider_name}</div>
                                                    <span className="text-xs px-2 py-1 rounded-full border border-[#D9E5D8] bg-[#ECF6ED] text-[#2F8F68]">
                                                        Match {offer.match_score_0_100}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-[#6A766E] mt-1">{offer.offer_type}</div>
                                                {offer.best_for && <p className="text-sm text-[#4D5C54] mt-2">{offer.best_for}</p>}
                                                <div className="mt-2 text-xs text-[#5B6660]">
                                                    Advance: ${offer.estimated_terms.advance_usd_range[0].toLocaleString()} - ${offer.estimated_terms.advance_usd_range[1].toLocaleString()}
                                                </div>
                                                <div className="text-xs text-[#5B6660]">
                                                    APR: {offer.estimated_terms.apr_range[0]} - {offer.estimated_terms.apr_range[1]}%
                                                </div>
                                                <div className="text-xs text-[#5B6660]">
                                                    Tenor: {offer.estimated_terms.tenor_months_range[0]} - {offer.estimated_terms.tenor_months_range[1]} months
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {fundingPayload.notes.length > 0 && (
                                    <div className="rounded-2xl border border-[#E6E2DA] bg-[#F8F6F0] p-5">
                                        <h5 className="font-display text-lg font-semibold text-[#2D3A31]">Notes</h5>
                                        <ul className="mt-2 space-y-1 text-sm text-[#4D5C54]">
                                            {fundingPayload.notes.map((note) => (
                                                <li key={note} className="flex items-start gap-2"><span className="text-[#8C9A84] mt-0.5">•</span>{note}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeDrawerTab === "export" && (
                            <div className="space-y-6">
                                <h4 className="font-display text-2xl font-semibold text-[#2D3A31]">Export & Share</h4>
                                <p className="text-sm text-muted -mt-3">Download clean files for lenders, partners, and reporting workflows.</p>

                                <div className="space-y-4">
                                    <div className="rounded-2xl border border-[#E6E2DA] bg-[#F8F6F0] p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div>
                                            <h5 className="font-display text-lg font-semibold text-[#2D3A31]">Full Dashboard Data</h5>
                                            <p className="text-sm text-muted mt-1.5">All metrics, progress, and field-level outputs in one file</p>
                                        </div>
                                        <button
                                            onClick={handleDownloadJson}
                                            className="px-5 py-3 rounded-2xl border border-[#D8D3C8] bg-white/80 text-[#2D3A31] text-sm font-medium inline-flex items-center gap-3 hover:bg-white transition-colors self-start md:self-auto"
                                        >
                                            <Download className="h-5 w-5" />
                                            Export JSON
                                        </button>
                                    </div>

                                    <div className="rounded-2xl border border-[#E6E2DA] bg-[#F8F6F0] p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div>
                                            <h5 className="font-display text-lg font-semibold text-[#2D3A31]">Credit Snapshot</h5>
                                            <p className="text-sm text-muted mt-1.5">Baseline estimates and projected credit outcomes</p>
                                        </div>
                                        <button
                                            onClick={handleDownloadPdf}
                                            className="px-5 py-3 rounded-2xl border border-[#D8D3C8] bg-white/80 text-[#2D3A31] text-sm font-medium inline-flex items-center gap-3 hover:bg-white transition-colors self-start md:self-auto"
                                        >
                                            <Download className="h-5 w-5" />
                                            Export Summary
                                        </button>
                                    </div>

                                    <div className="rounded-2xl border border-[#E6E2DA] bg-[#F8F6F0] p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div>
                                            <h5 className="font-display text-lg font-semibold text-[#2D3A31]">Field Metrics</h5>
                                            <p className="text-sm text-muted mt-1.5">Detailed field-by-field values for analysis and sharing</p>
                                        </div>
                                        <button
                                            onClick={handleDownloadCsv}
                                            className="px-5 py-3 rounded-2xl border border-[#D8D3C8] bg-white/80 text-[#2D3A31] text-sm font-medium inline-flex items-center gap-3 hover:bg-white transition-colors self-start md:self-auto"
                                        >
                                            <Download className="h-5 w-5" />
                                            Export CSV
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {activeDrawerTab === "overview" && (
                        <>
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
                                        Reduction Action Plan
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
                        </>
                    )}

                    {activeDrawerTab === "verification" && (
                        <div className="p-6 space-y-6">
                            <div>
                                <h4 className="font-display text-2xl font-semibold text-[#2D3A31]">Verification Options</h4>
                                <div className="mt-4 space-y-3">
                                    <VerificationOptionCard
                                        icon={<FileText className="size-5 text-blue-600" />}
                                        iconBg="bg-blue-100"
                                        title="Baseline Verification"
                                        badge="Start Here"
                                        description="Establish your farm's current carbon baseline before implementing reduction strategies."
                                        meta="Timeline: 2-4 weeks | Cost: $500-$1,200"
                                    />
                                    <VerificationOptionCard
                                        icon={<MapPin className="size-5 text-purple-600" />}
                                        iconBg="bg-purple-100"
                                        title="Field Implementation Verification"
                                        badge="Next Step"
                                        description="Verify that carbon reduction practices have been implemented in the field."
                                        meta="Timeline: 3-6 weeks | Cost: $800-$2,000"
                                    />
                                    <VerificationOptionCard
                                        icon={<Award className="size-5 text-amber-600" />}
                                        iconBg="bg-amber-100"
                                        title="Full Credit Certification"
                                        badge="Market Ready"
                                        description="Complete verification and certification of carbon credits for market sale."
                                        meta="Timeline: 6-12 weeks | Cost: $1,500-$3,500"
                                    />
                                </div>
                            </div>

                            <div>
                                <h4 className="font-display text-2xl font-semibold text-[#2D3A31]">Verification Timeline</h4>
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {verificationMilestones.map((item, idx) => (
                                        <VerificationMilestoneCard
                                            key={item.step}
                                            step={item.step}
                                            title={item.title}
                                            detail={item.detail}
                                            duration={item.duration}
                                            isLast={idx === verificationMilestones.length - 1}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="font-display text-2xl font-semibold text-[#2D3A31]">Approved Verification Partners</h4>
                                <div className="mt-4 space-y-2">
                                    <VerificationPartnerRow
                                        name="USDA Climate Smart Verification"
                                        detail="Federal program partnership"
                                        tag="Recommended"
                                    />
                                    <VerificationPartnerRow
                                        name="California Carbon Verification Program"
                                        detail="State-certified verifiers"
                                        tag="State Program"
                                    />
                                    <VerificationPartnerRow
                                        name="Verra VCS Standard"
                                        detail="International certification"
                                        tag="Global Market"
                                    />
                                </div>
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

function VerificationMilestoneCard({
    step,
    title,
    detail,
    duration,
    isLast,
}: {
    step: number;
    title: string;
    detail: string;
    duration: string;
    isLast: boolean;
}) {
    return (
        <div className="relative rounded-xl border border-[#E6E2DA] bg-white/75 p-4">
            {!isLast && (
                <div className="hidden md:block absolute top-8 -right-3 w-6 h-[2px] bg-[#D7D2C8]" />
            )}
            <div className="flex items-center justify-between gap-2">
                <div className="h-9 w-9 rounded-full bg-[#E9E5DB] flex items-center justify-center text-sm font-semibold text-[#2D3A31]">
                    {step}
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-[#5E6A63] soft-pill px-2.5 py-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {duration}
                </span>
            </div>
            <div className="mt-3">
                <h5 className="font-display text-lg font-semibold text-[#2D3A31]">{title}</h5>
                <p className="text-sm text-muted mt-1">{detail}</p>
            </div>
        </div>
    );
}

function VerificationOptionCard({
    icon,
    iconBg,
    title,
    badge,
    description,
    meta,
}: {
    icon: ReactNode;
    iconBg: string;
    title: string;
    badge: string;
    description: string;
    meta: string;
}) {
    return (
        <div className="border border-[#E6E2DA] rounded-xl p-4 bg-white/70">
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
                    {icon}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-semibold text-[#2D3A31]">{title}</h5>
                        <span className="text-[11px] px-2 py-0.5 rounded-full border border-[#D8D3C8] text-[#6E776F]">{badge}</span>
                    </div>
                    <p className="text-sm text-muted mb-2">{description}</p>
                    <div className="text-xs text-muted">{meta}</div>
                </div>
            </div>
        </div>
    );
}

function VerificationPartnerRow({ name, detail, tag }: { name: string; detail: string; tag: string }) {
    return (
        <div className="flex items-center justify-between p-3 border border-[#E6E2DA] rounded-lg bg-white/60">
            <div>
                <p className="font-semibold text-[#2D3A31]">{name}</p>
                <p className="text-xs text-muted">{detail}</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-[#D8D3C8] text-[#6E776F]">{tag}</span>
        </div>
    );
}

function getFallbackFundingPayload(): FundingPathwayPayload {
    return {
        recommended_measures: [
            {
                title: "Split nitrogen applications + 4R nutrient management",
                why_it_helps: "Reduces N2O emissions by improving timing and avoiding excess nitrogen.",
                field_names: ["Maize", "Rice"],
                implementation_steps: [
                    "Split N into 2-3 applications by crop stage",
                    "Use soil/tissue tests where feasible",
                    "Log dates, rates, and products used",
                ],
                capital_required_usd: { low: 0, high: 1500 },
                annual_opex_change_usd: { low: -800, high: 200 },
                timeline_months: { min: 1, max: 3 },
                expected_credit_uplift_tco2e_per_year: { low: 0.3, high: 1.5 },
                verification_evidence: [
                    "Fertilizer purchase receipts",
                    "Application logs",
                    "Soil test report (optional)",
                ],
                risk_level: "low",
            },
            {
                title: "Irrigation scheduling + optional soil moisture sensors",
                why_it_helps: "Reduces pumping energy, water use, and can improve nitrogen efficiency.",
                field_names: ["Meth", "Fent"],
                implementation_steps: [
                    "Schedule irrigation based on weather and crop stage",
                    "Add moisture sensors in representative zones if feasible",
                    "Track irrigation runtimes/events",
                ],
                capital_required_usd: { low: 0, high: 5000 },
                annual_opex_change_usd: { low: -1500, high: 200 },
                timeline_months: { min: 1, max: 6 },
                expected_credit_uplift_tco2e_per_year: { low: 0.1, high: 0.8 },
                verification_evidence: [
                    "Irrigation or pump runtime logs",
                    "Sensor invoices (if used)",
                    "Field notes",
                ],
                risk_level: "low",
            },
        ],
        what_to_do_next: [
            "Choose 1-2 low-risk measures to implement in the next 30-60 days.",
            "Start a simple log: fertilizer, tillage operations, and irrigation events.",
            "Save receipts/invoices for any input or equipment changes.",
            "Schedule an appraiser visit after first verified practice change.",
        ],
        appraiser_evidence_checklist: [
            "Confirm field boundary/area and crop type",
            "Baseline fertilizer receipts and previous-season records",
            "Project-season fertilizer receipts + application log",
            "Tillage logs and optional fuel receipts",
            "Irrigation logs or pump runtime logs",
            "Photos of practice changes and field conditions",
        ],
        offers: {
            disclaimer: "Suggested providers/programs. Availability and eligibility vary by location and provider.",
            ranked_offers: [
                {
                    provider_name: "Carbon by Indigo",
                    provider_category: "carbon_program_marketplace",
                    offer_type: "carbon_program_enrollment",
                    best_for: "Enrollment to generate, verify, and sell ag carbon credits",
                    match_score_0_100: 85,
                    why_ranked: ["Strong fit for ag carbon project enrollment"],
                    estimated_terms: {
                        advance_usd_range: [0, 0],
                        apr_range: [0, 0],
                        tenor_months_range: [0, 0],
                        repayment_source: "n/a",
                    },
                    requirements: ["Field boundaries", "Practice history"],
                    what_to_send: ["Field boundaries", "Practice logs"],
                    next_steps: ["Check eligibility and enrollment timeline"],
                    risks_and_notes: ["Program availability varies by region"],
                    links: {},
                },
                {
                    provider_name: "CoBank",
                    provider_category: "bank_lender",
                    offer_type: "financing",
                    best_for: "Ag co-ops and larger operators",
                    match_score_0_100: 75,
                    why_ranked: ["Good alignment with conservation-linked financing"],
                    estimated_terms: {
                        advance_usd_range: [5000, 50000],
                        apr_range: [6, 13],
                        tenor_months_range: [12, 60],
                        repayment_source: "farm_cashflow_or_credit_proceeds",
                    },
                    requirements: ["Basic farm financials", "Practice plan / projected cashflow"],
                    what_to_send: ["Farm summary", "Field/practice plan", "Input logs"],
                    next_steps: ["Contact and ask about sustainability-linked ag credit"],
                    risks_and_notes: ["Terms depend on underwriting"],
                    links: {},
                },
            ],
        },
        notes: [
            "Fallback payload shown until backend wiring is attached.",
            "Capital estimates and offer terms are approximate ranges for MVP purposes.",
        ],
    };
}
