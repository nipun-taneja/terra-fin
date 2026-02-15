// ─── Identity / CRS ───────────────────────────────────────────
export interface CRSRequest {
    farmer_name: string;
    first_name?: string;
    last_name?: string;
    address?: string;
    phone?: string;
    email?: string;
    country?: string;
    farm_id?: string;
}

export interface CRSResponse {
    credible: boolean;
    score: number;
    flags: string[];
    request_id?: string;
    report?: Record<string, unknown>;
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
    analysis_id?: string;
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

export interface NumericRange {
    low: number;
    high: number;
}

export interface TimelineRange {
    min: number;
    max: number;
}

export interface FundingMeasure {
    title: string;
    why_it_helps: string;
    field_names: string[];
    implementation_steps: string[];
    capital_required_usd: NumericRange;
    annual_opex_change_usd: NumericRange;
    timeline_months: TimelineRange;
    expected_credit_uplift_tco2e_per_year: NumericRange;
    verification_evidence: string[];
    risk_level: "low" | "medium" | "high";
    notes?: string[];
}

export interface FundingOffer {
    provider_name: string;
    provider_category:
    | "bank_lender"
    | "lender"
    | "credit_union"
    | "carbon_program_marketplace"
    | "carbon_registry"
    | "public_program"
    | "credit_data_api"
    | "other";
    offer_type: string;
    best_for?: string;
    match_score_0_100: number;
    why_ranked: string[];
    estimated_terms: {
        advance_usd_range: [number, number];
        apr_range: [number, number];
        tenor_months_range: [number, number];
        repayment_source: string;
    };
    requirements: string[];
    what_to_send: string[];
    next_steps: string[];
    risks_and_notes: string[];
    links?: {
        apply_url?: string;
        contact_email?: string;
    };
}

export interface FundingOffersPayload {
    disclaimer: string;
    ranked_offers: FundingOffer[];
}

export interface FundingPathwayPayload {
    recommended_measures: FundingMeasure[];
    what_to_do_next: string[];
    appraiser_evidence_checklist: string[];
    offers: FundingOffersPayload;
    notes: string[];
}

export type AppView = "landing" | "login" | "register" | "onboarding" | "dashboard" | "how-it-works";

export interface ProfileResponse {
    email: string;
    farm: FarmConfig | null;
    fields: FieldConfig[];
    latest_analysis: AnalyzeResponse | null;
}
