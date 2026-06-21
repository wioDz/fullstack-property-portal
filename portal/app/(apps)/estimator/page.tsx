'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Calculator,
  History,
  BarChart3,
  Trash2,
  CheckSquare,
  Square,
  ArrowRightLeft,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEstimatorStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { predictProperty, compareProperties } from '@/lib/api';

/**
 * Zod schema for client-side validation of property features.
 */
const featureSchema = z.object({
  square_footage: z.coerce.number().positive('Must be positive'),
  bedrooms: z.coerce.number().min(0, 'Must be 0 or more'),
  bathrooms: z.coerce.number().min(0, 'Must be 0 or more'),
  year_built: z.coerce.number().int().min(1800).max(2100),
  lot_size: z.coerce.number().positive('Must be positive'),
  distance_to_city_center: z.coerce.number().min(0, 'Must be 0 or more'),
  school_rating: z.coerce.number().min(0).max(10),
});

type FeatureForm = z.infer<typeof featureSchema>;

/**
 * Property Value Estimator page.
 * Provides a form, prediction result, history, and comparison view.
 */
export default function EstimatorPage() {
  const [result, setResult] = useState<{ predicted_price: number } | null>(null);
  const [compareResult, setCompareResult] = useState<
    { features: FeatureForm; predicted_price: number }[] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    history,
    selectedIds,
    addToHistory,
    toggleSelection,
    clearSelection,
    clearHistory,
  } = useEstimatorStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FeatureForm>({
    resolver: zodResolver(featureSchema),
    defaultValues: {
      square_footage: 1500,
      bedrooms: 3,
      bathrooms: 2,
      year_built: 2000,
      lot_size: 7000,
      distance_to_city_center: 4,
      school_rating: 8,
    },
  });

  const onSubmit = async (data: FeatureForm) => {
    setLoading(true);
    setError(null);
    try {
      const response = await predictProperty(data);
      setResult(response);
      addToHistory(response.record);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    const selected = history.filter((r) => selectedIds.includes(r.id));
    if (selected.length < 2) {
      setError('Select at least two history items to compare');
      return;
    }
    setCompareLoading(true);
    setError(null);
    try {
      const results = await compareProperties(selected.map((r) => r.features));
      setCompareResult(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comparison failed');
    } finally {
      setCompareLoading(false);
    }
  };

  const chartData = compareResult
    ? compareResult.map((r, i) => ({
        name: `Property ${i + 1}`,
        price: r.predicted_price,
      }))
    : result
    ? [{ name: 'Prediction', price: result.predicted_price }]
    : [];

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Calculator className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Property Value Estimator</h1>
          <p className="text-muted-foreground">Predict prices, save estimates, and compare properties.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Property Details
            </CardTitle>
            <CardDescription>Enter the features of the property you want to estimate.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <SectionTitle>Property</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Square Footage" error={errors.square_footage?.message}>
                    <Input type="number" {...register('square_footage')} />
                  </FormField>
                  <FormField label="Lot Size (sqft)" error={errors.lot_size?.message}>
                    <Input type="number" {...register('lot_size')} />
                  </FormField>
                </div>

                <SectionTitle>Rooms</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Bedrooms" error={errors.bedrooms?.message}>
                    <Input type="number" step="0.5" {...register('bedrooms')} />
                  </FormField>
                  <FormField label="Bathrooms" error={errors.bathrooms?.message}>
                    <Input type="number" step="0.5" {...register('bathrooms')} />
                  </FormField>
                </div>

                <SectionTitle>Location & Quality</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Year Built" error={errors.year_built?.message}>
                    <Input type="number" {...register('year_built')} />
                  </FormField>
                  <FormField label="Distance to City Center (mi)" error={errors.distance_to_city_center?.message}>
                    <Input type="number" step="0.1" {...register('distance_to_city_center')} />
                  </FormField>
                  <FormField label="School Rating (0-10)" error={errors.school_rating?.message}>
                    <Input type="number" step="0.1" {...register('school_rating')} />
                  </FormField>
                </div>
              </div>

              {error && <p className="text-sm font-medium text-destructive">{error}</p>}

              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Predicting...' : 'Predict Price'}
                </Button>
                <Button type="button" variant="outline" onClick={() => reset()} disabled={loading}>
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Prediction Result
            </CardTitle>
            <CardDescription>The model's estimated price for the entered property.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center space-y-6">
            {result ? (
              <>
                <div className="rounded-xl bg-primary/5 p-6 text-center">
                  <p className="text-sm font-medium text-muted-foreground">Estimated Price</p>
                  <p className="mt-1 text-4xl font-bold tracking-tight text-primary">
                    {formatCurrency(result.predicted_price)}
                  </p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `$${v / 1000}k`} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="price" radius={[4, 4, 0, 0]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={colors[i % colors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Submit the form to see a prediction.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Estimate History
            </CardTitle>
            <CardDescription>Select rows to compare predicted prices.</CardDescription>
          </div>
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear Selection
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={clearHistory}>
              <Trash2 className="mr-1 h-4 w-4" />
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No estimates yet. Submit the form above to get started.</p>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Select</TableHead>
                      <TableHead>Sqft</TableHead>
                      <TableHead>Beds</TableHead>
                      <TableHead>Baths</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Lot</TableHead>
                      <TableHead>Dist</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <button
                            onClick={() => toggleSelection(record.id)}
                            className="text-primary hover:text-primary/80"
                            aria-label={selectedIds.includes(record.id) ? 'Deselect' : 'Select'}
                          >
                            {selectedIds.includes(record.id) ? (
                              <CheckSquare className="h-5 w-5" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell>{record.features.square_footage}</TableCell>
                        <TableCell>{record.features.bedrooms}</TableCell>
                        <TableCell>{record.features.bathrooms}</TableCell>
                        <TableCell>{record.features.year_built}</TableCell>
                        <TableCell>{record.features.lot_size}</TableCell>
                        <TableCell>{record.features.distance_to_city_center}</TableCell>
                        <TableCell>{record.features.school_rating}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{formatCurrency(record.predicted_price)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button
                  onClick={handleCompare}
                  disabled={selectedIds.length < 2 || compareLoading}
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  {compareLoading ? 'Comparing...' : `Compare Selected (${selectedIds.length})`}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {compareResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Comparison View
            </CardTitle>
            <CardDescription>Side-by-side predicted prices for selected properties.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `$${v / 1000}k`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="price" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {compareResult.map((r, i) => (
                <div key={i} className="rounded-xl border bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">Property {i + 1}</p>
                  <p className="text-xl font-bold">{formatCurrency(r.predicted_price)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
