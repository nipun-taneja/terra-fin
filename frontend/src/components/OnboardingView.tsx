"use client";

import { useState, useCallback } from "react";
import {
    Plus,
    Trash2,
    Loader2,
    MapPin,
    Wheat,
    ArrowRight,
    ChevronDown,
    HelpCircle,
    CheckCircle2,
} from "lucide-react";
import { FieldConfig, FarmConfig, BaselineInputs, AnalyzeResponse, DashboardField } from "@/lib/types";
import { analyzeField, buildStepsFromRoadmap, buildTimeline } from "@/lib/api";

interface Props {
    onComplete: (farm: FarmConfig, dashFields: DashboardField[]) => void;
}

const CROP_OPTIONS = [
    { value: "maize", label: "Corn / Maize" },
    { value: "rice", label: "Rice" },
    { value: "wheat", label: "Wheat" },
    { value: "dairy", label: "Dairy Feed" },
];

const FERT_UNITS = [
    { value: "lb_N_per_acre", label: "lb N/acre" },
    { value: "kg_N_per_ha", label: "kg N/ha" },
];

const emptyBaseline = (): BaselineInputs => ({
    tillage_passes: 2,
    fertilizer_amount: 80,
    fertilizer_unit: "lb_N_per_acre",
    irrigation_events: 4,
});

const emptyField = (index: number): FieldConfig => ({
    field_name: `Field ${String.fromCharCode(65 + index)}`,
    latitude: 40.0,
    longitude: -89.0,
    area_value: 50,
    area_unit: "acre",
    crop_type: "maize",
    baseline: emptyBaseline(),
    project: {},
});

