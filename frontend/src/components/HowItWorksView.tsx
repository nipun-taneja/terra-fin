"use client";

import React from "react";
import { AppView } from "@/lib/types";

interface HowItWorksViewProps {
    onNavigate: (view: AppView) => void;
}

const HowItWorksView: React.FC<HowItWorksViewProps> = ({ onNavigate }) => {
    return (
        <div className="relative w-full h-full min-h-screen bg-[#F9F8F4] overflow-hidden flex flex-col">
            {/* Paper Grain & Background Blobs */}
            <div className="paper-grain" />
            <div className="fixed -top-24 -left-24 w-96 h-96 bg-[#8C9A84]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-[#C27B66]/5 rounded-full blur-3xl pointer-events-none" />

            {/* Sticky Header (no height math issues like fixed) */}
            <header className="sticky top-0 z-40 px-4 py-3 md:px-6 md:py-4">
                <nav className="max-w-7xl mx-auto flex items-center justify-between glass-card px-4 py-2 md:px-8 md:py-3 bg-white/70 backdrop-blur-md border border-white/40 shadow-sm">
                    <div
                        onClick={() => onNavigate("landing")}
                        className="flex items-center gap-2 cursor-pointer group min-w-0"
                    >
                        <div className="w-8 h-8 rounded-lg bg-[#2D3A31] flex items-center justify-center text-[#F9F8F4] font-display font-bold text-sm transition-transform group-hover:scale-110 shrink-0">FF</div>
                        <span className="font-display font-bold text-xl text-[#2D3A31] tracking-tight truncate">
                            FarmFin
                        </span>
                    </div>

                    <button
                        onClick={() => onNavigate("landing")}
                        className="text-[#2D3A31]/60 hover:text-[#2D3A31] text-sm font-medium transition-colors shrink-0"
                    >
                        âœ• Close
                    </button>
                </nav>
            </header>

            {/* IMPORTANT: flex-1 + min-h-0 allows scrolling inside constrained parents */}
            <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 md:px-12">
                <div className="max-w-5xl mx-auto w-full pt-8 pb-16">
                    {/* Hero */}
                    <div className="text-center mb-16 botanical-reveal">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-[#8C9A84]/10 text-[#2D3A31] text-xs font-bold uppercase tracking-wider mb-4">
                            Scientific Mandate: Nature 2022
                        </div>
                        <h1 className="text-3xl md:text-5xl font-display font-bold text-[#2D3A31] mb-6 leading-tight">
                            Financing the shift to <br />
                            <span className="text-[#8C9A84]">Net-Zero Farming.</span>
                        </h1>
                        <p className="text-base md:text-lg text-[#2D3A31]/70 max-w-2xl mx-auto leading-relaxed break-words">
                            Following the roadmap published in <i>Nature</i>, we solve the $100B funding gap for the
                            &quot;Big 4&quot; (Beef, Dairy, Rice, Maize) smallholders.
                        </p>
                    </div>

                    {/* The Concept - Responsive Grid */}
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-24 items-stretch min-w-0">
                        <div className="glass-card p-6 bg-white/60 flex flex-col h-full border border-[#E6E2DA] shadow-sm min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-[#8C9A84]/10 flex items-center justify-center text-2xl mb-6 shadow-inner shrink-0">
                                ðŸŒ¾
                            </div>
                            <h3 className="text-lg font-display font-bold mb-3 text-[#2D3A31] break-words">
                                The Ambition
                            </h3>
                            <p className="text-sm text-[#2D3A31]/70 flex-grow leading-relaxed break-words">
                                Smallholders produce 65% of agricultural emissions. They want to transition but lack the upfront
                                capital for sustainable inputs and methane-reducing tech.
                            </p>
                        </div>

                        <div className="glass-card p-6 bg-white/60 flex flex-col h-full border border-[#E6E2DA] shadow-sm min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-[#2D3A31]/10 flex items-center justify-center text-2xl mb-6 shadow-inner shrink-0">
                                ðŸ¤–
                            </div>
                            <h3 className="text-lg font-display font-bold mb-3 text-[#2D3A31] break-words">
                                The Solution
                            </h3>
                            <p className="text-sm text-[#2D3A31]/70 flex-grow leading-relaxed break-words">
                                FarmFin acts as a digital agronomist. We pull satellite data to audit a farm&apos;s current
                                emissions and generate a custom 3-step transition roadmap.
                            </p>
                        </div>

                        <div className="glass-card p-6 bg-white/60 flex flex-col h-full border border-[#E6E2DA] shadow-sm sm:col-span-2 lg:col-span-1 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-[#C27B66]/10 flex items-center justify-center text-2xl mb-6 shadow-inner shrink-0">
                                ðŸ’¸
                            </div>
                            <h3 className="text-lg font-display font-bold mb-3 text-[#2D3A31] break-words">
                                The Result
                            </h3>
                            <p className="text-sm text-[#2D3A31]/70 flex-grow leading-relaxed break-words">
                                We pre-sell projected carbon credits to corporate buyers (NestlÃ©, Microsoft). This &quot;Voluntary
                                Carbon Market&quot; pays for the farmer&apos;s transition.
                            </p>
                        </div>
                    </section>

                    {/* Connected Roadmap Path */}
                    <section className="mb-32 relative">
                        <h2 className="text-3xl font-display font-bold text-[#2D3A31] text-center mb-20">
                            The User Journey
                        </h2>

                        <div className="relative max-w-2xl mx-auto space-y-12 min-w-0">
                            {/* Step 1 */}
                            <div className="flex flex-col md:flex-row items-center gap-8 group min-w-0">
                                <div className="md:w-1/2 flex justify-center md:justify-end order-1 min-w-0">
                                    <div className="p-8 pb-10 glass-card bg-white/80 border-[#8C9A84] border-2 relative w-full min-w-0">
                                        <div className="absolute -top-4 left-4 w-10 h-10 rounded-full bg-[#8C9A84] text-white flex items-center justify-center font-bold shadow-lg text-sm">
                                            1
                                        </div>
                                        <h4 className="text-xl font-bold text-[#2D3A31] mb-2 break-words">
                                            The Drop-Pin
                                        </h4>
                                        <p className="text-sm text-[#2D3A31]/70 break-words">
                                            Drop a pin on your field. Our Gemini-powered engine creates a digital twin of your land instantly.
                                        </p>
                                        <div className="absolute top-full left-1/2 -ml-px h-12 w-0.5 bg-gradient-to-b from-[#8C9A84] to-transparent md:hidden" />
                                    </div>
                                </div>
                                <div className="md:w-1/2 order-2 hidden md:block min-w-0">
                                    <div className="text-5xl group-hover:scale-110 transition-transform origin-left">ðŸ“</div>
                                </div>
                            </div>

                            {/* Connection Arrow Desktop 1 -> 2 */}
                            <div className="hidden md:flex justify-center -my-8 pr-16 lg:pr-24">
                                <div className="h-16 w-0.5 border-r border-dashed border-[#8C9A84]/40 relative">
                                    <div className="absolute top-full left-1/2 -ml-px border-4 border-t-[#8C9A84]/40 border-l-transparent border-r-transparent" />
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex flex-col md:flex-row items-center gap-8 group min-w-0">
                                <div className="md:w-1/2 order-2 md:order-1 flex justify-center md:justify-end hidden md:block min-w-0">
                                    <div className="text-5xl group-hover:scale-110 transition-transform origin-right">ðŸ›°ï¸</div>
                                </div>
                                <div className="md:w-1/2 flex justify-center md:justify-start order-1 md:order-2 min-w-0">
                                    <div className="p-8 pb-10 glass-card bg-white/80 border-[#2D3A31] border-2 relative w-full min-w-0">
                                        <div className="absolute -top-4 right-4 w-10 h-10 rounded-full bg-[#2D3A31] text-white flex items-center justify-center font-bold shadow-lg text-sm">
                                            2
                                        </div>
                                        <h4 className="text-xl font-bold text-[#2D3A31] mb-2 break-words">The AI Audit</h4>
                                        <p className="text-sm text-[#2D3A31]/70 break-words">
                                            We pull Google Earth Engine satellite data to assess vegetation percentile and historical emissions.
                                        </p>
                                        <div className="absolute top-full left-1/2 -ml-px h-12 w-0.5 bg-gradient-to-b from-[#2D3A31] to-transparent md:hidden" />
                                    </div>
                                </div>
                            </div>

                            {/* Connection Arrow Desktop 2 -> 3 */}
                            <div className="hidden md:flex justify-center -my-8 pl-16 lg:pl-24">
                                <div className="h-16 w-0.5 border-l border-dashed border-[#2D3A31]/40 relative">
                                    <div className="absolute top-full left-1/2 -ml-px border-4 border-t-[#2D3A31]/40 border-l-transparent border-r-transparent" />
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex flex-col md:flex-row items-center gap-8 group min-w-0">
                                <div className="md:w-1/2 flex justify-center md:justify-end order-1 min-w-0">
                                    <div className="p-8 pb-10 glass-card bg-white/80 border-[#C27B66] border-2 relative w-full min-w-0">
                                        <div className="absolute -top-4 left-4 w-10 h-10 rounded-full bg-[#C27B66] text-white flex items-center justify-center font-bold shadow-lg text-sm">
                                            3
                                        </div>
                                        <h4 className="text-xl font-bold text-[#2D3A31] mb-2 break-words">The Nature Roadmap</h4>
                                        <p className="text-sm text-[#2D3A31]/70 break-words">
                                            Scientific custom steps (like AWD for Rice) to reach top 30th percentile efficiency.
                                        </p>
                                        <div className="absolute top-full left-1/2 -ml-px h-12 w-0.5 bg-gradient-to-b from-[#C27B66] to-transparent md:hidden" />
                                    </div>
                                </div>
                                <div className="md:w-1/2 order-2 hidden md:block min-w-0">
                                    <div className="text-5xl group-hover:scale-110 transition-transform origin-left">ðŸ—ºï¸</div>
                                </div>
                            </div>

                            {/* Connection Arrow Desktop 3 -> 4 */}
                            <div className="hidden md:flex justify-center -my-8 pr-16 lg:pr-24">
                                <div className="h-16 w-0.5 border-r border-dashed border-[#C27B66]/40 relative">
                                    <div className="absolute top-full left-1/2 -ml-px border-4 border-t-[#C27B66]/40 border-l-transparent border-r-transparent" />
                                </div>
                            </div>

                            {/* Step 4 */}
                            <div className="flex flex-col md:flex-row items-center gap-8 group min-w-0">
                                <div className="md:w-1/2 order-2 md:order-1 flex justify-center md:justify-end hidden md:block min-w-0">
                                    <div className="text-5xl group-hover:scale-110 transition-transform origin-right">ðŸ’¸</div>
                                </div>
                                <div className="md:w-1/2 flex justify-center md:justify-start order-1 md:order-2 min-w-0">
                                    <div className="p-8 glass-card bg-[#2D3A31] border-white/20 border-2 relative w-full text-white shadow-xl min-w-0">
                                        <div className="absolute -top-4 right-4 w-10 h-10 rounded-full bg-white text-[#2D3A31] flex items-center justify-center font-bold shadow-lg text-sm">
                                            4
                                        </div>
                                        <h4 className="text-xl font-bold mb-2 break-words">Transition Micro-loan</h4>
                                        <p className="text-sm opacity-80 leading-relaxed break-words">
                                            Instantly fund your farm upgrade. Pre-sold carbon credits act as collateral. No credit score required.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Financial Reasons Grid */}
                    <section className="mb-24 px-2">
                        <h2 className="text-3xl font-display font-bold text-[#2D3A31] text-center mb-12">
                            Built to Win
                        </h2>
                        <div className="grid sm:grid-cols-2 gap-6 items-stretch min-w-0">
                            <ReasonCard
                                title="Carbon as Second Cash Crop"
                                text="Don't just sell rice. Sell Verified Carbon Credits directly to companies like Microsoft or Delta."
                                icon="ðŸ“ˆ"
                            />
                            <ReasonCard
                                title="Slash Input Costs"
                                text="High emissions = wasted resources. Our roadmap reduces fertilizer & fuel use, widening your profit margins."
                                icon="ðŸ“‰"
                            />
                            <ReasonCard
                                title="Supply Chain Survival"
                                text="Big buyers (NestlÃ©, Walmart) have 'Net Zero' targets. Use our dashboard to prove compliance."
                                icon="ðŸ”—"
                            />
                            <ReasonCard
                                title="Cheaper Green Debt"
                                text="Access subsidized, low-interest micro-loans strictly for sustainable transitions."
                                icon="ðŸ¦"
                            />
                        </div>
                    </section>

                    {/* CTA */}
                    <div className="text-center pt-12 border-t border-[#E6E2DA]">
                        <h3 className="text-2xl font-display font-bold text-[#2D3A31] mb-6 underline decoration-[#8C9A84]/30">
                            Ready to execute the Mandate?
                        </h3>
                        <button
                            onClick={() => onNavigate("register")}
                            className="px-10 py-4 btn-glass-primary text-lg font-bold shadow-2xl hover:scale-105 transition-transform"
                        >
                            Start Your Free Audit
                        </button>
                        <p className="mt-4 text-xs text-[#2D3A31]/50">No credit card required. 2-minute setup.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

const ReasonCard = ({
    title,
    text,
    icon,
}: {
    title: string;
    text: string;
    icon: string;
}) => (
    <div className="flex gap-4 p-5 rounded-2xl bg-white/50 border border-[#E6E2DA] hover:bg-white/80 transition-colors h-full min-w-0">
        <div className="text-2xl shrink-0">{icon}</div>
        <div className="min-w-0">
            <h4 className="font-bold text-[#2D3A31] text-sm mb-1 break-words">
                {title}
            </h4>
            <p className="text-xs text-[#2D3A31]/70 leading-relaxed break-words">
                {text}
            </p>
        </div>
    </div>
);

export default HowItWorksView;


