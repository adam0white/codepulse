import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Zap, AlertTriangle, LineChart, Plus, Minus, GitCommit, User, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toaster, toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { format, parseISO, differenceInHours } from 'date-fns';
import type { ApiResponse, AnalysisData, ChartDataPoint } from '@shared/types';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
}
function StatCard({ title, value, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

type Status = 'idle' | 'loading' | 'success' | 'error';
export function HomePage() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [useLogScale, setUseLogScale] = useState(false);
  const autoLogScale = useMemo(() => {
    if (!analysisData || analysisData.length < 2) return false;
    const velocities = analysisData.map(d => d.velocity).filter(v => v > 0);
    if (velocities.length < 2) return false;
    const max = Math.max(...velocities);
    const min = Math.min(...velocities);
    return max / min > 100; // Auto-enable if max is 100x greater than min
  }, [analysisData]);
  useEffect(() => {
    setUseLogScale(autoLogScale);
  }, [autoLogScale]);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url) {
      toast.error('Please enter a GitHub repository URL.');
      return;
    }
    setStatus('loading');
    setError(null);
    setAnalysisData(null);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const result = (await response.json()) as ApiResponse<AnalysisData>;
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'An unknown error occurred.');
      }
      setAnalysisData(result.data || []);
      setStatus('success');
      toast.success('Analysis complete!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
      setStatus('error');
      toast.error('Analysis Failed', { description: errorMessage });
    }
  };
  const summaryStats = useMemo(() => {
    if (!analysisData || analysisData.length === 0) {
      return { peak: 0, average: 0, totalChanges: 0, totalCommits: 0 };
    }
    const totalVelocity = analysisData.reduce((sum, d) => sum + d.velocity, 0);
    const totalChanges = analysisData.reduce((sum, d) => sum + d.additions + d.deletions, 0);
    return {
      peak: Math.max(...analysisData.map(d => d.velocity)),
      average: totalVelocity / analysisData.length,
      totalChanges: totalChanges,
      totalCommits: analysisData.length + 1,
    };
  }, [analysisData]);
  const timeRangeHours = useMemo(() => {
    if (!analysisData || analysisData.length < 2) return null;
    const firstDate = parseISO(analysisData[0].date);
    const lastDate = parseISO(analysisData[analysisData.length - 1].date);
    return differenceInHours(lastDate, firstDate);
  }, [analysisData]);
  const tickFormatter = (str: string) => {
    const date = parseISO(str);
    if (timeRangeHours !== null && timeRangeHours <= 72) {
      return format(date, 'MMM d, HH:mm');
    }
    return format(date, 'MMM d');
  };
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: ChartDataPoint = payload[0].payload;
      return (
        <Card className="text-sm shadow-lg">
          <CardContent className="p-3 space-y-2">
            <p className="font-bold text-foreground">{format(parseISO(data.date), 'MMM d, yyyy HH:mm')}</p>
            <p className="font-mono text-xs text-muted-foreground truncate max-w-xs">{data.message}</p>
            <div className="border-t pt-2 mt-2 space-y-1">
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Zap className="size-3.5 text-primary" /> Velocity:</span>
                <span className="font-semibold">{data.velocity.toFixed(2)} lines/min</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Plus className="size-3.5 text-green-500" /> Additions:</span>
                <span className="font-semibold text-green-500">{data.additions}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><Minus className="size-3.5 text-red-500" /> Deletions:</span>
                <span className="font-semibold text-red-500">{data.deletions}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5"><User className="size-3.5" /> Author:</span>
                <span className="font-semibold">{data.author}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  };
  return (
    <div className="min-h-screen w-full bg-background bg-gradient-subtle dark:bg-gradient-subtle">
      <ThemeToggle className="fixed top-4 right-4" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 md:py-16 lg:py-20 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter">
              Code<span className="text-primary">Pulse</span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Analyze the development velocity of any public GitHub repository.
            </p>
          </motion.div>
          <motion.form
            onSubmit={handleSubmit}
            className="mt-8 max-w-xl mx-auto flex items-center space-x-2"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Github className="h-5 w-5 text-muted-foreground" />
            <Input
              type="url"
              placeholder="https://github.com/facebook/react"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={status === 'loading'}
              className="flex-grow"
            />
            <Button type="submit" disabled={status === 'loading'} className="min-w-[120px]">
              {status === 'loading' ? (
                <span className="animate-pulse">Analyzing...</span>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" /> Analyze
                </>
              )}
            </Button>
          </motion.form>
        </div>
        <div className="pb-12 md:pb-16 lg:pb-20">
          <AnimatePresence mode="wait">
            {status === 'loading' && (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                <Skeleton className="h-[400px] w-full rounded-xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <Skeleton className="h-32 w-full rounded-xl" />
                </div>
              </motion.div>
            )}
            {status === 'error' && error && (
              <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Analysis Failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
            {status === 'success' && analysisData && (
              <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2"><LineChart className="text-primary" /> Commit Velocity</CardTitle>
                        <CardDescription>Lines of code changed (additions + deletions) per minute between commits.</CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="log-scale-switch">Log Scale</Label>
                        <Switch id="log-scale-switch" checked={useLogScale} onCheckedChange={setUseLogScale} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={analysisData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tickFormatter={tickFormatter} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis scale={useLogScale ? "log" : "linear"} domain={useLogScale ? [1, 'auto'] : [0, 'auto']} allowDataOverflow={useLogScale} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
                          <Line type="monotone" dataKey="velocity" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Peak Velocity" value={`${summaryStats.peak.toFixed(2)} lpm`} icon={Zap} />
                  <StatCard title="Average Velocity" value={`${summaryStats.average.toFixed(2)} lpm`} icon={Clock} />
                  <StatCard title="Total Changes" value={summaryStats.totalChanges.toLocaleString()} icon={GitCommit} />
                  <StatCard title="Commits Analyzed" value={summaryStats.totalCommits.toLocaleString()} icon={User} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <footer className="text-center py-6 text-sm text-muted-foreground">
        Built with ❤️ at Cloudflare
      </footer>
      <Toaster richColors closeButton />
    </div>
  );
}