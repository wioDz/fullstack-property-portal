'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from 'recharts';
import { BarChart3, Filter, Download, Calculator, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  fetchMarketStatistics,
  filterMarketRecords,
  runWhatIf,
} from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { FilterRequest, HouseRecord, WhatIfRequest } from '@/lib/types';

/**
 * Market Analysis page.
 * Shows aggregate statistics, visualizations, filters, what-if analysis,
 * a sortable/filterable table, and CSV/PDF export links.
 */
export default function MarketPage() {
  const [filters, setFilters] = useState<FilterRequest>({
    sortBy: 'price',
    sortDirection: 'desc',
  });

  const [whatIf, setWhatIf] = useState<WhatIfRequest>({
    square_footage: 1600,
    bedrooms: 3,
    bathrooms: 2,
    year_built: 2000,
    lot_size: 7200,
    distance_to_city_center: 4.5,
    school_rating: 7.5,
  });

  const [whatIfResult, setWhatIfResult] = useState<{
    predictedPrice: number;
    comparables: HouseRecord[];
  } | null>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['marketStatistics'],
    queryFn: fetchMarketStatistics,
  });

  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['marketRecords', filters],
    queryFn: () => filterMarketRecords(filters),
  });

  const runWhatIfAnalysis = async () => {
    setWhatIfLoading(true);
    try {
      const result = await runWhatIf(whatIf);
      setWhatIfResult(result);
    } finally {
      setWhatIfLoading(false);
    }
  };

  const updateFilter = (key: keyof FilterRequest, value: number | string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value === '' ? undefined : value }));
  };

  // Aggregate data for charts: group by bedroom count.
  const bedroomData =
    records?.reduce((acc, r) => {
      const key = `${r.bedrooms} bed`;
      const existing = acc.find((x) => x.name === key);
      if (existing) {
        existing.count += 1;
        existing.avgPrice = (existing.avgPrice * (existing.count - 1) + r.price) / existing.count;
      } else {
        acc.push({ name: key, count: 1, avgPrice: r.price });
      }
      return acc;
    }, [] as { name: string; count: number; avgPrice: number }[]) || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-bold text-slate-900">Property Market Analysis</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Avg Price"
          value={statsLoading ? '...' : formatCurrency(stats?.averagePrice || 0)}
          icon={TrendingUp}
        />
        <KpiCard
          title="Median Price"
          value={statsLoading ? '...' : formatCurrency(stats?.medianPrice || 0)}
          icon={BarChart3}
        />
        <KpiCard
          title="Properties"
          value={statsLoading ? '...' : String(stats?.count || 0)}
          icon={Filter}
        />
        <KpiCard
          title="Avg School Rating"
          value={statsLoading ? '...' : formatNumber(stats?.averageSchoolRating || 0)}
          icon={Calculator}
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Average Price by Bedrooms</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bedroomData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="avgPrice" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Price vs Square Footage</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="squareFootage" name="Sqft" />
                <YAxis type="number" dataKey="price" name="Price" tickFormatter={(v) => `$${v / 1000}k`} />
                <ZAxis type="number" dataKey="schoolRating" range={[50, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: number, n: string) => [n === 'price' ? formatCurrency(v) : v, n]} />
                <Legend />
                <Scatter name="Properties" data={records || []} fill="#10b981" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Input label="Min Beds" type="number" step="0.5" value={filters.minBedrooms ?? ''} onChange={(e) => updateFilter('minBedrooms', e.target.valueAsNumber)} />
            <Input label="Max Beds" type="number" step="0.5" value={filters.maxBedrooms ?? ''} onChange={(e) => updateFilter('maxBedrooms', e.target.valueAsNumber)} />
            <Input label="Min Baths" type="number" step="0.5" value={filters.minBathrooms ?? ''} onChange={(e) => updateFilter('minBathrooms', e.target.valueAsNumber)} />
            <Input label="Max Baths" type="number" step="0.5" value={filters.maxBathrooms ?? ''} onChange={(e) => updateFilter('maxBathrooms', e.target.valueAsNumber)} />
            <Input label="Min Year" type="number" value={filters.minYearBuilt ?? ''} onChange={(e) => updateFilter('minYearBuilt', e.target.valueAsNumber)} />
            <Input label="Max Year" type="number" value={filters.maxYearBuilt ?? ''} onChange={(e) => updateFilter('maxYearBuilt', e.target.valueAsNumber)} />
            <Select
              label="Sort By"
              value={filters.sortBy || 'price'}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              options={[
                { value: 'price', label: 'Price' },
                { value: 'squareFootage', label: 'Square Footage' },
                { value: 'yearBuilt', label: 'Year Built' },
                { value: 'schoolRating', label: 'School Rating' },
              ]}
            />
            <Select
              label="Direction"
              value={filters.sortDirection || 'desc'}
              onChange={(e) => updateFilter('sortDirection', e.target.value as 'asc' | 'desc')}
              options={[
                { value: 'asc', label: 'Ascending' },
                { value: 'desc', label: 'Descending' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* What-if analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            What-If Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <Input label="Sqft" type="number" value={whatIf.square_footage} onChange={(e) => setWhatIf({ ...whatIf, square_footage: e.target.valueAsNumber })} />
            <Input label="Beds" type="number" step="0.5" value={whatIf.bedrooms} onChange={(e) => setWhatIf({ ...whatIf, bedrooms: e.target.valueAsNumber })} />
            <Input label="Baths" type="number" step="0.5" value={whatIf.bathrooms} onChange={(e) => setWhatIf({ ...whatIf, bathrooms: e.target.valueAsNumber })} />
            <Input label="Year" type="number" value={whatIf.year_built} onChange={(e) => setWhatIf({ ...whatIf, year_built: e.target.valueAsNumber })} />
            <Input label="Lot" type="number" value={whatIf.lot_size} onChange={(e) => setWhatIf({ ...whatIf, lot_size: e.target.valueAsNumber })} />
            <Input label="Distance" type="number" step="0.1" value={whatIf.distance_to_city_center} onChange={(e) => setWhatIf({ ...whatIf, distance_to_city_center: e.target.valueAsNumber })} />
            <Input label="School" type="number" step="0.1" value={whatIf.school_rating} onChange={(e) => setWhatIf({ ...whatIf, school_rating: e.target.valueAsNumber })} />
          </div>
          <Button onClick={runWhatIfAnalysis} disabled={whatIfLoading}>
            {whatIfLoading ? 'Running...' : 'Run Prediction'}
          </Button>
          {whatIfResult && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-6 bg-primary-50 rounded-lg">
                <p className="text-sm text-slate-600">Predicted Price</p>
                <p className="text-3xl font-bold text-primary-700">{formatCurrency(whatIfResult.predictedPrice)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Comparable Properties</p>
                <div className="space-y-2">
                  {whatIfResult.comparables.slice(0, 3).map((c) => (
                    <div key={c.id} className="flex justify-between text-sm">
                      <span>{c.square_footage} sqft, {c.bedrooms} beds</span>
                      <span className="font-medium">{formatCurrency(c.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data table with exports */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle>Market Data</CardTitle>
          <div className="flex gap-2">
            <a href="/api/market/export/csv" download>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
            </a>
            <a href="/api/market/export/pdf" download>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </a>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {recordsLoading ? (
            <p className="text-slate-500">Loading records...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">ID</th>
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
                {records?.map((record) => (
                  <tr key={record.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{record.id}</td>
                    <td className="px-4 py-2">{record.square_footage}</td>
                    <td className="px-4 py-2">{record.bedrooms}</td>
                    <td className="px-4 py-2">{record.bathrooms}</td>
                    <td className="px-4 py-2">{record.year_built}</td>
                    <td className="px-4 py-2">{record.lot_size}</td>
                    <td className="px-4 py-2">{record.distance_to_city_center}</td>
                    <td className="px-4 py-2">{record.school_rating}</td>
                    <td className="px-4 py-2 text-right">
                      <Badge>{formatCurrency(record.price)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-6">
        <div className="p-3 bg-primary-50 rounded-lg">
          <Icon className="h-6 w-6 text-primary-600" />
        </div>
        <div>
          <p className="text-sm text-slate-600">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
