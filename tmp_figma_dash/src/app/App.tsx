import { useState } from 'react';
import { ArrowLeft, Download, CheckCircle2, Info } from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Progress } from './components/ui/progress';
import { Badge } from './components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './components/ui/accordion';
import { Separator } from './components/ui/separator';
import { CreditTimeline } from './components/credit-timeline';
import { VerificationDialog } from './components/verification-dialog';
import { FundingPathway } from './components/funding-pathway';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedField, setSelectedField] = useState('north');

  const fields = [
    { id: 'north', name: 'North Field', moisture: '56.6 (CO2e)', savings: '6.6-18.2 (CO2e)', roi: '0.76', compliance: '97%' },
    { id: 'south', name: 'South Field', moisture: '48.2 (CO2e)', savings: '5.2-15.8 (CO2e)', roi: '0.68', compliance: '94%' },
    { id: 'east', name: 'East Field', moisture: '52.4 (CO2e)', savings: '6.0-16.5 (CO2e)', roi: '0.72', compliance: '96%' },
    { id: 'west', name: 'West Field', moisture: '44.8 (CO2e)', savings: '4.8-14.2 (CO2e)', roi: '0.64', compliance: '92%' },
  ];

  const selectedFieldData = fields.find(f => f.id === selectedField) || fields[0];

  const handleDownloadReport = () => {
    // Create a mock credit report
    const reportData = {
      farm: 'Font Boulevard',
      location: 'California, United States',
      baselineCarbon: '202.4 tCO2e/y',
      estimatedCredit: '$992',
      generatedDate: new Date().toLocaleDateString(),
      netZeroProgress: '0/3 actions complete',
      fields: fields,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credit-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#f5f3f0] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="sm" className="text-stone-600 hover:text-stone-900">
                <ArrowLeft className="size-4 mr-1" />
                BACK
              </Button>
            </div>
            <h1 className="text-3xl font-serif text-stone-900">Font Boulevard</h1>
            <p className="text-sm text-stone-500">California, United States</p>
          </div>
          <div className="flex gap-2">
            <VerificationDialog />
            <Button onClick={handleDownloadReport} variant="outline" className="gap-2">
              <Download className="size-4" />
              Download Credit Report
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wide text-stone-500">
                Baseline Carbon Estimate
              </CardDescription>
              <CardTitle className="text-4xl font-light">
                202.4 <span className="text-lg text-stone-500">tCO2e/y</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-stone-500">
                📅 Last estimated Feb 14, 2026, 12:03 PM
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wide text-stone-500">
                Estimated Credit Balance
              </CardDescription>
              <CardTitle className="text-4xl font-light">
                $992 <span className="text-lg text-stone-500">~</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-stone-500">Annual projected value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wide text-stone-500 flex items-center gap-2">
                💰 Credit Timeline
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <CreditTimeline />
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-0">
              <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0">
                <TabsTrigger 
                  value="overview" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-stone-900 data-[state=active]:bg-transparent"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="funding" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-stone-900 data-[state=active]:bg-transparent"
                >
                  Funding Pathway
                </TabsTrigger>
                <TabsTrigger 
                  value="verification" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-stone-900 data-[state=active]:bg-transparent"
                >
                  Verification
                </TabsTrigger>
                <TabsTrigger 
                  value="export" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-stone-900 data-[state=active]:bg-transparent"
                >
                  Export
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="pt-6">
              <TabsContent value="overview" className="mt-0">
                {/* Progress Bar */}
                <div className="mb-6 p-4 bg-stone-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-stone-600">Net Zero Progress</span>
                    <span className="text-sm text-stone-500">0/3 actions complete</span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>

                {/* Field Tabs */}
                <Tabs value={selectedField} onValueChange={setSelectedField} className="mb-6">
                  <TabsList className="w-full justify-start bg-stone-100">
                    {fields.map(field => (
                      <TabsTrigger key={field.id} value={field.id}>
                        {field.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {/* Field Metrics */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Moisture</p>
                    <p className="font-semibold">{selectedFieldData.moisture}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Savings</p>
                    <p className="font-semibold">{selectedFieldData.savings}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">ROI</p>
                    <p className="font-semibold">{selectedFieldData.roi}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Compliance</p>
                    <p className="font-semibold">{selectedFieldData.compliance}</p>
                  </div>
                </div>

                {/* Emissions Reduction Steps */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-stone-400" />
                    Emissions Reduction Steps
                  </h3>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border rounded-lg mb-2 px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full border-2 border-stone-300 flex items-center justify-center text-xs">
                            1
                          </div>
                          <span>Optimize nitrogen application (right rate, right time)</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pl-9">
                        <div className="space-y-3 text-sm text-stone-600">
                          <p>Reduce nitrogen fertilizer application to match crop needs more precisely.</p>
                          <div className="bg-stone-50 p-3 rounded">
                            <p className="font-semibold mb-2">Potential Impact:</p>
                            <ul className="space-y-1 list-disc list-inside">
                              <li>Reduce emissions by 15-25 tCO2e/year</li>
                              <li>Save $800-1,200 on fertilizer costs</li>
                              <li>Improve soil health</li>
                            </ul>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-2" className="border rounded-lg mb-2 px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full border-2 border-stone-300 flex items-center justify-center text-xs">
                            2
                          </div>
                          <span>Adopt reduced tillage / conservation tillage</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pl-9">
                        <div className="space-y-3 text-sm text-stone-600">
                          <p>Minimize soil disturbance to preserve carbon storage and reduce fuel use.</p>
                          <div className="bg-stone-50 p-3 rounded">
                            <p className="font-semibold mb-2">Potential Impact:</p>
                            <ul className="space-y-1 list-disc list-inside">
                              <li>Reduce emissions by 20-30 tCO2e/year</li>
                              <li>Save $500-900 on fuel costs</li>
                              <li>Enhance soil carbon sequestration</li>
                            </ul>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-3" className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full border-2 border-stone-300 flex items-center justify-center text-xs">
                            3
                          </div>
                          <span>Add cover crops in the off-season (where practical)</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pl-9">
                        <div className="space-y-3 text-sm text-stone-600">
                          <p>Plant cover crops during fallow periods to capture carbon and improve soil.</p>
                          <div className="bg-stone-50 p-3 rounded">
                            <p className="font-semibold mb-2">Potential Impact:</p>
                            <ul className="space-y-1 list-disc list-inside">
                              <li>Reduce emissions by 10-18 tCO2e/year</li>
                              <li>Improve soil structure and water retention</li>
                              <li>Reduce erosion</li>
                            </ul>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <p className="text-xs text-stone-500 mt-4">0 of 3 steps completed</p>
                </div>
              </TabsContent>

              <TabsContent value="funding" className="mt-0">
                <FundingPathway />
              </TabsContent>

              <TabsContent value="verification" className="mt-0">
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-2">Verification Process</h3>
                    <p className="text-sm text-stone-600 mb-4">
                      Get your carbon reduction efforts verified to qualify for premium credits and federal programs.
                    </p>
                    <VerificationDialog />
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Verification Timeline</h4>
                    <div className="space-y-3">
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-sm font-semibold">
                          1
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold">Initial Assessment</h5>
                          <p className="text-sm text-stone-600">Submit baseline data and implementation plans (1-2 weeks)</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-sm font-semibold">
                          2
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold">Field Verification</h5>
                          <p className="text-sm text-stone-600">On-site inspection and soil sampling (2-4 weeks)</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-sm font-semibold">
                          3
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold">Certification</h5>
                          <p className="text-sm text-stone-600">Receive verified carbon credit certification (3-6 weeks)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="export" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Export Options</h3>
                    <div className="grid gap-4">
                      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold mb-1">Full Dashboard Report</h4>
                            <p className="text-sm text-stone-600">Complete overview of all metrics and progress</p>
                          </div>
                          <Button onClick={handleDownloadReport} variant="outline" size="sm">
                            <Download className="size-4 mr-2" />
                            Download JSON
                          </Button>
                        </div>
                      </Card>

                      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold mb-1">Credit Summary</h4>
                            <p className="text-sm text-stone-600">Baseline estimates and credit projections</p>
                          </div>
                          <Button variant="outline" size="sm">
                            <Download className="size-4 mr-2" />
                            Download PDF
                          </Button>
                        </div>
                      </Card>

                      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold mb-1">Field Data Export</h4>
                            <p className="text-sm text-stone-600">Detailed metrics for all fields</p>
                          </div>
                          <Button variant="outline" size="sm">
                            <Download className="size-4 mr-2" />
                            Download CSV
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
