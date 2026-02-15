"use client";

import { useState } from "react";
import {
    ShieldCheck,
    ShieldAlert,
    Loader2,
    HelpCircle,
    ArrowRight,
    User,
    Mail,
    Phone,
    MapPin,
    Sparkles,
    X,
} from "lucide-react";
import { FarmerIdentity, CRSResponse } from "@/lib/types";
import { verifyCRS } from "@/lib/api";

type VerifyState = "idle" | "loading" | "success" | "error";

interface Props {
    onVerified: (identity?: FarmerIdentity) => void;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function findArrayLengthByKey(input: unknown, targetKeys: string[]): number | null {
    const keySet = new Set(targetKeys.map((k) => k.toLowerCase()));
    const stack: unknown[] = [input];

    while (stack.length > 0) {
        const current = stack.pop();
        if (Array.isArray(current)) {
            for (const item of current) stack.push(item);
            continue;
        }
        const rec = asRecord(current);
        if (!rec) continue;
        for (const [key, value] of Object.entries(rec)) {
            if (keySet.has(key.toLowerCase()) && Array.isArray(value)) return value.length;
            stack.push(value);
        }
    }
    return null;
}

function findFirstStringByKey(input: unknown, targetKeys: string[]): string | null {
    const keySet = new Set(targetKeys.map((k) => k.toLowerCase()));
    const stack: unknown[] = [input];

    while (stack.length > 0) {
        const current = stack.pop();
        if (Array.isArray(current)) {
            for (const item of current) stack.push(item);
            continue;
        }
        const rec = asRecord(current);
        if (!rec) continue;
        for (const [key, value] of Object.entries(rec)) {
            if (keySet.has(key.toLowerCase()) && typeof value === "string" && value.trim()) return value;
            stack.push(value);
        }
    }
    return null;
}

function findFirstArrayByKey(input: unknown, targetKeys: string[]): unknown[] | null {
    const keySet = new Set(targetKeys.map((k) => k.toLowerCase()));
    const stack: unknown[] = [input];

    while (stack.length > 0) {
        const current = stack.pop();
        if (Array.isArray(current)) {
            for (const item of current) stack.push(item);
            continue;
        }
        const rec = asRecord(current);
        if (!rec) continue;
        for (const [key, value] of Object.entries(rec)) {
            if (keySet.has(key.toLowerCase()) && Array.isArray(value)) return value;
            stack.push(value);
        }
    }
    return null;
}

function parseNumericScore(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const n = Number(value.trim());
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function findBureauScoreFromReport(report: unknown): number | null {
    const scores = findFirstArrayByKey(report, ["scores", "creditScores"]);
    if (!scores || scores.length === 0) return null;

    // Prefer models that look like primary bureau risk scores (e.g., Vantage/FICO),
    // then fallback to the first parseable scoreValue/score.
    const preferred = scores.find((item) => {
        const rec = asRecord(item);
        if (!rec) return false;
        const modelName = String(rec.modelName ?? rec.modelNameType ?? "").toLowerCase();
        return modelName.includes("vantage") || modelName.includes("fico");
    });

    const candidates = preferred ? [preferred, ...scores] : scores;
    for (const item of candidates) {
        const rec = asRecord(item);
        if (!rec) continue;
        const parsed =
            parseNumericScore(rec.scoreValue) ??
            parseNumericScore(rec.score) ??
            parseNumericScore(rec.value);
        if (parsed !== null) return parsed;
    }
    return null;
}

export default function RegisterView({ onVerified }: Props) {
    const [form, setForm] = useState<FarmerIdentity>({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
    });
    const [errors, setErrors] = useState<Partial<Record<keyof FarmerIdentity, string>>>({});
    const [state, setState] = useState<VerifyState>("idle");
    const [crsResult, setCrsResult] = useState<CRSResponse | null>(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const [showImproveModal, setShowImproveModal] = useState(false);
    const [formStep, setFormStep] = useState(0);

    const validate = (): boolean => {
        const e: typeof errors = {};
        if (!form.firstName.trim()) e.firstName = "First name is required";
        if (!form.lastName.trim()) e.lastName = "Last name is required";
        if (!form.email.trim()) e.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
        if (!form.phone.trim()) e.phone = "Phone number is required";
        if (!form.address.trim()) e.address = "Address is required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setState("loading");
        try {
            const res = await verifyCRS({
                farmer_name: `${form.firstName} ${form.lastName}`.trim(),
                first_name: form.firstName.trim(),
                last_name: form.lastName.trim(),
                address: form.address.trim(),
                email: form.email,
                phone: form.phone,
                country: form.address,
            });
            setCrsResult(res);
            if (res.credible) {
                setState("success");
            } else {
                setState("error");
            }
        } catch {
            setState("error");
        }
    };

    const goNextStep = () => {
        const stepErrors: typeof errors = {};
        if (!form.firstName.trim()) stepErrors.firstName = "First name is required";
        if (!form.lastName.trim()) stepErrors.lastName = "Last name is required";
        if (!form.email.trim()) stepErrors.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(form.email)) stepErrors.email = "Enter a valid email";
        setErrors((prev) => ({ ...prev, ...stepErrors }));
        if (Object.keys(stepErrors).length === 0) setFormStep(1);
    };

    const inputClass = (field: keyof FarmerIdentity) =>
        `w-full pl-11 pr-4 text-sm glass-input outline-none transition-all ${errors[field]
            ? "border-[#C27B66] focus:shadow-[0_0_0_2px_rgba(194,123,102,0.22)]"
            : "focus:border-[#8C9A84]"
        }`;

    const reportScore = findBureauScoreFromReport(crsResult?.report);
    const tradelineCount = findArrayLengthByKey(crsResult?.report, ["tradelines", "tradeLines", "tradeLine"]);
    const inquiryCount = findArrayLengthByKey(crsResult?.report, ["inquiries", "inquiry"]);
    const publicRecordCount = findArrayLengthByKey(crsResult?.report, ["publicRecords", "publicRecord"]);
    const reportedName =
        findFirstStringByKey(crsResult?.report, ["fullName", "consumerName"]) ||
        `${form.firstName} ${form.lastName}`.trim();
    const welcomeFirstName = (reportedName.split(" ").find(Boolean) || form.firstName || "Farmer").trim();
    const bureauName = findFirstStringByKey(crsResult?.report, ["sourceType"]) || "Experian";
    const scorePct = Math.max(0, Math.min(100, Math.round((crsResult?.score ?? 0) * 100)));
    const donutStyle = {
        background: `conic-gradient(#8C9A84 0% ${scorePct}%, #E6E2DA ${scorePct}% 100%)`,
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-10 md:py-16 botanical-reveal">
            <div className="w-full max-w-xl">
                <div className="glass-card card-lift p-6 md:p-8 space-y-5">
                    {state === "success" ? (
                        <div className="py-2 space-y-4">
                            <div className="rounded-3xl border border-[#D8D3C8] bg-gradient-to-br from-[#F8F6F0] to-[#ECE8DE] p-4 md:p-5">
                                <div className="flex items-center gap-3">
                                    <div className="relative h-28 w-28 shrink-0 rounded-full p-2" style={donutStyle}>
                                        <div className="h-full w-full rounded-full bg-[#F9F8F4] border border-[#E6E2DA] flex flex-col items-center justify-center">
                                            <ShieldCheck className="h-5 w-5 text-[#8C9A84]" />
                                            <span className="text-lg font-semibold leading-tight">{scorePct}%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="inline-flex items-center gap-1 text-[#6F7D73] text-xs font-semibold tracking-[0.08em] uppercase">
                                            <Sparkles className="h-3.5 w-3.5" />
                                            <span className="text-sm font-bold text-[#2D3A31]">Identity Verified by CRS</span>
                                        </div>
                                        <h3 className="font-display text-2xl leading-tight font-semibold">
                                            Welcome {welcomeFirstName},
                                        </h3>
                                        <p className="text-sm text-muted">We use <span className="font-semibold text-[#2D3A31]">CRS</span> verification to ensure your data and carbon credits remain protected, and your strong score qualifies you for our <span className="font-semibold text-[#2D3A31]">HIGH</span> Category - giving you access to our best terms.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[#E6E2DA] bg-white/70 p-4 space-y-3 animate-[botanical-reveal_500ms_ease-out_both]">
                                <p className="text-xs font-semibold tracking-[0.08em] uppercase text-muted">Report Summary</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    <div className="rounded-xl border border-[#E6E2DA] bg-[#F7F4EE] p-2.5">
                                        <p className="text-[11px] text-muted">Verification Score</p>
                                        <p className="text-base font-semibold">{scorePct}%</p>
                                    </div>
                                    <div className="rounded-xl border border-[#E6E2DA] bg-[#F7F4EE] p-2.5">
                                        <p className="text-[11px] text-muted">Bureau Score</p>
                                        <p className="text-base font-semibold">{reportScore ?? "N/A"}</p>
                                    </div>
                                    <div className="rounded-xl border border-[#E6E2DA] bg-[#F7F4EE] p-2.5">
                                        <p className="text-[11px] text-muted">Tradelines</p>
                                        <p className="text-base font-semibold">{tradelineCount ?? "N/A"}</p>
                                    </div>
                                    <div className="rounded-xl border border-[#E6E2DA] bg-[#F7F4EE] p-2.5">
                                        <p className="text-[11px] text-muted">Inquiries</p>
                                        <p className="text-base font-semibold">{inquiryCount ?? "N/A"}</p>
                                    </div>
                                    <div className="rounded-xl border border-[#E6E2DA] bg-[#F7F4EE] p-2.5">
                                        <p className="text-[11px] text-muted">Public Records</p>
                                        <p className="text-base font-semibold">{publicRecordCount ?? "N/A"}</p>
                                    </div>
                                    <div className="rounded-xl border border-[#E6E2DA] bg-[#F7F4EE] p-2.5">
                                        <p className="text-[11px] text-muted">Bureau</p>
                                        <p className="text-base font-semibold">{bureauName}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowImproveModal(true)}
                                className="w-full py-3 soft-pill rounded-full text-sm font-semibold text-[#2D3A31] hover:bg-[#DCCFC2]/55 transition-colors"
                            >
                                Want to improve your score?
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setState("idle")}
                                    className="w-1/3 py-3.5 soft-pill rounded-full text-sm text-muted"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => onVerified(form)}
                                    className="w-2/3 py-3.5 btn-glass-primary font-semibold text-sm flex items-center justify-center gap-2"
                                >
                                    Continue
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ) : state === "error" ? (
                        <div className="text-center py-6 space-y-4">
                            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full border border-[#C27B66]/40 bg-[#C27B66]/10">
                                <ShieldAlert className="h-8 w-8 text-[#C27B66]" />
                            </div>
                            <div>
                                <h3 className="font-display text-2xl font-semibold">Verification Failed</h3>
                                <p className="text-sm text-muted mt-1">
                                    {crsResult?.flags?.join(", ") || "Unable to verify identity at this time."}
                                </p>
                            </div>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setState("idle")}
                                    className="px-5 py-2.5 text-sm font-medium rounded-full soft-pill hover:bg-[#DCCFC2]/55 transition-colors"
                                >
                                    Try again
                                </button>
                                <a href="#" className="px-5 py-2.5 text-sm font-medium rounded-full btn-organic-secondary">
                                    Contact support
                                </a>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-hidden">
                                <div
                                    className="flex transition-transform duration-500 ease-out"
                                    style={{ transform: `translateX(-${formStep * 100}%)` }}
                                >
                                    <div className="w-full shrink-0 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-muted mb-1.5">
                                                First Name <span className="text-[#C27B66]">*</span>
                                            </label>
                                            <div className="relative">
                                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C9A84]" />
                                                <input
                                                    className={inputClass("firstName")}
                                                    placeholder="Jane"
                                                    value={form.firstName}
                                                    onChange={(e) => { setForm({ ...form, firstName: e.target.value }); setErrors({ ...errors, firstName: undefined }); }}
                                                />
                                            </div>
                                            {errors.firstName && <p className="text-xs text-[#C27B66] mt-1">{errors.firstName}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-muted mb-1.5">
                                                Last Name <span className="text-[#C27B66]">*</span>
                                            </label>
                                            <div className="relative">
                                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C9A84]" />
                                                <input
                                                    className={inputClass("lastName")}
                                                    placeholder="Doe"
                                                    value={form.lastName}
                                                    onChange={(e) => { setForm({ ...form, lastName: e.target.value }); setErrors({ ...errors, lastName: undefined }); }}
                                                />
                                            </div>
                                            {errors.lastName && <p className="text-xs text-[#C27B66] mt-1">{errors.lastName}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-muted mb-1.5">
                                                Email <span className="text-[#C27B66]">*</span>
                                            </label>
                                            <div className="relative">
                                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C9A84]" />
                                                <input
                                                    type="email"
                                                    className={inputClass("email")}
                                                    placeholder="jane@farm.co"
                                                    value={form.email}
                                                    onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: undefined }); }}
                                                />
                                            </div>
                                            {errors.email && <p className="text-xs text-[#C27B66] mt-1">{errors.email}</p>}
                                        </div>
                                    </div>

                                    <div className="w-full shrink-0 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-muted mb-1.5">
                                                Phone <span className="text-[#C27B66]">*</span>
                                            </label>
                                            <div className="relative">
                                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C9A84]" />
                                                <input
                                                    type="tel"
                                                    className={inputClass("phone")}
                                                    placeholder="+1 (555) 000-0000"
                                                    value={form.phone}
                                                    onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: undefined }); }}
                                                />
                                            </div>
                                            {errors.phone && <p className="text-xs text-[#C27B66] mt-1">{errors.phone}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-muted mb-1.5">
                                                Address <span className="text-[#C27B66]">*</span>
                                            </label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C9A84]" />
                                                <input
                                                    className={inputClass("address")}
                                                    placeholder="123 Farm Road, Iowa"
                                                    value={form.address}
                                                    onChange={(e) => { setForm({ ...form, address: e.target.value }); setErrors({ ...errors, address: undefined }); }}
                                                />
                                            </div>
                                            {errors.address && <p className="text-xs text-[#C27B66] mt-1">{errors.address}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {formStep === 0 ? (
                                <button
                                    onClick={goNextStep}
                                    className="w-full py-3.5 btn-glass-primary font-semibold text-sm flex items-center justify-center gap-2"
                                >
                                    Continue
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setFormStep(0)}
                                        className="w-1/3 py-3.5 soft-pill rounded-full text-sm text-muted"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={state === "loading"}
                                        className="w-2/3 py-3.5 btn-glass-primary font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                                    >
                                        {state === "loading" ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                Verify Identity
                                                <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            <div className="relative text-center">
                                <button
                                    className="text-xs text-muted hover:text-[#2D3A31] inline-flex items-center gap-1 transition-colors"
                                    onClick={() => setShowTooltip(!showTooltip)}
                                >
                                    <HelpCircle className="h-3 w-3" /> Why we verify
                                </button>
                                {showTooltip && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 glass-card text-xs rounded-xl z-10 text-muted">
                                        Identity verification protects against fraud and keeps project crediting trustworthy. Your data stays encrypted.
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showImproveModal && (
                <div className="fixed inset-0 z-50 bg-[#2D3A31]/35 backdrop-blur-[2px] flex items-center justify-center px-4">
                    <div className="w-full max-w-lg glass-card p-5 md:p-6 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold tracking-[0.08em] uppercase text-muted">Score Growth Plan</p>
                                <h4 className="font-display text-2xl font-semibold leading-tight">Improve profile confidence and project readiness</h4>
                            </div>
                            <button
                                onClick={() => setShowImproveModal(false)}
                                className="h-9 w-9 rounded-full soft-pill inline-flex items-center justify-center"
                            >
                                <X className="h-4 w-4 text-[#2D3A31]" />
                            </button>
                        </div>

                        <div className="space-y-2 text-sm text-muted">
                            <div className="rounded-xl border border-[#E6E2DA] bg-[#F7F4EE] p-3">
                                Add 12 months of field logs for tillage, irrigation, and fertilizer rates.
                            </div>
                            <div className="rounded-xl border border-[#E6E2DA] bg-[#F7F4EE] p-3">
                                Start a cover-crop block this season and upload planting and termination proof.
                            </div>
                            <div className="rounded-xl border border-[#E6E2DA] bg-[#F7F4EE] p-3">
                                Document reduced-till passes and diesel usage to strengthen emissions baseline quality.
                            </div>
                            <div className="rounded-xl border border-[#E6E2DA] bg-[#F7F4EE] p-3">
                                Add satellite-backed evidence snapshots each month to improve monitoring confidence.
                            </div>
                            <div className="rounded-xl border border-[#E6E2DA] bg-[#F7F4EE] p-3">
                                Keep inquiry activity low and maintain clean repayment history for stronger bureau scoring.
                            </div>
                        </div>

                        <button
                            onClick={() => setShowImproveModal(false)}
                            className="w-full py-3 btn-organic-secondary text-sm font-semibold"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
