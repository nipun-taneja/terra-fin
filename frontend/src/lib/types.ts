// ─── Identity / CRS ───────────────────────────────────────────
export interface CRSRequest {
    farmer_name: string;
    phone?: string;
    email?: string;
    country?: string;
    farm_id?: string;
}

export interface CRSResponse {
    credible: boolean;
    score: number;
    flags: string[];
}

// ─── Farmer registration form ────────────────────────────────
export interface FarmerIdentity {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
}

// ─── Field / Onboarding ──────────────────────────────────────
export interface BaselineInputs {
    tillage_passes: number;
    fertilizer_amount: number;
    fertilizer_unit: "lb_N_per_acre" | "kg_N_per_ha";
    irrigation_events: number;
}

export interface FieldConfig {
    field_name: string;
    latitude: number;
    longitude: number;
    area_value: number;
    area_unit: "acre" | "hectare";
    crop_type: string;
    baseline: BaselineInputs;
    project: Partial<BaselineInputs>;
}

export interface FarmConfig {
    farm_name: string;
    state: string;
    country: string;
}

export interface OnboardPayload {
    farm: FarmConfig;
    fields: FieldConfig[];
}

// ─── Backend /api/analyze request & response ─────────────────
export interface AnalyzeRequest {
    crop_type: string;
    lat: number;
    lon: number;
    farm_size_hectares: number;
    analysis_id?: string;
}

export interface RoadmapStep {
    title: string;
    why: string;
    actions: string[];
    expected_reduction_pct: [number, number];
    upfront_cost_usd: [number, number];
    timeline: string;
}

export interface AnalyzeResponse {
    location: { lat: number; lon: number };
    crop_type: string;
    satellite: {
        ndvi_mean: number;
        ndvi_trend: number;
        cropland_confidence: number;
    };
    audit: {
        emissions_percentile_est: number;
        baseline_tco2e_y: number;
    };
    roadmap: RoadmapStep[];
    reduction_summary: {
        annual_tco2e_saved: [number, number];
    };
    finance: {
        carbon_price_usd_per_t: number;
        credit_value_usd_y: [number, number];
        loan_offer_usd: [number, number];
        repayment_note: string;
    };
}

// ─── Dashboard composite types ──────────────────────────────
export interface StepItem {
    id: string;
    title: string;
    description: string;
    tips: string[];
    expectedImpact: string;
    completed: boolean;
}

export interface TimelinePoint {
    date: string;
    value: number;
}

export interface DashboardField {
    fieldName: string;
    config: FieldConfig;
    analysis: AnalyzeResponse | null;
    steps: StepItem[];
    timeline: TimelinePoint[];
    creditBalance: number;
}

export type AppView = "landing" | "login" | "register" | "onboarding" | "dashboard" | "how-it-works";
