"use client";

import { useState } from "react";
import RegisterView from "@/components/RegisterView";
import OnboardingView from "@/components/OnboardingView";
import DashboardView from "@/components/DashboardView";
import { AppView, FarmConfig, DashboardField } from "@/lib/types";

export default function Home() {
  const [view, setView] = useState<AppView>("register");
  const [farm, setFarm] = useState<FarmConfig | null>(null);
  const [dashFields, setDashFields] = useState<DashboardField[]>([]);

  const handleVerified = () => {
    setView("onboarding");
  };

  const handleOnboardingComplete = (farmConfig: FarmConfig, fields: DashboardField[]) => {
    setFarm(farmConfig);
    setDashFields(fields);
    setView("dashboard");
  };

  if (view === "register") {
    return <RegisterView onVerified={handleVerified} />;
  }

  if (view === "onboarding") {
    return <OnboardingView onComplete={handleOnboardingComplete} />;
  }

  if (view === "dashboard" && farm) {
    return (
      <DashboardView
        farm={farm}
        fields={dashFields}
        onFieldsChange={setDashFields}
      />
    );
  }

  return null;
}