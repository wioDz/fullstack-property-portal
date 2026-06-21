import Link from 'next/link';
import { Calculator, BarChart3, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

/**
 * Home page with a hero section and links to the two applications.
 */
export default function HomePage() {
  const apps = [
    {
      href: '/estimator',
      title: 'Property Value Estimator',
      description:
        'Enter property details to get an instant price prediction. Save estimates, view history, and compare multiple properties side-by-side.',
      icon: Calculator,
      cta: 'Open Estimator',
    },
    {
      href: '/market',
      title: 'Property Market Analysis',
      description:
        'Explore market trends with interactive charts, filter property segments, run what-if scenarios, and export data as CSV or PDF.',
      icon: BarChart3,
      cta: 'Open Market Analysis',
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <section className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Property Portal
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Estimate property values and explore market trends with a machine-learning model trained on real housing data.
        </p>
      </section>

      <Separator />

      <section className="grid gap-6 md:grid-cols-2">
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <Card key={app.href} className="flex flex-col">
              <CardHeader>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{app.title}</CardTitle>
                <CardDescription>{app.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button asChild className="w-full">
                  <Link href={app.href}>
                    {app.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
