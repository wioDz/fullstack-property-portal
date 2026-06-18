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
import { Calculator, History, BarChart3, Trash2, CheckSquare, Square } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

  const { history, selectedIds, addToHistory, toggleSelection, clearSelection, clearHistory } =
    useEstimatorStore();

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

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Calculator className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-slate-900">Property Value Estimator</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Enter Property Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Square Footage" type="number" {...register('square_footage')} error={errors.square_footage?.message} />
                <Input label="Bedrooms" type="number" step="0.5" {...register('bedrooms')} error={errors.bedrooms?.message} />
                <Input label="Bathrooms" type="number" step="0.5" {...register('bathrooms')} error={errors.bathrooms?.message} />
                <Input label="Year Built" type="number" {...register('year_built')} error={errors.year_built?.message} />
                <Input label="Lot Size (sqft)" type="number" {...register('lot_size')} error={errors.lot_size?.message} />
                <Input label="Distance to City Center (mi)" type="number" step="0.1" {...register('distance_to_city_center')} error={errors.distance_to_city_center?.message} />
                <Input label="School Rating (0-10)" type="number" step="0.1" {...register('school_rating')} error={errors.school_rating?.message} />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-3">
                <Button type="submit" disabled={loading} size="lg" className="flex-1">
                  {loading ? 'Predicting...' : 'Predict Price'}
                </Button>
                <Button type="button" variant="outline" onClick={() => reset()} disabled={loading}>
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Prediction Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result ? (
              <>
                <div className="text-center p-6 bg-primary-50 rounded-lg">
                  <p className="text-sm text-slate-600">Estimated Price</p>
                  <p className="text-4xl font-bold text-primary-700">{formatCurrency(result.predicted_price)}</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `$${v / 1000}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="price" fill="#3b82f6">
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][i % 4]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <p className="text-slate-500 text-center py-12">Submit the form to see a prediction.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Estimate History
          </CardTitle>
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear Selection
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={clearHistory}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {history.length === 0 ? (
            <p className="text-slate-500">No estimates yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Select</th>
                      <th className="px-4 py-2 text-left">Sqft</th>
                      <th className="px-4 py-2 text-left">Beds</th>
                      <th className="px-4 py-2 text-left">Baths</th>
                      <th className="px-4 py-2 text-left">Year</th>
                      <th className="px-4 py-2 text-left">Lot</th>
                      <th className="px-4 py-2 text-left">Dist</th>
                      <th className="px-4 py-2 text-left">School</th>
                      <th className="px-4 py-2 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => (
                      <tr key={record.id} className="border-t border-slate-100">
                        <td className="px-4 py-2">
                          <button
                            onClick={() => toggleSelection(record.id)}
                            className="text-primary-600 hover:text-primary-700"
                            aria-label={selectedIds.includes(record.id) ? 'Deselect' : 'Select'}
                          >
                            {selectedIds.includes(record.id) ? (
                              <CheckSquare className="h-5 w-5" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-2">{record.features.square_footage}</td>
                        <td className="px-4 py-2">{record.features.bedrooms}</td>
                        <td className="px-4 py-2">{record.features.bathrooms}</td>
                        <td className="px-4 py-2">{record.features.year_built}</td>
                        <td className="px-4 py-2">{record.features.lot_size}</td>
                        <td className="px-4 py-2">{record.features.distance_to_city_center}</td>
                        <td className="px-4 py-2">{record.features.school_rating}</td>
                        <td className="px-4 py-2 text-right font-medium">
                          <Badge>{formatCurrency(record.predicted_price)}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                onClick={handleCompare}
                disabled={selectedIds.length < 2 || compareLoading}
                variant="primary"
              >
                {compareLoading ? 'Comparing...' : `Compare Selected (${selectedIds.length})`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {compareResult && (
        <Card>
          <CardHeader>
            <CardTitle>Comparison View</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="price" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {compareResult.map((r, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">Property {i + 1}</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(r.predicted_price)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
