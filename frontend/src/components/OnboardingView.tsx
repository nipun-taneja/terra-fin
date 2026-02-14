"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
    Plus,
    Trash2,
    Loader2,
    Wheat,
    ArrowRight,
    ChevronDown,
    HelpCircle,
    CheckCircle2,
} from "lucide-react";
import { FieldConfig, FarmConfig, BaselineInputs, AnalyzeResponse, DashboardField } from "@/lib/types";
import { analyzeField, buildStepsFromRoadmap, buildTimeline, saveFarm, saveProfileLink } from "@/lib/api";

interface Props {
    onComplete: (farm: FarmConfig, dashFields: DashboardField[]) => void;
    initialFarm?: FarmConfig | null;
    initialFields?: DashboardField[];
    initialStep?: number;
    userEmail?: string | null;
}

interface LngLatLike {
    lng: number;
    lat: number;
}

interface MapboxMapLike {
    addControl: (control: unknown, position?: string) => void;
    flyTo: (opts: { center: [number, number]; zoom: number; essential: boolean }) => void;
    getCenter: () => LngLatLike;
    on: {
        (event: "click", cb: (evt: { lngLat: LngLatLike }) => void): void;
        (event: "load", cb: () => void): void;
        (event: "error", cb: (evt: { error?: { message?: string } }) => void): void;
        (event: "draw.create" | "draw.update" | "draw.delete", cb: () => void): void;
    };
    remove: () => void;
}

interface MapboxMarkerLike {
    setLngLat: (coords: [number, number]) => MapboxMarkerLike;
    addTo: (map: MapboxMapLike) => MapboxMarkerLike;
    on: (event: "dragend", cb: () => void) => void;
    getLngLat: () => LngLatLike;
}

interface MapboxGlLike {
    accessToken: string;
    Map: new (opts: { container: HTMLElement; style: string; center: [number, number]; zoom: number }) => MapboxMapLike;
    Marker: new (opts: { draggable: boolean }) => MapboxMarkerLike;
    NavigationControl: new () => unknown;
    GeolocateControl: new (opts: {
        positionOptions: { enableHighAccuracy: boolean };
        trackUserLocation: boolean;
        showUserHeading: boolean;
    }) => unknown;
}

interface GeocoderContextLike {
    id?: string;
    text?: string;
    short_code?: string;
}

interface MapboxFeatureLike {
    id: string;
    center?: [number, number];
    text?: string;
    place_name?: string;
    context?: GeocoderContextLike[];
}

interface GeocodeResponse {
    features?: MapboxFeatureLike[];
}

interface GeoJsonGeometryLike {
    type: string;
    coordinates?: unknown;
}

interface GeoJsonFeatureLike {
    geometry?: GeoJsonGeometryLike;
}

interface GeoJsonFeatureCollectionLike {
    features: GeoJsonFeatureLike[];
}

interface MapboxDrawLike {
    getAll: () => GeoJsonFeatureCollectionLike;
    getMode: () => string;
}

interface MapboxDrawCtor {
    new(opts: {
        displayControlsDefault: boolean;
        controls: {
            polygon: boolean;
            trash: boolean;
        };
    }): MapboxDrawLike;
}

