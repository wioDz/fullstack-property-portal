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
import {
  BarChart3,
  Filter,
  Download,
  Calculator,
  TrendingUp,
  Home,
  Layers,
  Star,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ClientOnly } from '@/components/ClientOnly';
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

  /**
   * Format a number for a controlled number input so React never receives NaN.
   * NaN is converted to an empty string; undefined/null falls back to empty.
   */
  const numberInputValue = (value: number | undefined | null): string | number => {
    if (value === undefined || value === null) return '';
    return Number.isNaN(value) ? '' : value;
  };

  /**
   * Parse a string from a filter number input. Empty input clears the filter;
   * invalid input is ignored by returning undefined.
   */
  const parseFilterNumber = (value: string): number | undefined => {
    if (value === '') return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  /**
   * Parse a string from a number input back into a number, falling back to the
   * previous value if the input is empty or invalid.
   */
  const parseNumberOrKeep = (value: string, fallback: number): number => {
    if (value === '') return fallback;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

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
    <ClientOnly
      fallback={
        <div className="mx-auto max-w-7xl space-y-8 p-4">
          <Skeleton className="h-12 w-1/3" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      }
    >
      <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Property Market Analysis</h1>
            <p className="text-muted-foreground">Explore trends, filter segments, and run what-if scenarios.</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Average Price"
          value={statsLoading ? undefined : formatCurrency(stats?.averagePrice || 0)}
          icon={TrendingUp}
        />
        <KpiCard
          title="Median Price"
          value={statsLoading ? undefined : formatCurrency(stats?.medianPrice || 0)}
          icon={BarChart3}
        />
        <KpiCard
          title="Properties"
          value={statsLoading ? undefined : String(stats?.count || 0)}
          icon={Layers}
        />
        <KpiCard
          title="Avg School Rating"
          value={statsLoading ? undefined : formatNumber(stats?.averageSchoolRating || 0)}
          icon={Star}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Average Price by Bedrooms
            </CardTitle>
            <CardDescription>How price changes with bedroom count.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bedroomData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${v / 1000}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="avgPrice" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              Price vs Square Footage
            </CardTitle>
            <CardDescription>Property size plotted against sale price.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="squareFootage" name="Sqft" tick={{ fontSize: 12 }} />
                <YAxis
                  type="number"
                  dataKey="price"
                  name="Price"
                  tickFormatter={(v) => `$${v / 1000}k`}
                  tick={{ fontSize: 12 }}
                />
                <ZAxis type="number" dataKey="schoolRating" range={[4, 16]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(v: number, n: string) => [n === 'price' ? formatCurrency(v) : v, n]}
                />
                <Legend />
                <Scatter name="Properties" data={records || []} fill="hsl(var(--primary))" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filters
          </CardTitle>
          <CardDescription>Narrow the dataset to a specific market segment.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Min Bedrooms">
              <Input
                type="number"
                step="0.5"
                value={numberInputValue(filters.minBedrooms)}
                onChange={(e) => updateFilter('minBedrooms', parseFilterNumber(e.target.value))}
              />
            </FormField>
            <FormField label="Max Bedrooms">
              <Input
                type="number"
                step="0.5"
                value={numberInputValue(filters.maxBedrooms)}
                onChange={(e) => updateFilter('maxBedrooms', parseFilterNumber(e.target.value))}
              />
            </FormField>
            <FormField label="Min Bathrooms">
              <Input
                type="number"
                step="0.5"
                value={numberInputValue(filters.minBathrooms)}
                onChange={(e) => updateFilter('minBathrooms', parseFilterNumber(e.target.value))}
              />
            </FormField>
            <FormField label="Max Bathrooms">
              <Input
                type="number"
                step="0.5"
                value={numberInputValue(filters.maxBathrooms)}
                onChange={(e) => updateFilter('maxBathrooms', parseFilterNumber(e.target.value))}
              />
            </FormField>
            <FormField label="Min Year">
              <Input
                type="number"
                value={numberInputValue(filters.minYearBuilt)}
                onChange={(e) => updateFilter('minYearBuilt', parseFilterNumber(e.target.value))}
              />
            </FormField>
            <FormField label="Max Year">
              <Input
                type="number"
                value={numberInputValue(filters.maxYearBuilt)}
                onChange={(e) => updateFilter('maxYearBuilt', parseFilterNumber(e.target.value))}
              />
            </FormField>
            <FormField label="Sort By">
              <Select
                value={filters.sortBy || 'price'}
                onValueChange={(value) => updateFilter('sortBy', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="squareFootage">Square Footage</SelectItem>
                  <SelectItem value="yearBuilt">Year Built</SelectItem>
                  <SelectItem value="schoolRating">School Rating</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Direction">
              <Select
                value={filters.sortDirection || 'desc'}
                onValueChange={(value) => updateFilter('sortDirection', value as 'asc' | 'desc')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* What-if analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            What-If Analysis
          </CardTitle>
          <CardDescription>Tweak a hypothetical property and see its predicted price.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Square Footage">
              <Input
                type="number"
                value={numberInputValue(whatIf.square_footage)}
                onChange={(e) =>
                  setWhatIf({ ...whatIf, square_footage: parseNumberOrKeep(e.target.value, whatIf.square_footage) })
                }
              />
            </FormField>
            <FormField label="Bedrooms">
              <Input
                type="number"
                step="0.5"
                value={numberInputValue(whatIf.bedrooms)}
                onChange={(e) => setWhatIf({ ...whatIf, bedrooms: parseNumberOrKeep(e.target.value, whatIf.bedrooms) })}
              />
            </FormField>
            <FormField label="Bathrooms">
              <Input
                type="number"
                step="0.5"
                value={numberInputValue(whatIf.bathrooms)}
                onChange={(e) => setWhatIf({ ...whatIf, bathrooms: parseNumberOrKeep(e.target.value, whatIf.bathrooms) })}
              />
            </FormField>
            <FormField label="Year Built">
              <Input
                type="number"
                value={numberInputValue(whatIf.year_built)}
                onChange={(e) => setWhatIf({ ...whatIf, year_built: parseNumberOrKeep(e.target.value, whatIf.year_built) })}
              />
            </FormField>
            <FormField label="Lot Size">
              <Input
                type="number"
                value={numberInputValue(whatIf.lot_size)}
                onChange={(e) => setWhatIf({ ...whatIf, lot_size: parseNumberOrKeep(e.target.value, whatIf.lot_size) })}
              />
            </FormField>
            <FormField label="Distance to Center">
              <Input
                type="number"
                step="0.1"
                value={numberInputValue(whatIf.distance_to_city_center)}
                onChange={(e) =>
                  setWhatIf({
                    ...whatIf,
                    distance_to_city_center: parseNumberOrKeep(e.target.value, whatIf.distance_to_city_center),
                  })
                }
              />
            </FormField>
            <FormField label="School Rating">
              <Input
                type="number"
                step="0.1"
                value={numberInputValue(whatIf.school_rating)}
                onChange={(e) =>
                  setWhatIf({ ...whatIf, school_rating: parseNumberOrKeep(e.target.value, whatIf.school_rating) })
                }
              />
            </FormField>
          </div>
          <Button onClick={runWhatIfAnalysis} disabled={whatIfLoading}>
            <Calculator className="mr-2 h-4 w-4" />
            {whatIfLoading ? 'Running...' : 'Run Prediction'}
          </Button>

          {whatIfResult && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-primary/5 p-6">
                <p className="text-sm font-medium text-muted-foreground">Predicted Price</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-primary">
                  {formatCurrency(whatIfResult.predictedPrice)}
                </p>
              </div>
              <div className="rounded-xl border p-5">
                <p className="text-sm font-semibold">Comparable Properties</p>
                <div className="mt-3 space-y-2">
                  {whatIfResult.comparables.slice(0, 3).map((c) => (
                    <div key={c.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{c.square_footage} sqft, {c.bedrooms} beds</span>
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
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Market Data
            </CardTitle>
            <CardDescription>Browse and export filtered property records.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/api/market/export/csv" download>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/api/market/export/pdf" download>
                <Download className="mr-2 h-4 w-4" />
                PDF
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recordsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
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
                  {records?.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.id}</TableCell>
                      <TableCell>{record.square_footage}</TableCell>
                      <TableCell>{record.bedrooms}</TableCell>
                      <TableCell>{record.bathrooms}</TableCell>
                      <TableCell>{record.year_built}</TableCell>
                      <TableCell>{record.lot_size}</TableCell>
                      <TableCell>{record.distance_to_city_center}</TableCell>
                      <TableCell>{record.school_rating}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{formatCurrency(record.price)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </ClientOnly>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | undefined;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {value === undefined ? (
            <Skeleton className="mt-1 h-7 w-24" />
          ) : (
            <p className="mt-0.5 text-2xl font-bold tracking-tight">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