export default function OnboardingView({ onComplete }: Props) {
    const [farm, setFarm] = useState<FarmConfig>({ farm_name: "", state: "", country: "" });
    const [fields, setFields] = useState<FieldConfig[]>([emptyField(0)]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState<string[]>([]);

    const addField = () => {
        if (fields.length >= 4) return;
        setFields([...fields, emptyField(fields.length)]);
    };

    const removeField = (idx: number) => {
        if (fields.length <= 1) return;
        setFields(fields.filter((_, i) => i !== idx));
    };

    const updateField = useCallback(
        (idx: number, patch: Partial<FieldConfig>) => {
            setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
        },
        []
    );

    const updateBaseline = useCallback(
        (idx: number, patch: Partial<BaselineInputs>) => {
            setFields((prev) =>
                prev.map((f, i) =>
                    i === idx ? { ...f, baseline: { ...f.baseline, ...patch } } : f
                )
            );
        },
        []
    );

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!farm.farm_name.trim()) e.farm_name = "Farm name is required";
        if (!farm.state.trim()) e.state = "State/Region is required";
        fields.forEach((f, i) => {
            if (!f.field_name.trim()) e[`field_${i}_name`] = "Required";
            if (f.area_value <= 0) e[`field_${i}_area`] = "Must be > 0";
        });
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleAnalyze = async () => {
        if (!validate()) return;
        setAnalyzing(true);
        setProgress([]);

        const dashFields: DashboardField[] = [];

        for (let i = 0; i < fields.length; i++) {
            const f = fields[i];
            setProgress((p) => [...p, `Analyzing ${f.field_name}…`]);

            let analysis: AnalyzeResponse;
            try {
                analysis = await analyzeField(f);
            } catch {
                setProgress((p) => [...p, `⚠ Failed for ${f.field_name}, using estimates`]);
                continue;
            }

            const creditAvg = (analysis.finance.credit_value_usd_y[0] + analysis.finance.credit_value_usd_y[1]) / 2;

            dashFields.push({
                fieldName: f.field_name,
                config: f,
                analysis,
                steps: buildStepsFromRoadmap(analysis.roadmap),
                timeline: buildTimeline(analysis.audit.baseline_tco2e_y),
                creditBalance: Math.round(creditAvg),
            });

            setProgress((p) => [...p, `✓ ${f.field_name} complete`]);
        }

        setAnalyzing(false);
        if (dashFields.length > 0) {
            onComplete(farm, dashFields);
        }
    };

    const inputCls = (key: string) =>
        `w-full px-3 py-2.5 bg-white border rounded-xl text-sm outline-none transition-all ${errors[key]
            ? "border-red-300 focus:ring-2 focus:ring-red-200"
            : "border-slate-200 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
        }`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50">
            <div className="max-w-3xl mx-auto px-4 py-10">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">Set up your Farm</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Add your farm details and up to 4 fields for baseline analysis.
                    </p>
                </div>

                {/* Farm Details */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Wheat className="h-5 w-5 text-emerald-600" />
                        Farm Details
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">
                                Farm Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                className={inputCls("farm_name")}
                                placeholder="Green Acres Ranch"
                                value={farm.farm_name}
                                onChange={(e) => { setFarm({ ...farm, farm_name: e.target.value }); setErrors({ ...errors, farm_name: "" }); }}
                            />
                            {errors.farm_name && <p className="text-xs text-red-500 mt-1">{errors.farm_name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">
                                State / Region <span className="text-red-400">*</span>
                            </label>
                            <input
                                className={inputCls("state")}
                                placeholder="Iowa"
                                value={farm.state}
                                onChange={(e) => { setFarm({ ...farm, state: e.target.value }); setErrors({ ...errors, state: "" }); }}
                            />
                            {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-600 mb-1">Country</label>
                            <input
                                className={inputCls("country")}
                                placeholder="United States"
                                value={farm.country}
                                onChange={(e) => setFarm({ ...farm, country: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Fields */}
                <div className="space-y-4">
                    {fields.map((field, idx) => (
                        <div key={idx} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-emerald-600" />
                                    {field.field_name || `Field ${idx + 1}`}
                                </h3>
                                {fields.length > 1 && (
                                    <button
                                        onClick={() => removeField(idx)}
                                        className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" /> Remove
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Field Name */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Field Name *</label>
                                    <input
                                        className={inputCls(`field_${idx}_name`)}
                                        value={field.field_name}
                                        onChange={(e) => updateField(idx, { field_name: e.target.value })}
                                    />
                                    {errors[`field_${idx}_name`] && <p className="text-xs text-red-500 mt-1">{errors[`field_${idx}_name`]}</p>}
                                </div>

                                {/* Crop Type */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Crop Type</label>
                                    <div className="relative">
                                        <select
                                            className={inputCls("") + " appearance-none pr-8"}
                                            value={field.crop_type}
                                            onChange={(e) => updateField(idx, { crop_type: e.target.value })}
                                        >
                                            {CROP_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Lat */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Latitude</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        className={inputCls("")}
                                        value={field.latitude}
                                        onChange={(e) => updateField(idx, { latitude: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                {/* Lon */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Longitude</label>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        className={inputCls("")}
                                        value={field.longitude}
                                        onChange={(e) => updateField(idx, { longitude: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>

                                {/* Area */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Area *</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            className={inputCls(`field_${idx}_area`) + " flex-1"}
                                            value={field.area_value}
                                            onChange={(e) => updateField(idx, { area_value: parseFloat(e.target.value) || 0 })}
                                        />
                                        <select
                                            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                                            value={field.area_unit}
                                            onChange={(e) => updateField(idx, { area_unit: e.target.value as "acre" | "hectare" })}
                                        >
                                            <option value="acre">Acres</option>
                                            <option value="hectare">Hectares</option>
                                        </select>
                                    </div>
                                    {errors[`field_${idx}_area`] && <p className="text-xs text-red-500 mt-1">{errors[`field_${idx}_area`]}</p>}
                                </div>

                                {/* Spacer for grid alignment */}
                                <div />

                                {/* Baseline: Tillage */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                        Tillage Passes
                                        <span className="relative group">
                                            <HelpCircle className="h-3 w-3 text-slate-400" />
                                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl z-10">
                                                Number of tillage operations per season
                                            </span>
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        className={inputCls("")}
                                        value={field.baseline.tillage_passes}
                                        onChange={(e) => updateBaseline(idx, { tillage_passes: parseInt(e.target.value) || 0 })}
                                    />
                                </div>

                                {/* Baseline: Fertilizer */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                        Fertilizer Amount
                                        <span className="relative group">
                                            <HelpCircle className="h-3 w-3 text-slate-400" />
                                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl z-10">
                                                Total nitrogen applied per season
                                            </span>
                                        </span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            min={0}
                                            className={inputCls("") + " flex-1"}
                                            value={field.baseline.fertilizer_amount}
                                            onChange={(e) => updateBaseline(idx, { fertilizer_amount: parseFloat(e.target.value) || 0 })}
                                        />
                                        <select
                                            className="px-2 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                                            value={field.baseline.fertilizer_unit}
                                            onChange={(e) => updateBaseline(idx, { fertilizer_unit: e.target.value as BaselineInputs["fertilizer_unit"] })}
                                        >
                                            {FERT_UNITS.map((u) => (
                                                <option key={u.value} value={u.value}>{u.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Baseline: Irrigation */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Irrigation Events</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className={inputCls("")}
                                        value={field.baseline.irrigation_events}
                                        onChange={(e) => updateBaseline(idx, { irrigation_events: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Add field button */}
                    {fields.length < 4 && (
                        <button
                            onClick={addField}
                            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-medium text-slate-500 hover:border-emerald-300 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="h-4 w-4" /> Add Field ({fields.length}/4)
                        </button>
                    )}
                </div>

                {/* Progress */}
                {analyzing && progress.length > 0 && (
                    <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
                        {progress.map((msg, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                {msg.startsWith("✓") ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                ) : msg.startsWith("⚠") ? (
                                    <span className="text-amber-500 flex-shrink-0">⚠</span>
                                ) : (
                                    <Loader2 className="h-4 w-4 text-emerald-500 animate-spin flex-shrink-0" />
                                )}
                                <span className="text-slate-600">{msg}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* CTA */}
                <div className="mt-6">
                    <button
                        onClick={handleAnalyze}
                        disabled={analyzing}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-emerald-600/20"
                    >
                        {analyzing ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Analyzing Fields…
                            </>
                        ) : (
                            <>
                                Save & Run Baseline Analysis
                                <ArrowRight className="h-5 w-5" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
