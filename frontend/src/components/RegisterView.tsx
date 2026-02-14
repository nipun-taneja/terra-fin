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
                setTimeout(() => onVerified(form), 1600);
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
        `w-full pl-11 pr-4 text-sm glass-input outline-none transition-all ${errors[field]
            ? "border-[#C27B66] focus:shadow-[0_0_0_2px_rgba(194,123,102,0.22)]"
            : "focus:border-[#8C9A84]"
        }`;

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-10 md:py-16 botanical-reveal">
            <div className="w-full max-w-xl">
                <div className="text-center mb-5 md:mb-6 botanical-reveal-slow">
                    <h1 className="font-display text-3xl md:text-4xl font-semibold leading-tight">
                        Unlock Your Carbon Revenue
                    </h1>
                    <p className="text-muted mt-2 text-sm md:text-base">
                        We use CRS verification to ensure your data and carbon credits remain protected and authentic.
                    </p>
                </div>

                <div className="glass-card card-lift p-6 md:p-8 space-y-5">
                    {state === "success" ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full soft-pill">
                                <ShieldCheck className="h-8 w-8 text-[#8C9A84]" />
                            </div>
                            <div>
                                <h3 className="font-display text-2xl font-semibold">Identity Verified</h3>
                                <p className="text-sm text-muted mt-1">
                                    CRS Score: {((crsResult?.score ?? 0) * 100).toFixed(0)}% - Redirecting...
                                </p>
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
                                            <label className="block text-sm font-medium text-muted mb-1.5">Last Name</label>
                                            <div className="relative">
                                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C9A84]" />
                                                <input
                                                    className={inputClass("lastName")}
                                                    placeholder="Doe"
                                                    value={form.lastName}
                                                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                                />
                                            </div>
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
                                            <label className="block text-sm font-medium text-muted mb-1.5">Address</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C9A84]" />
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
        </div>
    );
}