interface TurfLike {
    area: (feature: GeoJsonFeatureLike) => number;
    centroid: (feature: GeoJsonFeatureLike) => { geometry?: { coordinates?: [number, number] } };
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

const FIELD_DEFAULT_NAMES = ["North Field", "South Field", "East Field", "West Field"];

const emptyField = (index: number): FieldConfig => ({
    field_name: FIELD_DEFAULT_NAMES[index] || `Field ${index + 1}`,
    latitude: 40.0,
    longitude: -89.0,
    area_value: 50,
    area_unit: "acre",
    crop_type: "maize",
    baseline: emptyBaseline(),
    project: {},
});

const makeSessionToken = (): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function OnboardingView({ onComplete, initialFarm, initialFields, initialStep = 0, userEmail }: Props) {
    const [farm, setFarm] = useState<FarmConfig>(
        initialFarm ? { ...initialFarm } : { farm_name: "", state: "", country: "" }
    );
    const [fields, setFields] = useState<FieldConfig[]>(
        initialFields && initialFields.length > 0
            ? initialFields.map((f) => ({ ...f.config }))
            : [emptyField(0)]
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState<string[]>([]);
    const [step, setStep] = useState(initialStep);

    const [addressQuery, setAddressQuery] = useState("");
    const [addressSuggestions, setAddressSuggestions] = useState<MapboxFeatureLike[]>([]);
    const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
    const [isSearchingAddress, setIsSearchingAddress] = useState(false);
    const [mapsError, setMapsError] = useState<string | null>(null);
    const [veteranStatus, setVeteranStatus] = useState("no");
    const [farmTenure, setFarmTenure] = useState("owned");
    const [activeFieldTab, setActiveFieldTab] = useState(0);

    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MapboxMapLike | null>(null);
    const markerRef = useRef<MapboxMarkerLike | null>(null);
    const mapboxRef = useRef<MapboxGlLike | null>(null);
    const drawRef = useRef<MapboxDrawLike | null>(null);
    const searchWrapRef = useRef<HTMLDivElement | null>(null);
    const sessionTokenRef = useRef<string>(makeSessionToken());
    const activeField = fields[activeFieldTab] || fields[0];

    const addField = () => {
        if (fields.length >= 4) return;
        const nextIndex = fields.length;
        const seed = fields[0] || emptyField(0);
        const nextField = {
            ...emptyField(nextIndex),
            latitude: seed.latitude,
            longitude: seed.longitude,
        };
        setFields([...fields, nextField]);
        setActiveFieldTab(nextIndex);
    };

    const removeField = (idx: number) => {
        if (fields.length <= 1) return;
        const next = fields.filter((_, i) => i !== idx);
        setFields(next);
        setActiveFieldTab((prev) => Math.max(0, Math.min(prev > idx ? prev - 1 : prev, next.length - 1)));
    };

    const updateField = useCallback((idx: number, patch: Partial<FieldConfig>) => {
        setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
    }, []);

    const updateBaseline = useCallback((idx: number, patch: Partial<BaselineInputs>) => {
        setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, baseline: { ...f.baseline, ...patch } } : f)));
    }, []);

    const reverseGeocodeAndSyncFarm = useCallback(async (lng: number, lat: number) => {
        const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
        if (!accessToken) return;
        try {
            const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`;
            const params = new URLSearchParams({
                access_token: accessToken,
                types: "address,place,region,country",
                limit: "1",
            });
            const response = await fetch(`${endpoint}?${params.toString()}`);
            if (!response.ok) return;
            const data = (await response.json()) as GeocodeResponse;
            const feature = data.features?.[0];
            if (!feature) return;

            let region = "";
            let country = "";
            for (const c of feature.context || []) {
                if (typeof c.id === "string" && c.id.startsWith("region")) region = c.text || c.short_code || "";
                if (typeof c.id === "string" && c.id.startsWith("country")) country = c.text || "";
            }

            const farmName = (feature.text || feature.place_name || "").split(",")[0];
            setAddressQuery(feature.place_name || feature.text || "");
            setFarm((prev) => ({
                ...prev,
                farm_name: farmName || prev.farm_name,
                state: region || prev.state,
                country: country || prev.country,
            }));
            setErrors((prev) => ({ ...prev, farm_name: "", state: "" }));
        } catch {
            // Keep existing values if reverse geocoding fails.
        }
    }, []);

    const setPrimaryFieldCoords = useCallback((lng: number, lat: number) => {
        setFields((prev) =>
            prev.map((f, i) =>
                i === 0
                    ? {
                        ...f,
                        latitude: Number(lat.toFixed(6)),
                        longitude: Number(lng.toFixed(6)),
                    }
                    : f
            )
        );
    }, []);

    const updatePrimaryFieldAreaFromSquareMeters = useCallback((areaM2: number) => {
        setFields((prev) =>
            prev.map((f, i) => {
                if (i !== 0) return f;
                const areaValue = f.area_unit === "acre" ? areaM2 / 4046.8564224 : areaM2 / 10000;
                return {
                    ...f,
                    area_value: Number(areaValue.toFixed(2)),
                };
            })
        );
    }, []);

    const setMarker = useCallback((lng: number, lat: number) => {
        const map = mapRef.current;
        const mapboxgl = mapboxRef.current;
        if (!map || !mapboxgl) return;

        if (!markerRef.current) {
            markerRef.current = new mapboxgl.Marker({ draggable: true }).setLngLat([lng, lat]).addTo(map);
            markerRef.current.on("dragend", () => {
                const pos = markerRef.current?.getLngLat();
                if (!pos) return;
                setPrimaryFieldCoords(pos.lng, pos.lat);
                reverseGeocodeAndSyncFarm(pos.lng, pos.lat);
            });
        } else {
            markerRef.current.setLngLat([lng, lat]);
        }
    }, [reverseGeocodeAndSyncFarm, setPrimaryFieldCoords]);

    const applySelectedFeature = useCallback((feature: MapboxFeatureLike) => {
        const [lng, lat] = feature.center || [];
        if (typeof lng !== "number" || typeof lat !== "number") return;

        let region = "";
        let country = "";
        for (const c of feature.context || []) {
            if (typeof c.id === "string" && c.id.startsWith("region")) region = c.text || c.short_code || "";
            if (typeof c.id === "string" && c.id.startsWith("country")) country = c.text || "";
        }

        const farmName = (feature.text || feature.place_name || "").split(",")[0];
        const placeName = feature.place_name || feature.text || "";
        setAddressQuery(placeName);
        setFarm((prev) => ({
            ...prev,
            farm_name: farmName || prev.farm_name,
            state: region || prev.state,
            country: country || prev.country,
        }));
        setErrors((prev) => ({ ...prev, farm_name: "", state: "" }));

        setMarker(lng, lat);
        setPrimaryFieldCoords(lng, lat);
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, essential: true });
    }, [setMarker, setPrimaryFieldCoords]);

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
        if (activeFieldTab > fields.length - 1) {
            setActiveFieldTab(Math.max(0, fields.length - 1));
        }
    }, [activeFieldTab, fields.length]);

    useEffect(() => {
        const onDocumentClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!searchWrapRef.current?.contains(target)) {
                setShowAddressSuggestions(false);
            }
        };
        document.addEventListener("mousedown", onDocumentClick);
        return () => document.removeEventListener("mousedown", onDocumentClick);
    }, []);

    useEffect(() => {
        if (step !== 0) return;

        const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
        if (!accessToken) {
            setMapsError("Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to enable address autocomplete.");
            return;
        }
        if (accessToken.startsWith("sk.")) {
            setMapsError("Use a public Mapbox token (starts with pk.) for browser maps. Secret tokens (sk.) will show a gray map.");
            return;
        }

        const loadStylesheet = (id: string, href: string) => {
            if (document.getElementById(id)) return;
            const link = document.createElement("link");
            link.id = id;
            link.rel = "stylesheet";
            link.href = href;
            document.head.appendChild(link);
        };

        const loadScript = (selector: string, src: string) =>
            new Promise<void>((resolve, reject) => {
                const existing = document.querySelector(selector) as HTMLScriptElement | null;
                if (existing) {
                    if (existing.dataset.loaded === "true") {
                        resolve();
                        return;
                    }
                    existing.addEventListener("load", () => resolve(), { once: true });
                    existing.addEventListener("error", () => reject(new Error("script load failed")), { once: true });
                    return;
                }

                const script = document.createElement("script");
                script.src = src;
                script.async = true;
                script.defer = true;
                script.dataset.loaded = "false";
                if (selector.includes("mapbox-gl=\"true\"")) script.dataset.mapboxGl = "true";
                if (selector.includes("mapbox-gl-draw=\"true\"")) script.dataset.mapboxGlDraw = "true";
                if (selector.includes("data-turf=\"true\"")) script.dataset.turf = "true";
                script.onload = () => {
                    script.dataset.loaded = "true";
                    resolve();
                };
                script.onerror = () => reject(new Error("script load failed"));
                document.head.appendChild(script);
            });

        let cancelled = false;

        const init = async () => {
            try {
                loadStylesheet("mapbox-gl-css", "https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.css");
                loadStylesheet(
                    "mapbox-gl-draw-css",
                    "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.5.0/mapbox-gl-draw.css"
                );
                await loadScript('script[data-mapbox-gl="true"]', "https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.js");
                await loadScript(
                    'script[data-mapbox-gl-draw="true"]',
                    "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.5.0/mapbox-gl-draw.js"
                );
                await loadScript(
                    'script[data-turf=\"true\"]',
                    "https://cdn.jsdelivr.net/npm/@turf/turf@7.1.0/turf.min.js"
                );
            } catch {
                setMapsError("Unable to load Mapbox scripts. Check your token and network.");
                return;
            }

            if (cancelled || !mapContainerRef.current) return;

            const mapboxgl = (window as Window & { mapboxgl?: MapboxGlLike }).mapboxgl;
            const MapboxDraw = (window as Window & { MapboxDraw?: MapboxDrawCtor }).MapboxDraw;
            const turf = (window as Window & { turf?: TurfLike }).turf;
            if (!mapboxgl || !MapboxDraw || !turf) {
                setMapsError("Mapbox did not initialize correctly.");
                return;
            }

            mapboxgl.accessToken = accessToken;
            mapboxRef.current = mapboxgl;

            const map = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: "mapbox://styles/mapbox/satellite-streets-v12",
                center: [-95.7129, 37.0902],
                zoom: 3,
            });
            mapRef.current = map;

            const draw = new MapboxDraw({
                displayControlsDefault: false,
                controls: { polygon: true, trash: true },
            });
            drawRef.current = draw;
            map.addControl(draw, "top-left");

            const applyDrawnShapeToField = () => {
                const all = draw.getAll();
                const polygon = all.features.find((feature) => {
                    const geometryType = feature.geometry?.type;
                    return geometryType === "Polygon" || geometryType === "MultiPolygon";
                });
                if (!polygon) return;

                const areaM2 = turf.area(polygon);
                const centroid = turf.centroid(polygon);
                const coords = centroid.geometry?.coordinates;
                if (!coords || coords.length < 2) return;

                const [lng, lat] = coords;
                setMarker(lng, lat);
                setPrimaryFieldCoords(lng, lat);
                updatePrimaryFieldAreaFromSquareMeters(areaM2);
                reverseGeocodeAndSyncFarm(lng, lat);
            };

            map.on("click", (evt: { lngLat: LngLatLike }) => {
                if (draw.getMode() !== "simple_select") return;
                const { lng, lat } = evt.lngLat;
                setMarker(lng, lat);
                setPrimaryFieldCoords(lng, lat);
                reverseGeocodeAndSyncFarm(lng, lat);
            });
            map.on("draw.create", applyDrawnShapeToField);
            map.on("draw.update", applyDrawnShapeToField);
            map.on("draw.delete", () => {
                drawRef.current = draw;
            });

            map.on("load", () => setMapsError(null));
            map.on("error", (evt: { error?: { message?: string } }) => {
                const message = evt.error?.message || "Map tiles failed to load. Check token scopes and URL restrictions.";
                setMapsError(message);
            });
            map.addControl(new mapboxgl.NavigationControl(), "top-right");
            map.addControl(
                new mapboxgl.GeolocateControl({
                    positionOptions: { enableHighAccuracy: true },
                    trackUserLocation: false,
                    showUserHeading: true,
                }),
                "top-right"
            );
        };

        init();

        return () => {
            cancelled = true;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            markerRef.current = null;
            drawRef.current = null;
            mapboxRef.current = null;
        };
    }, [reverseGeocodeAndSyncFarm, setMarker, setPrimaryFieldCoords, step, updatePrimaryFieldAreaFromSquareMeters]);

    useEffect(() => {
        if (step !== 0) return;
        const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
        const query = addressQuery.trim();

        if (!accessToken || query.length < 3) {
            setAddressSuggestions([]);
            setIsSearchingAddress(false);
            return;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(async () => {
            setIsSearchingAddress(true);
            try {
                const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
                const params = new URLSearchParams({
                    access_token: accessToken,
                    autocomplete: "true",
                    limit: "5",
                    types: "address,place,locality,postcode",
                    session_token: sessionTokenRef.current,
                });
                const response = await fetch(`${endpoint}?${params.toString()}`, { signal: controller.signal });
                if (!response.ok) throw new Error("mapbox geocoding failed");
                const data = (await response.json()) as GeocodeResponse;
                setAddressSuggestions(data.features || []);
            } catch {
                if (!controller.signal.aborted) setAddressSuggestions([]);
            } finally {
                if (!controller.signal.aborted) setIsSearchingAddress(false);
            }
        }, 250);

        return () => {
            controller.abort();
            window.clearTimeout(timeout);
        };
    }, [addressQuery, step]);

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
                if (userEmail && analysis.analysis_id) {
                    await saveProfileLink(userEmail, analysis.analysis_id);
                }
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

        if (userEmail && dashFields.length > 0) {
            try {
                await saveFarm(userEmail, farm, fields);
            } catch (e) {
                console.warn("[Onboarding] Failed to save farm to profile:", e);
            }
        }

        setAnalyzing(false);
        if (dashFields.length > 0) onComplete(farm, dashFields);
    };

    const inputCls = (key: string) =>
        `w-full px-3 text-sm glass-input outline-none transition-all placeholder:text-white/30 ${errors[key]
            ? "border-red-400/70 focus:shadow-[0_0_0_2px_rgba(248,113,113,0.25)]"
            : "focus:border-[#8C9A84]"
        }`;

    return (
        <div className="min-h-screen botanical-reveal">
            <div className="max-w-4xl mx-auto px-4 py-8 pb-10">
                <div className="overflow-hidden pb-2">
                    {step === 0 && (
                        <div className="w-full pb-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 items-stretch gap-5">
                                <div className="glass-card card-lift p-6 order-1 h-full min-h-[500px] flex flex-col">
                                    <div className="relative" ref={searchWrapRef}>
                                        <input
                                            className={`${inputCls("")} w-full`}
                                            placeholder="Search Farm Address"
                                            value={addressQuery}
                                            onChange={(e) => {
                                                setAddressQuery(e.target.value);
                                                setShowAddressSuggestions(true);
                                            }}
                                            onFocus={() => setShowAddressSuggestions(true)}
                                        />
                                        {showAddressSuggestions && (addressSuggestions.length > 0 || isSearchingAddress) && (
                                            <div className="absolute z-20 mt-2 w-full rounded-xl border border-[#E6E2DA] bg-white/95 backdrop-blur-md overflow-hidden shadow-xl">
                                                {isSearchingAddress && (
                                                    <div className="px-3 py-2 text-xs text-[#2D3A31]/60">Searching...</div>
                                                )}
                                                {!isSearchingAddress && addressSuggestions.map((feature) => (
                                                    <button
                                                        key={feature.id}
                                                        type="button"
                                                        className="w-full text-left px-3 py-2 text-sm text-[#2D3A31]/85 hover:bg-[#DCCFC2]/35"
                                                        onClick={() => {
                                                            applySelectedFeature(feature);
                                                            setShowAddressSuggestions(false);
                                                            setAddressSuggestions([]);
                                                            sessionTokenRef.current = makeSessionToken();
                                                        }}
                                                    >
                                                        {feature.place_name || feature.text}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div ref={mapContainerRef} className="mt-3 w-full flex-1 min-h-[320px] rounded-2xl border border-[#E6E2DA] overflow-hidden image-drift" />
                                    {mapsError && <p className="text-xs text-[#C27B66] mt-2">{mapsError}</p>}
                                </div>
                                <div className="glass-card card-lift p-6 order-2 h-full min-h-[500px] flex flex-col">
                                    <h2 className="text-lg font-semibold text-[#2D3A31] mb-3 flex items-center gap-2">
                                        <Wheat className="h-5 w-5 text-[#8C9A84]" />
                                        Farm Details
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start content-start flex-1">
                                        <div>
                                            <label className="block text-sm font-medium text-[#2D3A31]/80 mb-1">Farm Name <span className="text-red-400">*</span></label>
                                            <input className={inputCls("farm_name")} placeholder="Green Acres Ranch" value={farm.farm_name} onChange={(e) => { setFarm({ ...farm, farm_name: e.target.value }); setErrors({ ...errors, farm_name: "" }); }} />
                                            {errors.farm_name && <p className="text-xs text-red-300 mt-1">{errors.farm_name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[#2D3A31]/80 mb-1">State / Region <span className="text-red-400">*</span></label>
                                            <input className={inputCls("state")} placeholder="Iowa" value={farm.state} onChange={(e) => { setFarm({ ...farm, state: e.target.value }); setErrors({ ...errors, state: "" }); }} />
                                            {errors.state && <p className="text-xs text-red-300 mt-1">{errors.state}</p>}
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium text-[#2D3A31]/80 mb-1">Country</label>
                                            <input className={inputCls("country")} placeholder="United States" value={farm.country} onChange={(e) => setFarm({ ...farm, country: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[#2D3A31]/80 mb-1">
                                                <span className="inline-flex items-center gap-1">
                                                    Veteran Status
                                                    <span className="relative group inline-flex">
                                                        <HelpCircle className="h-3.5 w-3.5 text-[#2D3A31]/60" />
                                                        <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-52 -translate-x-1/2 rounded-md border border-[#E6E2DA] bg-white/95 px-2 py-1 text-[11px] text-[#2D3A31]/85 opacity-0 transition-opacity group-hover:opacity-100">
                                                            Better credit access for those who served.
                                                        </span>
                                                    </span>
                                                </span>
                                            </label>
                                            <select
                                                className={`${inputCls("")} appearance-none`}
                                                value={veteranStatus}
                                                onChange={(e) => setVeteranStatus(e.target.value)}
                                            >
                                                <option value="yes" className="bg-white">Yes</option>
                                                <option value="no" className="bg-white">No</option>
                                                <option value="prefer_not" className="bg-white">Prefer not to say</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[#2D3A31]/80 mb-1">
                                                <span className="inline-flex items-center gap-1">
                                                    Farm Tenure
                                                    <span className="relative group inline-flex">
                                                        <HelpCircle className="h-3.5 w-3.5 text-[#2D3A31]/60" />
                                                        <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-56 -translate-x-1/2 rounded-md border border-[#E6E2DA] bg-white/95 px-2 py-1 text-[11px] text-[#2D3A31]/85 opacity-0 transition-opacity group-hover:opacity-100">
                                                            So that your carbon credits stay with you wherever you farm.
                                                        </span>
                                                    </span>
                                                </span>
                                            </label>
                                            <select
                                                className={`${inputCls("")} appearance-none`}
                                                value={farmTenure}
                                                onChange={(e) => setFarmTenure(e.target.value)}
                                            >
                                                <option value="owned" className="bg-white">Owned</option>
                                                <option value="leased" className="bg-white">Leased</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => validateFarmStep() && setStep(1)}
                                            aria-label="Next"
                                            className="h-11 w-11 rounded-full btn-glass-primary flex items-center justify-center"
                                        >
                                            <ArrowRight className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="w-full">
                            <div className="glass-card card-lift p-4">
                                <div className="flex items-center justify-between gap-3 border-b border-[#E6E2DA] pb-3 mb-4">
                                    <div className="flex gap-2 overflow-x-auto pr-1">
                                        {fields.map((f, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setActiveFieldTab(idx)}
                                                className={`px-3 py-1.5 text-xs rounded-full border transition-colors whitespace-nowrap ${idx === activeFieldTab
                                                    ? "bg-[#8C9A84]/15 border-[#8C9A84] text-[#2D3A31]"
                                                    : "bg-white border-[#E6E2DA] text-[#2D3A31]/70 hover:border-[#8C9A84]"
                                                    }`}
                                            >
                                                {f.field_name || `Field ${idx + 1}`}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {fields.length > 1 && (
                                            <button
                                                onClick={() => removeField(activeFieldTab)}
                                                className="text-xs text-[#2D3A31]/60 hover:text-red-500 flex items-center gap-1 transition-colors"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" /> Remove
                                            </button>
                                        )}
                                        {fields.length < 4 && (
                                            <button
                                                onClick={addField}
                                                className="px-3 py-1.5 text-xs rounded-full border border-[#DCCFC2] text-[#2D3A31]/75 hover:border-[#8C9A84] hover:text-[#8C9A84] transition-colors flex items-center gap-1"
                                            >
                                                <Plus className="h-3.5 w-3.5" /> Add
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {activeField && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[#2D3A31]/60 mb-1">Field Name *</label>
                                            <input className={inputCls(`field_${activeFieldTab}_name`)} value={activeField.field_name} onChange={(e) => updateField(activeFieldTab, { field_name: e.target.value })} />
                                            {errors[`field_${activeFieldTab}_name`] && <p className="text-xs text-red-300 mt-1">{errors[`field_${activeFieldTab}_name`]}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#2D3A31]/60 mb-1">Crop Type</label>
                                            <div className="relative">
                                                <select className={`${inputCls("")} appearance-none pr-8`} value={activeField.crop_type} onChange={(e) => updateField(activeFieldTab, { crop_type: e.target.value })}>
                                                    {CROP_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-white">{o.label}</option>)}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2D3A31]/50 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#2D3A31]/60 mb-1">Lat / Long</label>
                                            <div className="h-[46px] px-3 rounded-full border border-[#E6E2DA] bg-[#F2EFE8]/70 flex items-center text-sm text-[#2D3A31]/80">
                                                {Number.isFinite(activeField.latitude) && Number.isFinite(activeField.longitude)
                                                    ? `${activeField.latitude.toFixed(6)} / ${activeField.longitude.toFixed(6)}`
                                                    : "-"}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#2D3A31]/60 mb-1">Area *</label>
                                            <div className="flex gap-2">
                                                <input type="number" className={`${inputCls(`field_${activeFieldTab}_area`)} flex-1`} value={activeField.area_value} onChange={(e) => updateField(activeFieldTab, { area_value: parseFloat(e.target.value) || 0 })} />
                                                <select className="px-3 glass-input text-sm outline-none bg-white/80" value={activeField.area_unit} onChange={(e) => updateField(activeFieldTab, { area_unit: e.target.value as "acre" | "hectare" })}>
                                                    <option value="acre" className="bg-white">Acres</option>
                                                    <option value="hectare" className="bg-white">Hectares</option>
                                                </select>
                                            </div>
                                            {errors[`field_${activeFieldTab}_area`] && <p className="text-xs text-red-300 mt-1">{errors[`field_${activeFieldTab}_area`]}</p>}
                                        </div>
                                        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-[#2D3A31]/60 mb-1 flex items-center gap-1">
                                                    Tillage Passes <HelpCircle className="h-3 w-3 text-[#2D3A31]/50" />
                                                </label>
                                                <input type="number" min={0} className={inputCls("")} value={activeField.baseline.tillage_passes} onChange={(e) => updateBaseline(activeFieldTab, { tillage_passes: parseInt(e.target.value) || 0 })} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-[#2D3A31]/60 mb-1">Fertilizer Amount</label>
                                                <div className="flex gap-2">
                                                    <input type="number" min={0} className={`${inputCls("")} flex-1`} value={activeField.baseline.fertilizer_amount} onChange={(e) => updateBaseline(activeFieldTab, { fertilizer_amount: parseFloat(e.target.value) || 0 })} />
                                                    <select className="px-2 glass-input text-xs outline-none bg-white/80" value={activeField.baseline.fertilizer_unit} onChange={(e) => updateBaseline(activeFieldTab, { fertilizer_unit: e.target.value as BaselineInputs["fertilizer_unit"] })}>
                                                        {FERT_UNITS.map((u) => <option key={u.value} value={u.value} className="bg-white">{u.label}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-[#2D3A31]/60 mb-1">Irrigation Events</label>
                                                <input type="number" min={0} className={inputCls("")} value={activeField.baseline.irrigation_events} onChange={(e) => updateBaseline(activeFieldTab, { irrigation_events: parseInt(e.target.value) || 0 })} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {analyzing && progress.length > 0 && (
                    <div className="mt-6 glass-card p-4 space-y-2">
                        {progress.map((msg, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                {msg.startsWith("+") ? <CheckCircle2 className="h-4 w-4 text-[#8C9A84] flex-shrink-0" /> : msg.startsWith("!") ? <span className="text-[#C27B66] flex-shrink-0">!</span> : <Loader2 className="h-4 w-4 text-[#C27B66] animate-spin flex-shrink-0" />}
                                <span className="text-[#2D3A31]/80">{msg}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-3">
                    {step === 1 && (
                        <div className="flex gap-2">
                            <button onClick={() => setStep(0)} className="w-1/3 py-3 glass-secondary rounded-full text-[#2D3A31]/80 font-semibold">Back</button>
                            <button onClick={handleAnalyze} disabled={analyzing} className="w-2/3 py-3 btn-glass-primary font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60">
                                {analyzing ? <><Loader2 className="h-5 w-5 animate-spin" />Analyzing Fields...</> : <>Save and Run Baseline Analysis <ArrowRight className="h-5 w-5" /></>}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
