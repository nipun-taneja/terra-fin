import { useState } from 'react';
import { DollarSign, TrendingUp, CheckCircle2, AlertCircle, ExternalLink, Layers } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';

interface Program {
  id: string;
  name: string;
  type: 'federal' | 'state' | 'private';
  amount: string;
  match: number;
  description: string;
  requirements: string[];
  deadline?: string;
  stackable: boolean;
}

export function FundingPathway() {
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);

  const programs: Program[] = [
    {
      id: 'eqip',
      name: 'EQIP (Environmental Quality Incentives Program)',
      type: 'federal',
      amount: '$15,000 - $40,000',
      match: 95,
      description: 'USDA program supporting conservation practices including reduced tillage, cover crops, and nutrient management.',
      requirements: [
        'Active farm operation in the US',
        'Conservation plan development',
        'Compliance with USDA requirements',
      ],
      deadline: 'March 31, 2026',
      stackable: true,
    },
    {
      id: 'csp',
      name: 'CSP (Conservation Stewardship Program)',
      type: 'federal',
      amount: '$8,000 - $25,000/year',
      match: 88,
      description: 'Annual payments for maintaining and expanding conservation practices on working lands.',
      requirements: [
        'Meet stewardship threshold',
        'Address priority resource concerns',
        'Multi-year commitment',
      ],
      deadline: 'April 15, 2026',
      stackable: true,
    },
    {
      id: 'ca-healthy-soils',
      name: 'California Healthy Soils Program',
      type: 'state',
      amount: '$50,000 max',
      match: 92,
      description: 'California state funding for practices that improve soil health and sequester carbon.',
      requirements: [
        'California farm location',
        'Implement approved soil practices',
        'Submit carbon sequestration plan',
      ],
      deadline: 'May 1, 2026',
      stackable: true,
    },
    {
      id: 'ca-sweep',
      name: 'CA State Water Efficiency Program',
      type: 'state',
      amount: '$20,000 - $100,000',
      match: 85,
      description: 'Funding for water conservation equipment and practices that also reduce emissions.',
      requirements: [
        'Water conservation plan',
        'Irrigation system upgrades',
        'Agricultural production in California',
      ],
      stackable: true,
    },
    {
      id: 'nori',
      name: 'Nori Carbon Removal Marketplace',
      type: 'private',
      amount: '$15-$25/ton CO2',
      match: 78,
      description: 'Sell verified carbon credits directly to buyers seeking agricultural carbon removal.',
      requirements: [
        'Verified carbon reduction practices',
        'Baseline measurements',
        '1-year minimum commitment',
      ],
      stackable: true,
    },
    {
      id: 'indigo',
      name: 'Indigo Carbon Program',
      type: 'private',
      amount: '$20/ton CO2',
      match: 82,
      description: 'Market-leading carbon program with premium pricing for regenerative agriculture.',
      requirements: [
        'Implement regenerative practices',
        'Data sharing agreement',
        'Practice verification',
      ],
      stackable: true,
    },
  ];

  const federalPrograms = programs.filter(p => p.type === 'federal');
  const statePrograms = programs.filter(p => p.type === 'state');
  const privatePrograms = programs.filter(p => p.type === 'private');

  const toggleProgram = (programId: string) => {
    setSelectedPrograms(prev => 
      prev.includes(programId) 
        ? prev.filter(id => id !== programId)
        : [...prev, programId]
    );
  };

  const calculateTotalFunding = () => {
    const selected = programs.filter(p => selectedPrograms.includes(p.id));
    // Simplified calculation - in reality this would be more complex
    const estimatedTotal = selected.reduce((sum, program) => {
      if (program.type === 'private') {
        return sum + 5000; // Estimated based on 202.4 tons * $20-25
      }
      return sum + 20000; // Average for federal/state programs
    }, 0);
    return estimatedTotal;
  };

  const renderProgramCard = (program: Program) => (
    <Card 
      key={program.id}
      className={`cursor-pointer transition-all ${
        selectedPrograms.includes(program.id) 
          ? 'border-emerald-500 shadow-md' 
          : 'hover:shadow-md'
      }`}
      onClick={() => toggleProgram(program.id)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{program.name}</CardTitle>
              {selectedPrograms.includes(program.id) && (
                <CheckCircle2 className="size-5 text-emerald-500" />
              )}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={program.type === 'federal' ? 'default' : program.type === 'state' ? 'secondary' : 'outline'}>
                {program.type === 'federal' ? '🇺🇸 Federal' : program.type === 'state' ? '🏛️ State' : '💼 Private'}
              </Badge>
              <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                {program.match}% Match
              </Badge>
              {program.stackable && (
                <Badge variant="outline" className="text-blue-600 border-blue-300">
                  <Layers className="size-3 mr-1" />
                  Stackable
                </Badge>
              )}
            </div>
            <CardDescription className="text-base font-semibold text-emerald-600">
              {program.amount}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-stone-600 mb-4">{program.description}</p>
        
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-stone-900 uppercase tracking-wide mb-2">Requirements:</p>
            <ul className="text-sm text-stone-600 space-y-1">
              {program.requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-stone-400 mt-0.5">•</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          {program.deadline && (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="size-4 text-amber-500" />
              <span className="text-stone-600">
                Application deadline: <span className="font-semibold">{program.deadline}</span>
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={(e) => e.stopPropagation()}>
            Learn More
            <ExternalLink className="size-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
          <DollarSign className="size-6 text-emerald-600" />
          Funding Pathway & Program Matching
        </h2>
        <p className="text-stone-600">
          Discover federal, state, and private programs that match your farm's carbon reduction efforts. 
          Select programs below to see your optimized stacking strategy.
        </p>
      </div>

      {/* Stacking Strategy Summary */}
      {selectedPrograms.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5 text-emerald-600" />
              Your Optimized Stacking Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600 mb-1">Selected Programs</p>
                <p className="text-3xl font-semibold text-emerald-600">
                  {selectedPrograms.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-stone-600 mb-1">Estimated Total Funding</p>
                <p className="text-3xl font-semibold text-emerald-600">
                  ${calculateTotalFunding().toLocaleString()}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="font-semibold text-sm">Program Stack:</p>
              {selectedPrograms.map((id, index) => {
                const program = programs.find(p => p.id === id);
                if (!program) return null;
                return (
                  <div key={id} className="flex items-center gap-3 text-sm">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="flex-1">{program.name}</span>
                    <Badge variant="outline">{program.amount}</Badge>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-lg p-4 border border-emerald-200">
              <p className="font-semibold text-sm mb-2">💡 Stacking Tip:</p>
              <p className="text-sm text-stone-600">
                The programs you've selected can be combined! Start with federal programs (EQIP/CSP) for 
                foundational support, layer in state programs for additional funding, then monetize remaining 
                credits through private markets for maximum return.
              </p>
            </div>

            <Button className="w-full" size="lg">
              Create Application Timeline
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Programs by Type */}
      <Tabs defaultValue="federal" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="federal">
            🇺🇸 Federal ({federalPrograms.length})
          </TabsTrigger>
          <TabsTrigger value="state">
            🏛️ State ({statePrograms.length})
          </TabsTrigger>
          <TabsTrigger value="private">
            💼 Private ({privatePrograms.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="federal" className="mt-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-stone-700">
              <strong>Federal programs</strong> offer the largest upfront funding and are highly stackable with 
              other programs. Priority deadline: <strong>March-April 2026</strong>
            </p>
          </div>
          {federalPrograms.map(renderProgramCard)}
        </TabsContent>

        <TabsContent value="state" className="mt-6 space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-stone-700">
              <strong>California state programs</strong> complement federal funding and often have faster 
              application timelines. Can be stacked with federal programs for maximum benefit.
            </p>
          </div>
          {statePrograms.map(renderProgramCard)}
        </TabsContent>

        <TabsContent value="private" className="mt-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-stone-700">
              <strong>Private carbon markets</strong> provide ongoing revenue for verified carbon credits. 
              Best used after implementing practices supported by federal/state programs.
            </p>
          </div>
          {privatePrograms.map(renderProgramCard)}
        </TabsContent>
      </Tabs>

      {/* Application Timeline Helper */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Application Timeline</CardTitle>
          <CardDescription>Optimize your funding by applying in this order</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="w-24 flex-shrink-0 text-sm font-semibold text-stone-600">Now - Mar</div>
              <div className="flex-1">
                <div className="font-semibold mb-1">Phase 1: Federal Programs</div>
                <p className="text-sm text-stone-600">Apply for EQIP and CSP programs. These have the earliest deadlines and provide foundational support.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-24 flex-shrink-0 text-sm font-semibold text-stone-600">Mar - May</div>
              <div className="flex-1">
                <div className="font-semibold mb-1">Phase 2: State Programs</div>
                <p className="text-sm text-stone-600">Layer in California Healthy Soils and water efficiency programs for additional funding.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-24 flex-shrink-0 text-sm font-semibold text-stone-600">Jun - Dec</div>
              <div className="flex-1">
                <div className="font-semibold mb-1">Phase 3: Private Markets</div>
                <p className="text-sm text-stone-600">Once practices are implemented and verified, begin generating credits for private market sales.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
