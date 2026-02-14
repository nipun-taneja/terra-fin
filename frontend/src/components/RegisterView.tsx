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

    const inputClass = (field: keyof FarmerIdentity) =>
        `w-full pl-11 pr-4 py-3.5 bg-white border rounded-xl text-sm outline-none transition-all ${errors[field]
            ? "border-red-300 focus:ring-2 focus:ring-red-200"
            : "border-slate-200 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
        }`;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-600 mb-4">
                        <ShieldCheck className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Create your Farmer Account</h1>
                    <p className="text-slate-500 mt-1 text-sm">Verify your identity to unlock carbon credit services</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
                    {state === "success" ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100">
                                <ShieldCheck className="h-8 w-8 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-emerald-800">Identity Verified</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    CRS Score: {((crsResult?.score ?? 0) * 100).toFixed(0)}% — Redirecting...
                                </p>
                            </div>
                        </div>
                    ) : state === "error" ? (
                        <div className="text-center py-6 space-y-4">
                            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                                <ShieldAlert className="h-8 w-8 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-red-700">Verification Failed</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    {crsResult?.flags?.join(", ") || "Unable to verify identity at this time."}
                                </p>
                            </div>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setState("idle")}
                                    className="px-5 py-2.5 text-sm font-medium rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                    Try again
                                </button>
                                <a href="#" className="px-5 py-2.5 text-sm font-medium rounded-xl text-emerald-700 hover:bg-emerald-50 transition-colors">
                                    Contact support
                                </a>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* First Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    First Name <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        className={inputClass("firstName")}
                                        placeholder="Jane"
                                        value={form.firstName}
                                        onChange={(e) => { setForm({ ...form, firstName: e.target.value }); setErrors({ ...errors, firstName: undefined }); }}
                                    />
                                </div>
                                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                            </div>

                            {/* Last Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        className={inputClass("lastName")}
                                        placeholder="Doe"
                                        value={form.lastName}
                                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Email <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="email"
                                        className={inputClass("email")}
                                        placeholder="jane@farm.co"
                                        value={form.email}
                                        onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: undefined }); }}
                                    />
                                </div>
                                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Phone <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="tel"
                                        className={inputClass("phone")}
                                        placeholder="+1 (555) 000-0000"
                                        value={form.phone}
                                        onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: undefined }); }}
                                    />
                                </div>
                                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        className={inputClass("address")}
                                        placeholder="123 Farm Road, Iowa"
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* CTA */}
                            <button
                                onClick={handleSubmit}
                                disabled={state === "loading"}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {state === "loading" ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Verifying with CRS…
                                    </>
                                ) : (
                                    <>
                                        Verify Identity
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>

                            {/* Why we verify */}
                            <div className="relative text-center">
                                <button
                                    className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 transition-colors"
                                    onClick={() => setShowTooltip(!showTooltip)}
                                >
                                    <HelpCircle className="h-3 w-3" /> Why we verify
                                </button>
                                {showTooltip && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl z-10">
                                        Identity verification via CRS protects against fraud and ensures credit integrity. Your data is encrypted and never shared.
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
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
