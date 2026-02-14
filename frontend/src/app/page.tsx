"use client";

import { useState } from "react";
import LandingView from "@/components/LandingView";
import HowItWorksView from "@/components/HowItWorksView";
import LoginView from "@/components/LoginView";
import RegisterView from "@/components/RegisterView";
import OnboardingView from "@/components/OnboardingView";
import DashboardView from "@/components/DashboardView";
import { AppView, FarmConfig, DashboardField } from "@/lib/types";

export default function Home() {
  const [view, setView] = useState<AppView>("landing");
  const [farm, setFarm] = useState<FarmConfig | null>(null);
  const [dashFields, setDashFields] = useState<DashboardField[]>([]);
  const [editingFromDashboard, setEditingFromDashboard] = useState(false);

  const handleVerified = () => {
    setEditingFromDashboard(false);
    setView("onboarding");
  };

  const handleOnboardingComplete = (farmConfig: FarmConfig, fields: DashboardField[]) => {
    setFarm(farmConfig);
    setDashFields(fields);
    setEditingFromDashboard(false);
    setView("dashboard");
  };

  const handleDashboardBack = () => {
    setEditingFromDashboard(true);
    setView("onboarding");
  };

  if (view === "landing") {
    return <LandingView onNavigate={setView} />;
  }

  if (view === "how-it-works") {
    return <HowItWorksView onNavigate={setView} />;
  }

  if (view === "login") {
    return <LoginView onLogin={handleVerified} onNavigate={setView} />;
  }

  if (view === "register") {
    return <RegisterView onVerified={handleVerified} />;
  }

  if (view === "onboarding") {
    return (
      <OnboardingView
        onComplete={handleOnboardingComplete}
        initialFarm={editingFromDashboard ? farm : null}
        initialFields={editingFromDashboard ? dashFields : undefined}
        initialStep={editingFromDashboard ? 1 : 0}
      />
    );
  }

  if (view === "dashboard" && farm) {
    return (
      <DashboardView
        farm={farm}
        fields={dashFields}
        onFieldsChange={setDashFields}
        onBack={handleDashboardBack}
        onEditReanalyze={handleDashboardBack}
      />
    );
  }

  return null;
}
