"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
    const [step, setStep] = useState(0);
    const [addressQuery, setAddressQuery] = useState("");
    const [mapsError, setMapsError] = useState<string | null>(null);
    const addressInputRef = useRef<HTMLInputElement | null>(null);

    const addField = () => {
        if (fields.length >= 4) return;
        setFields([...fields, emptyField(fields.length)]);
    };

    const removeField = (idx: number) => {
        if (fields.length <= 1) return;
        setFields(fields.filter((_, i) => i !== idx));
    };

    const updateField = useCallback((idx: number, patch: Partial<FieldConfig>) => {
        setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
    }, []);

    const updateBaseline = useCallback((idx: number, patch: Partial<BaselineInputs>) => {
        setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, baseline: { ...f.baseline, ...patch } } : f)));
    }, []);

    const validateFarmStep = (): boolean => {
        const e: Record<string, string> = {};
        if (!farm.farm_name.trim()) e.farm_name = "Farm name is required";
        if (!farm.state.trim()) e.state = "State/Region is required";
        setErrors((prev) => ({ ...prev, ...e }));
        return Object.keys(e).length === 0;
    };

    const validateAll = (): boolean => {
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

    useEffect(() => {
        if (step !== 0) return;
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            setMapsError("Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable address autocomplete.");
            return;
        }

        const initAutocomplete = () => {
            const input = addressInputRef.current;
            const googleAny = (window as Window & { google?: any }).google;
            if (!input || !googleAny?.maps?.places) return;

            const autocomplete = new googleAny.maps.places.Autocomplete(input, {
                types: ["geocode"],
                fields: ["name", "formatted_address", "address_components"],
            });

            autocomplete.addListener("place_changed", () => {
                const place = autocomplete.getPlace();
                if (!place) return;

                let region = "";
                let country = "";
                for (const component of place.address_components || []) {
                    const types = component.types || [];
                    if (types.includes("administrative_area_level_1")) region = component.long_name || component.short_name;
                    if (types.includes("country")) country = component.long_name;
                }

                const farmName = place.name || (place.formatted_address || "").split(",")[0];
                setAddressQuery(place.formatted_address || place.name || "");
                setFarm((prev) => ({
                    ...prev,
                    farm_name: farmName || prev.farm_name,
                    state: region || prev.state,
                    country: country || prev.country,
                }));
                setErrors((prev) => ({ ...prev, farm_name: "", state: "" }));
            });

            setMapsError(null);
        };

        const googleAny = (window as Window & { google?: any }).google;
        if (googleAny?.maps?.places) {
            initAutocomplete();
            return;
        }

        const existing = document.querySelector('script[data-google-maps="places"]') as HTMLScriptElement | null;
        if (existing) {
            existing.addEventListener("load", initAutocomplete);
            return () => existing.removeEventListener("load", initAutocomplete);
        }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.dataset.googleMaps = "places";
        script.onload = initAutocomplete;
        script.onerror = () => setMapsError("Unable to load Google Maps. Check your API key and Places API settings.");
        document.head.appendChild(script);
    }, [step]);

    const handleAnalyze = async () => {
        if (!validateAll()) return;
        setAnalyzing(true);
        setProgress([]);
        const dashFields: DashboardField[] = [];
        for (let i = 0; i < fields.length; i++) {
            const f = fields[i];
            setProgress((p) => [...p, `Analyzing ${f.field_name}...`]);
            let analysis: AnalyzeResponse;
            try {
                analysis = await analyzeField(f);
            } catch {
                setProgress((p) => [...p, `! Failed for ${f.field_name}, using estimates`]);
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
            setProgress((p) => [...p, `+ ${f.field_name} complete`]);
        }
        setAnalyzing(false);
        if (dashFields.length > 0) onComplete(farm, dashFields);
    };

    const inputCls = (key: string) =>
        `w-full px-3 text-sm glass-input outline-none transition-all placeholder:text-white/30 ${errors[key]
            ? "border-red-400/70 focus:shadow-[0_0_0_2px_rgba(248,113,113,0.25)]"
            : "focus:border-cyan-400"
        }`;

    return (
        <div className="min-h-screen">
            <div className="max-w-4xl mx-auto px-4 py-10 pb-16">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white">Set up your Farm</h1>
                    <p className="text-white/70 text-sm mt-1">Add your farm details and up to 4 fields for baseline analysis.</p>
                </div>

                <div className="overflow-hidden pb-2">
                    <div className="flex transition-transform duration-300" style={{ transform: `translateX(-${step * 100}%)` }}>
                        <div className="w-full shrink-0 pb-2">
                            <div className="glass-card p-6">
                                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Wheat className="h-5 w-5 text-emerald-300" />
                                    Farm Details
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-1">Farm Name <span className="text-red-400">*</span></label>
                                        <input className={inputCls("farm_name")} placeholder="Green Acres Ranch" value={farm.farm_name} onChange={(e) => { setFarm({ ...farm, farm_name: e.target.value }); setErrors({ ...errors, farm_name: "" }); }} />
                                        {errors.farm_name && <p className="text-xs text-red-300 mt-1">{errors.farm_name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-1">State / Region <span className="text-red-400">*</span></label>
                                        <input className={inputCls("state")} placeholder="Iowa" value={farm.state} onChange={(e) => { setFarm({ ...farm, state: e.target.value }); setErrors({ ...errors, state: "" }); }} />
                                        {errors.state && <p className="text-xs text-red-300 mt-1">{errors.state}</p>}
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-white/80 mb-1">Country</label>
                                        <input className={inputCls("country")} placeholder="United States" value={farm.country} onChange={(e) => setFarm({ ...farm, country: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                            <div className="glass-card p-4 mt-4">
                                <label className="block text-sm font-medium text-white/80 mb-2">Search Farm Address</label>
                                <input
                                    ref={addressInputRef}
                                    className={`${inputCls("")} w-full`}
                                    placeholder="Start typing an address..."
                                    value={addressQuery}
                                    onChange={(e) => setAddressQuery(e.target.value)}
                                />
                                <p className="text-xs text-white/55 mt-2">
                                    Selecting an address auto-fills Farm Name, State/Region, and Country.
                                </p>
                                {mapsError && <p className="text-xs text-amber-300 mt-2">{mapsError}</p>}
                            </div>
                            <div className="mt-6">
                                <button onClick={() => validateFarmStep() && setStep(1)} className="w-full py-4 btn-glass-primary font-bold text-base flex items-center justify-center gap-2">
                                    Next <ArrowRight className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="w-full shrink-0">
                            <div className="space-y-4">
                                {fields.map((field, idx) => (
                                    <div key={idx} className="glass-card p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-base font-semibold text-white flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-emerald-300" />{field.field_name || `Field ${idx + 1}`}
                                            </h3>
                                            {fields.length > 1 && (
                                                <button onClick={() => removeField(idx)} className="text-xs text-white/50 hover:text-red-300 flex items-center gap-1 transition-colors">
                                                    <Trash2 className="h-3.5 w-3.5" /> Remove
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-white/60 mb-1">Field Name *</label>
                                                <input className={inputCls(`field_${idx}_name`)} value={field.field_name} onChange={(e) => updateField(idx, { field_name: e.target.value })} />
                                                {errors[`field_${idx}_name`] && <p className="text-xs text-red-300 mt-1">{errors[`field_${idx}_name`]}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-white/60 mb-1">Crop Type</label>
                                                <div className="relative">
                                                    <select className={`${inputCls("")} appearance-none pr-8`} value={field.crop_type} onChange={(e) => updateField(idx, { crop_type: e.target.value })}>
                                                        {CROP_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-white/60 mb-1">Latitude</label>
                                                <input type="number" step="0.0001" className={inputCls("")} value={field.latitude} onChange={(e) => updateField(idx, { latitude: parseFloat(e.target.value) || 0 })} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-white/60 mb-1">Longitude</label>
                                                <input type="number" step="0.0001" className={inputCls("")} value={field.longitude} onChange={(e) => updateField(idx, { longitude: parseFloat(e.target.value) || 0 })} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-white/60 mb-1">Area *</label>
                                                <div className="flex gap-2">
                                                    <input type="number" className={`${inputCls(`field_${idx}_area`)} flex-1`} value={field.area_value} onChange={(e) => updateField(idx, { area_value: parseFloat(e.target.value) || 0 })} />
                                                    <select className="px-3 glass-input text-sm outline-none bg-black/30" value={field.area_unit} onChange={(e) => updateField(idx, { area_unit: e.target.value as "acre" | "hectare" })}>
                                                        <option value="acre" className="bg-slate-900">Acres</option>
                                                        <option value="hectare" className="bg-slate-900">Hectares</option>
                                                    </select>
                                                </div>
                                                {errors[`field_${idx}_area`] && <p className="text-xs text-red-300 mt-1">{errors[`field_${idx}_area`]}</p>}
                                            </div>
                                            <div />
                                            <div>
                                                <label className="block text-xs font-medium text-white/60 mb-1 flex items-center gap-1">
                                                    Tillage Passes <HelpCircle className="h-3 w-3 text-white/50" />
                                                </label>
                                                <input type="number" min={0} className={inputCls("")} value={field.baseline.tillage_passes} onChange={(e) => updateBaseline(idx, { tillage_passes: parseInt(e.target.value) || 0 })} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-white/60 mb-1">Fertilizer Amount</label>
                                                <div className="flex gap-2">
                                                    <input type="number" min={0} className={`${inputCls("")} flex-1`} value={field.baseline.fertilizer_amount} onChange={(e) => updateBaseline(idx, { fertilizer_amount: parseFloat(e.target.value) || 0 })} />
                                                    <select className="px-2 glass-input text-xs outline-none bg-black/30" value={field.baseline.fertilizer_unit} onChange={(e) => updateBaseline(idx, { fertilizer_unit: e.target.value as BaselineInputs["fertilizer_unit"] })}>
                                                        {FERT_UNITS.map((u) => <option key={u.value} value={u.value} className="bg-slate-900">{u.label}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-white/60 mb-1">Irrigation Events</label>
                                                <input type="number" min={0} className={inputCls("")} value={field.baseline.irrigation_events} onChange={(e) => updateBaseline(idx, { irrigation_events: parseInt(e.target.value) || 0 })} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {fields.length < 4 && (
                                    <button onClick={addField} className="w-full py-3 border-2 border-dashed border-white/20 rounded-2xl text-sm font-medium text-white/70 hover:border-emerald-400/60 hover:text-emerald-300 transition-colors flex items-center justify-center gap-2 glass-secondary">
                                        <Plus className="h-4 w-4" /> Add Field ({fields.length}/4)
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {analyzing && progress.length > 0 && (
                    <div className="mt-6 glass-card p-4 space-y-2">
                        {progress.map((msg, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                {msg.startsWith("+") ? <CheckCircle2 className="h-4 w-4 text-emerald-300 flex-shrink-0" /> : msg.startsWith("!") ? <span className="text-amber-300 flex-shrink-0">!</span> : <Loader2 className="h-4 w-4 text-cyan-300 animate-spin flex-shrink-0" />}
                                <span className="text-white/80">{msg}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-6">
                    {step === 1 && (
                        <div className="flex gap-2">
                            <button onClick={() => setStep(0)} className="w-1/3 py-4 glass-secondary rounded-full text-white/80 font-semibold">Back</button>
                            <button onClick={handleAnalyze} disabled={analyzing} className="w-2/3 py-4 btn-glass-primary font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60">
                                {analyzing ? <><Loader2 className="h-5 w-5 animate-spin" />Analyzing Fields...</> : <>Save and Run Baseline Analysis <ArrowRight className="h-5 w-5" /></>}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

