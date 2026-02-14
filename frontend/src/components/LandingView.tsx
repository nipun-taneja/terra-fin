"use client";

import React from "react";
import { AppView } from "@/lib/types";

interface LandingViewProps {
    onNavigate: (view: AppView) => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
    return (
        <div className="min-h-screen relative bg-[#F9F8F4] overflow-y-auto">
            {/* Paper Grain Overlay */}
            <div className="paper-grain" />

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-40 px-4 py-3 md:px-6 md:py-4">
                <nav className="max-w-7xl mx-auto flex items-center justify-between glass-card px-4 py-2 md:px-8 md:py-3 bg-white/70 backdrop-blur-md border border-white/40 shadow-sm">
                    {/* Logo & Brand */}
                    <div
                        onClick={() => onNavigate("landing")}
                        className="flex items-center gap-2 cursor-pointer group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-[#2D3A31] flex items-center justify-center text-[#F9F8F4] font-display font-bold text-sm transition-transform group-hover:scale-110">
                            TF
                        </div>
                        <span className="font-display font-bold text-xl text-[#2D3A31] tracking-tight">TerraFin</span>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-4 md:gap-6">
                        <button className="hidden md:block text-[#2D3A31]/60 hover:text-[#2D3A31] hover:bg-[#8C9A84]/10 px-3 py-1 rounded-full text-sm font-medium transition-all duration-300">Blog</button>
                        <div className="hidden md:block h-3 w-px bg-[#E6E2DA]" />
                        <button
                            onClick={() => onNavigate("login")}
                            className="text-[#2D3A31]/60 hover:text-[#2D3A31] hover:bg-[#8C9A84]/10 px-3 py-1 rounded-full text-sm font-medium transition-all duration-300"
                        >
                            Login
                        </button>
                        <button
                            onClick={() => onNavigate("register")}
                            className="px-4 py-1.5 btn-glass-primary text-xs font-semibold hover:scale-105 active:scale-95 transition-transform"
                        >
                            Register
                        </button>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <main className="pt-24 pb-4 px-6">
                <div className="max-w-5xl mx-auto text-center botanical-reveal">
                    {/* Logo large */}
                    <div className="mb-4 flex justify-center">
                        <div className="w-14 h-14 rounded-2xl bg-[#2D3A31] flex items-center justify-center text-[#F9F8F4] font-display font-bold text-2xl shadow-2xl">
                            TF
                        </div>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-display font-bold text-[#2D3A31] mb-3 leading-tight">
                        Harvesting Carbon, <br />
                        <span className="text-[#8C9A84]">Cultivating Futures.</span>
                    </h1>

                    <p className="text-sm md:text-base text-[#2D3A31]/70 max-w-xl mx-auto mb-6 leading-relaxed">
                        TerraFin empowers farmers to transform sustainable practices into verified carbon credits,
                        unlocking new financial streams while protecting the planet
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                            onClick={() => onNavigate("register")}
                            className="px-6 py-2.5 btn-glass-primary text-sm font-bold w-full sm:w-auto shadow-lg hover:brightness-110 transition-all"
                        >
                            Get Started for Free
                        </button>
                        <button
                            onClick={() => onNavigate("how-it-works")}
                            className="px-6 py-2.5 bg-[#8C9A84] hover:bg-[#7A8873] text-white rounded-full text-sm font-bold w-full sm:w-auto shadow-lg transition-all"
                        >
                            How it Works
                        </button>
                    </div>
                </div>

                {/* Benefits Section */}
                <section className="mt-8 max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            {
                                title: "Carbon as a Second Crop",
                                desc: "Turn sustainable practices into a reliable revenue stream, treating carbon as your farm's most valuable new yield."
                            },
                            {
                                title: "Global Market Access",
                                desc: "Immediate connection to corporations and institutional buyers seeking verified, high-integrity carbon offsets."
                            },
                            {
                                title: "Upfront Financial Support",
                                desc: "Verified CRS status unlocks financing from partners like Rabobank, Verra Trust, or GlobalSoilBank."
                            },
                            {
                                title: "Regenerative Impact",
                                desc: "Reduce CO2 while improving soil health and yields. A resilient earth leads to a more prosperous farming future."
                            }
                        ].map((benefit, idx) => (
                            <div key={idx} className="glass-card p-5 card-lift bg-white/50 backdrop-blur-sm border border-[#E6E2DA] flex flex-col h-full min-h-[140px]">
                                <h3 className="text-base font-display font-bold mb-2 text-[#2D3A31]">{benefit.title}</h3>
                                <p className="text-xs text-[#2D3A31]/70 leading-relaxed text-left flex-grow">{benefit.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Partners Section */}
                <section className="mt-12 border-t border-[#E6E2DA] pt-8 pb-8 px-4">
                    <div className="max-w-7xl mx-auto">
                        <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-[#2D3A31]/40 mb-6">
                            Official Partners & Carbon Credit Banks
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 grayscale hover:grayscale-0 transition-all duration-700">
                            {[
                                { name: "Verra Trust", color: "bg-blue-900/10" },
                                { name: "Gold Standard", color: "bg-amber-900/10" },
                                { name: "Rabobank", color: "bg-orange-600/10" },
                                { name: "Agri-Financial", color: "bg-emerald-900/10" }
                            ].map((bank) => (
                                <div key={bank.name} className="flex items-center gap-2 group cursor-default">
                                    <div className={`w-10 h-10 ${bank.color} rounded-lg flex items-center justify-center border border-[#E6E2DA] group-hover:border-[#8C9A84] transition-colors`}>
                                        <div className="w-3 h-3 rounded-full bg-white/40 border border-white/20" />
                                    </div>
                                    <span className="font-display font-bold text-xs text-[#2D3A31] opacity-60 group-hover:opacity-100 transition-opacity">
                                        {bank.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-[#2D3A31] text-[#F9F8F4]/50 py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#F9F8F4] flex items-center justify-center text-[#2D3A31] font-display font-bold text-xs">
                            T
                        </div>
                        <span className="font-display font-bold text-white tracking-tight">TerraFin</span>
                    </div>
                    <div className="flex gap-8 text-sm">
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-white transition-colors">Contact Us</a>
                    </div>
                    <p className="text-xs">© 2026 TerraFin. All rights reserved.</p>
                </div>
            </footer>

            {/* Background blobs for depth */}
            <div className="fixed -top-24 -left-24 w-96 h-96 bg-[#8C9A84]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-[#C27B66]/5 rounded-full blur-3xl pointer-events-none" />
        </div>
    );
};

export default LandingView;
