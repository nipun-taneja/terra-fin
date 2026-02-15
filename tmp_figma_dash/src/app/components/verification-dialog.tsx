import { CheckCircle2, FileText, MapPin, Award } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

export function VerificationDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CheckCircle2 className="size-4" />
          CO2 Verification Info
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">CO2 Output Verification</DialogTitle>
          <DialogDescription>
            Learn how to get your carbon reduction efforts verified and certified
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Overview */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h3 className="font-semibold text-emerald-900 mb-2">Why Verify?</h3>
            <ul className="text-sm text-emerald-800 space-y-1">
              <li>• Access premium carbon credit markets</li>
              <li>• Qualify for federal and state programs</li>
              <li>• Increase credit value by 15-40%</li>
              <li>• Build trust with credit buyers</li>
            </ul>
          </div>

          <Separator />

          {/* Verification Types */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Verification Options</h3>
            <div className="space-y-3">
              <div className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="size-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">Baseline Verification</h4>
                      <Badge variant="outline" className="text-xs">Recommended First</Badge>
                    </div>
                    <p className="text-sm text-stone-600 mb-2">
                      Establish your farm's current carbon baseline before implementing reduction strategies.
                    </p>
                    <div className="text-xs text-stone-500">
                      <span className="font-semibold">Timeline:</span> 2-4 weeks | <span className="font-semibold">Cost:</span> $500-$1,200
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="size-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">Field Implementation Verification</h4>
                      <Badge variant="outline" className="text-xs">After Actions</Badge>
                    </div>
                    <p className="text-sm text-stone-600 mb-2">
                      Verify that carbon reduction practices have been properly implemented in the field.
                    </p>
                    <div className="text-xs text-stone-500">
                      <span className="font-semibold">Timeline:</span> 3-6 weeks | <span className="font-semibold">Cost:</span> $800-$2,000
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Award className="size-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">Full Credit Certification</h4>
                      <Badge variant="outline" className="text-xs">Premium</Badge>
                    </div>
                    <p className="text-sm text-stone-600 mb-2">
                      Complete verification and certification of carbon credits for market sale.
                    </p>
                    <div className="text-xs text-stone-500">
                      <span className="font-semibold">Timeline:</span> 6-12 weeks | <span className="font-semibold">Cost:</span> $1,500-$3,500
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Process Steps */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Verification Process</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  1
                </div>
                <div>
                  <h5 className="font-semibold mb-1">Submit Application</h5>
                  <p className="text-sm text-stone-600">
                    Provide farm details, baseline data, and planned carbon reduction activities.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  2
                </div>
                <div>
                  <h5 className="font-semibold mb-1">Documentation Review</h5>
                  <p className="text-sm text-stone-600">
                    Third-party verifiers review your records, field maps, and implementation plans.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  3
                </div>
                <div>
                  <h5 className="font-semibold mb-1">Site Inspection</h5>
                  <p className="text-sm text-stone-600">
                    On-site visit to verify practices, conduct soil sampling, and document changes.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  4
                </div>
                <div>
                  <h5 className="font-semibold mb-1">Certification Issued</h5>
                  <p className="text-sm text-stone-600">
                    Receive official verification certificate and access to credit markets.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Approved Verifiers */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Approved Verification Partners</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-stone-50 cursor-pointer">
                <div>
                  <p className="font-semibold">USDA Climate Smart Verification</p>
                  <p className="text-xs text-stone-500">Federal program partnership</p>
                </div>
                <Badge>Recommended</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-stone-50 cursor-pointer">
                <div>
                  <p className="font-semibold">California Carbon Verification Program</p>
                  <p className="text-xs text-stone-500">State-certified verifiers</p>
                </div>
                <Badge variant="outline">State Program</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-stone-50 cursor-pointer">
                <div>
                  <p className="font-semibold">Verra VCS Standard</p>
                  <p className="text-xs text-stone-500">International certification</p>
                </div>
                <Badge variant="outline">Global Market</Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline">Learn More</Button>
            <Button>Start Verification Application</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
