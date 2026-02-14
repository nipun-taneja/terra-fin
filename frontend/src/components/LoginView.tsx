"use client";

import { useState } from "react";
import {
    Mail,
    Lock,
    ArrowRight,
    Loader2,
} from "lucide-react";
import { AppView, ProfileResponse } from "@/lib/types";
import { loadProfile } from "@/lib/api";

interface Props {
    onLogin: (profile: ProfileResponse) => void;
    onNavigate: (view: AppView) => void;
}

export default function LoginView({ onLogin, onNavigate }: Props) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Real data retrieval
            const profile = await loadProfile(email);
            onLogin(profile);
        } catch (err: any) {
            console.error("[Login] Failed:", err);
            setError(err.message || "Login failed. Please check your connection.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-10 botanical-reveal">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div
                        onClick={() => onNavigate("landing")}
                        className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-[#2D3A31] mb-6 cursor-pointer hover:scale-105 transition-transform shadow-xl"
                    >
                        <span className="text-[#F9F8F4] font-display font-bold text-2xl">TF</span>
                    </div>
                    <h1 className="font-display text-4xl font-bold text-[#2D3A31]">Welcome Back</h1>
                    <p className="text-muted mt-2">Access your carbon dashboard</p>
                </div>

                <div className="glass-card p-8 space-y-6">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-sm font-medium botanical-reveal">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C9A84]" />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-11 pr-4 py-3 glass-input outline-none focus:border-[#8C9A84] transition-all"
                                    placeholder="jane@farm.co"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-muted mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C9A84]" />
                                <input
                                    type="password"
                                    required
                                    className="w-full pl-11 pr-4 py-3 glass-input outline-none focus:border-[#8C9A84] transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 btn-glass-primary font-bold flex items-center justify-center gap-2 group disabled:opacity-70"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Login
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[#E6E2DA]"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-[#2D3A31]/40">Don&apos;t have an account?</span>
                        </div>
                    </div>

                    <button
                        onClick={() => onNavigate("register")}
                        className="w-full py-3 btn-organic-secondary font-bold"
                    >
                        Create Account
                    </button>
                </div>

                <p className="text-center text-xs text-muted mt-8">
                    By signing in, you agree to our <a href="#" className="underline">Terms of Service</a>.
                </p>
            </div>
        </div>
    );
}
