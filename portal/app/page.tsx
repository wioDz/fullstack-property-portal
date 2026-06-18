import Link from 'next/link';
import { Calculator, BarChart3, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Home page with links to the two applications.
 */
export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-slate-900">Property Portal</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Estimate property values and explore market trends with a machine learning model
          trained on real housing data.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary-600" />
              Property Value Estimator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              Enter property details to get an instant price prediction, save estimates to
              history, and compare multiple properties side-by-side.
            </p>
            <Link href="/estimator">
              <Button className="w-full">
                Open Estimator
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary-600" />
              Market Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              Explore market visualizations, filter property segments, run what-if scenarios,
              and export data as CSV or PDF.
            </p>
            <Link href="/market">
              <Button className="w-full">
                Open Market Analysis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
