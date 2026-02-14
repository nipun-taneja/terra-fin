import {
    CRSRequest,
    CRSResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    FieldConfig,
    FarmConfig,
    StepItem,
    TimelinePoint,
    ProfileResponse,
    DashboardField,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── CRS Identity Verification ──────────────────────────────
export async function verifyCRS(req: CRSRequest): Promise<CRSResponse> {
    // TODO: swap mock for real when backend /api/credibility/check is production-ready
    try {
        const res = await fetch(`${API_BASE}/api/credibility/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
        });
        if (!res.ok) throw new Error(`CRS check failed: ${res.status}`);
        return res.json();
    } catch {
        // Mock fallback for demo
        console.warn("[api] CRS call failed, using mock");
        await delay(1500);
        return { credible: true, score: 0.85, flags: [] };
    }
}

// ─── Field Analysis ──────────────────────────────────────────
export async function analyzeField(field: FieldConfig): Promise<AnalyzeResponse> {
    const hectares =
        field.area_unit === "acre"
            ? field.area_value * 0.404686
            : field.area_value;

    const payload: AnalyzeRequest = {
        crop_type: field.crop_type === "corn" ? "maize" : field.crop_type,
        lat: field.latitude,
        lon: field.longitude,
        farm_size_hectares: hectares,
    };

    try {
        const res = await fetch(`${API_BASE}/api/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `Analyze failed: ${res.status}`);
        }
        return res.json();
    } catch (e) {
        console.warn("[api] analyze call failed, using mock:", e);
        await delay(2000);
        return mockAnalyzeResponse(field);
    }
}

// ─── User Profile / Persistence ──────────────────────────────
export async function loadProfile(email: string): Promise<ProfileResponse> {
    const res = await fetch(`${API_BASE}/api/profile/load?email=${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error(`Failed to load profile: ${res.status}`);
    return res.json();
}

export async function saveProfileLink(email: string, analysisId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/profile/save?email=${encodeURIComponent(email)}&analysis_id=${encodeURIComponent(analysisId)}`, {
        method: "POST"
    });
    if (!res.ok) throw new Error(`Failed to save profile link: ${res.status}`);
}

export async function saveFarm(email: string, farm: FarmConfig, fields: FieldConfig[]): Promise<void> {
    const res = await fetch(`${API_BASE}/api/profile/save-farm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, farm, fields }),
    });
    if (!res.ok) throw new Error(`Failed to save farm: ${res.status}`);
}

// ─── Helpers ─────────────────────────────────────────────────
function delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

export function buildStepsFromRoadmap(roadmap: AnalyzeResponse["roadmap"]): StepItem[] {
    return roadmap.map((r, i) => ({
        id: `step-${i}`,
        title: r.title,
        description: r.why,
        tips: r.actions,
        expectedImpact: `${r.expected_reduction_pct[0]}–${r.expected_reduction_pct[1]}% reduction`,
        completed: false,
    }));
}

export function buildTimeline(baseline: number): TimelinePoint[] {
    const now = new Date();
    const points: TimelinePoint[] = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - (5 - i));
        points.push({
            date: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
            value: Math.round(baseline * (0.98 + Math.random() * 0.04) * 100) / 100,
        });
    }
    return points;
}

export function buildDashboardFields(
    fields: FieldConfig[],
    analysis: AnalyzeResponse | null
): DashboardField[] {
    if (!analysis) return [];
    const creditAvg = (analysis.finance.credit_value_usd_y[0] + analysis.finance.credit_value_usd_y[1]) / 2;
    return fields.map((f) => ({
        fieldName: f.field_name,
        config: f,
        analysis,
        steps: buildStepsFromRoadmap(analysis.roadmap),
        timeline: buildTimeline(analysis.audit.baseline_tco2e_y),
        creditBalance: Math.round(creditAvg),
    }));
}

// ─── Mock for offline dev ────────────────────────────────────
function mockAnalyzeResponse(field: FieldConfig): AnalyzeResponse {
    const ha =
        field.area_unit === "acre"
            ? field.area_value * 0.404686
            : field.area_value;
    const baseline = Math.round(ha * 2.5 * 100) / 100;
    return {
        analysis_id: `mock-ana-${Date.now()}`,
        location: { lat: field.latitude, lon: field.longitude },
        crop_type: "maize",
        satellite: { ndvi_mean: 0.62, ndvi_trend: 0.03, cropland_confidence: 0.88 },
        audit: { emissions_percentile_est: 65, baseline_tco2e_y: baseline },
        roadmap: [
            {
                title: "Optimize nitrogen application",
                why: "Reduce excess nitrogen losses that increase N₂O emissions.",
                actions: ["Soil test before fertilization", "Split nitrogen applications"],
                expected_reduction_pct: [8, 18],
                upfront_cost_usd: [100, 600],
                timeline: "0–3 months",
            },
            {
                title: "Adopt reduced tillage",
                why: "Lower fuel usage and improve soil structure.",
                actions: ["Switch to strip-till", "Track fuel savings per hectare"],
                expected_reduction_pct: [3, 10],
                upfront_cost_usd: [0, 1500],
                timeline: "3–12 months",
            },
            {
                title: "Introduce cover crops",
                why: "Improve soil health and reduce fertilizer dependency.",
                actions: ["Pilot on one field", "Choose regionally appropriate cover species"],
                expected_reduction_pct: [2, 8],
                upfront_cost_usd: [200, 1200],
                timeline: "Next season",
            },
        ],
        reduction_summary: { annual_tco2e_saved: [baseline * 0.1, baseline * 0.3] },
        finance: {
            carbon_price_usd_per_t: 20,
            credit_value_usd_y: [baseline * 0.1 * 20, baseline * 0.3 * 20],
            loan_offer_usd: [baseline * 0.1 * 12, baseline * 0.3 * 12],
            repayment_note: "Offer assumes forward sale of projected reductions with a risk haircut.",
        },
    };
}
