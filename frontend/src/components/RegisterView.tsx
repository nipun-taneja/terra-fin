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
} from "lucide-react";
import { FarmerIdentity, CRSResponse } from "@/lib/types";
import { verifyCRS } from "@/lib/api";

type VerifyState = "idle" | "loading" | "success" | "error";

interface Props {
    onVerified: (identity?: FarmerIdentity) => void;
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
    const [formStep, setFormStep] = useState(0);

    const validate = (): boolean => {
        const e: typeof errors = {};
        if (!form.firstName.trim()) e.firstName = "First name is required";
        if (!form.email.trim()) e.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
        if (!form.phone.trim()) e.phone = "Phone number is required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setState("loading");
        try {
            const res = await verifyCRS({
                farmer_name: `${form.firstName} ${form.lastName}`.trim(),
                email: form.email,
                phone: form.phone,
                country: form.address,
            });
            setCrsResult(res);
            if (res.credible) {
                setState("success");
                setTimeout(() => onVerified(form), 1800);
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
        if (!form.email.trim()) stepErrors.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(form.email)) stepErrors.email = "Enter a valid email";
        setErrors((prev) => ({ ...prev, ...stepErrors }));
        if (Object.keys(stepErrors).length === 0) setFormStep(1);
    };

    const inputClass = (field: keyof FarmerIdentity) =>
        `w-full pl-11 pr-4 text-sm glass-input outline-none transition-all placeholder:text-white/30 ${errors[field]
            ? "border-red-400/70 focus:shadow-[0_0_0_2px_rgba(248,113,113,0.25)]"
            : "focus:border-cyan-400"
        }`;

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl glass-secondary mb-4 border border-emerald-400/50 shadow-[0_0_20px_rgba(34,197,94,0.25)]">
                        <ShieldCheck className="h-7 w-7 text-emerald-300" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Create your Farmer Account</h1>
                    <p className="text-white/70 mt-1 text-sm">Verify your identity to unlock carbon credit services</p>
                </div>

                <div className="glass-card p-6 space-y-5">
                    {state === "success" ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-400/50 shadow-[0_0_20px_rgba(34,197,94,0.35)]">
                                <ShieldCheck className="h-8 w-8 text-emerald-300" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-emerald-300">Identity Verified</h3>
                                <p className="text-sm text-white/70 mt-1">
                                    CRS Score: {((crsResult?.score ?? 0) * 100).toFixed(0)}% - Redirecting...
                                </p>
                            </div>
                        </div>
                    ) : state === "error" ? (
                        <div className="text-center py-6 space-y-4">
                            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-500/20 border border-red-400/50">
                                <ShieldAlert className="h-8 w-8 text-red-300" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-red-300">Verification Failed</h3>
                                <p className="text-sm text-white/70 mt-1">
                                    {crsResult?.flags?.join(", ") || "Unable to verify identity at this time."}
                                </p>
                            </div>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setState("idle")}
                                    className="px-5 py-2.5 text-sm font-medium rounded-xl glass-secondary text-white hover:bg-white/15 transition-colors"
                                >
                                    Try again
                                </button>
                                <a href="#" className="px-5 py-2.5 text-sm font-medium rounded-xl text-emerald-300 hover:bg-emerald-400/10 transition-colors">
                                    Contact support
                                </a>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-hidden">
                                <div
                                    className="flex transition-transform duration-300"
                                    style={{ transform: `translateX(-${formStep * 100}%)` }}
                                >
                                    <div className="w-full shrink-0 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-white/80 mb-1.5">
                                                First Name <span className="text-red-400">*</span>
                                            </label>
                                            <div className="relative">
                                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                                                <input
                                                    className={inputClass("firstName")}
                                                    placeholder="Jane"
                                                    value={form.firstName}
                                                    onChange={(e) => { setForm({ ...form, firstName: e.target.value }); setErrors({ ...errors, firstName: undefined }); }}
                                                />
                                            </div>
                                            {errors.firstName && <p className="text-xs text-red-300 mt-1">{errors.firstName}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-white/80 mb-1.5">Last Name</label>
                                            <div className="relative">
                                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                                                <input
                                                    className={inputClass("lastName")}
                                                    placeholder="Doe"
                                                    value={form.lastName}
                                                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-white/80 mb-1.5">
                                                Email <span className="text-red-400">*</span>
                                            </label>
                                            <div className="relative">
                                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                                                <input
                                                    type="email"
                                                    className={inputClass("email")}
                                                    placeholder="jane@farm.co"
                                                    value={form.email}
                                                    onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: undefined }); }}
                                                />
                                            </div>
                                            {errors.email && <p className="text-xs text-red-300 mt-1">{errors.email}</p>}
                                        </div>
                                    </div>

                                    <div className="w-full shrink-0 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-white/80 mb-1.5">
                                                Phone <span className="text-red-400">*</span>
                                            </label>
                                            <div className="relative">
                                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                                                <input
                                                    type="tel"
                                                    className={inputClass("phone")}
                                                    placeholder="+1 (555) 000-0000"
                                                    value={form.phone}
                                                    onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: undefined }); }}
                                                />
                                            </div>
                                            {errors.phone && <p className="text-xs text-red-300 mt-1">{errors.phone}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-white/80 mb-1.5">Address</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                                                <input
                                                    className={inputClass("address")}
                                                    placeholder="123 Farm Road, Iowa"
                                                    value={form.address}
                                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {formStep === 0 ? (
                                <button
                                    onClick={goNextStep}
                                    className="w-full py-3.5 btn-glass-primary font-semibold flex items-center justify-center gap-2"
                                >
                                    Next
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setFormStep(0)}
                                        className="w-1/3 py-3.5 glass-secondary rounded-full text-white/80"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={state === "loading"}
                                        className="w-2/3 py-3.5 btn-glass-primary font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                                    >
                                        {state === "loading" ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Verifying with CRS...
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
                                    className="text-xs text-white/50 hover:text-white/80 inline-flex items-center gap-1 transition-colors"
                                    onClick={() => setShowTooltip(!showTooltip)}
                                >
                                    <HelpCircle className="h-3 w-3" /> Why we verify
                                </button>
                                {showTooltip && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 glass-card text-white text-xs rounded-xl z-10">
                                        Identity verification via CRS protects against fraud and ensures credit integrity. Your data is encrypted and never shared.
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900/90" />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

