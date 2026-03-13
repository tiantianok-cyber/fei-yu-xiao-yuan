import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { Users, BookOpen, Package, ShoppingCart, EyeOff, Eye } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#8884d8', '#82ca9d', '#ffc658'];

const PRICE_RANGES = [
  { label: '0~5元', min: 0, max: 5 },
  { label: '5~10元', min: 5, max: 10 },
  { label: '10~20元', min: 10, max: 20 },
  { label: '20~50元', min: 20, max: 50 },
  { label: '50~100元', min: 50, max: 100 },
  { label: '100元以上', min: 100, max: Infinity },
];

type TimeGranularity = 'day' | 'week' | 'month';

interface Stats {
  userCount: number;
  bookCount: number;
  otherCount: number;
  soldCount: number;
  offShelfCount: number;
  totalViews: number;
}

// Helper: get date string for grouping
function getDateKey(dateStr: string, granularity: TimeGranularity): string {
  const d = new Date(dateStr);
  if (granularity === 'day') return d.toISOString().slice(0, 10);
  if (granularity === 'month') return d.toISOString().slice(0, 7);
  // week: use Monday as start
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

// Generate time buckets
function generateBuckets(granularity: TimeGranularity): { key: string; label: string }[] {
  const buckets: { key: string; label: string }[] = [];
  const now = new Date();

  if (granularity === 'day') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.push({ key, label: key.slice(5) });
    }
  } else if (granularity === 'week') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      const key = monday.toISOString().slice(0, 10);
      if (!buckets.find(b => b.key === key)) {
        buckets.push({ key, label: key.slice(5) });
      }
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      buckets.push({ key, label: key.slice(2) }); // e.g. 24-01
    }
  }
  return buckets;
}

const GRANULARITY_LABELS: Record<TimeGranularity, string> = { day: '按日', week: '按周', month: '按月' };

const AdminStats: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ userCount: 0, bookCount: 0, otherCount: 0, soldCount: 0, offShelfCount: 0, totalViews: 0 });
  const [bookTags, setBookTags] = useState<{ name: string; value: number }[]>([]);
  const [priceData, setPriceData] = useState<{ name: string; count: number }[]>([]);
  const [reviewStats, setReviewStats] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Raw data for trend computation
  const [userDates, setUserDates] = useState<string[]>([]);
  const [productDates, setProductDates] = useState<string[]>([]);
  const [soldDates, setSoldDates] = useState<string[]>([]);
  const [offShelfDates, setOffShelfDates] = useState<string[]>([]);
  const [viewDates, setViewDates] = useState<string[]>([]);

  const [granularity, setGranularity] = useState<TimeGranularity>('day');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profilesRes, productsRes, viewsCountRes, reviewsRes, profileDatesRes, viewDatesRes, ordersRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id, type, status, price, book_tag, created_at, view_count, updated_at'),
        supabase.from('product_views').select('id', { count: 'exact', head: true }),
        supabase.from('reviews').select('id, is_default'),
        supabase.from('profiles').select('created_at'),
        supabase.from('product_views').select('viewed_at'),
        supabase.from('orders').select('id, status, completed_at, cancelled_at'),
      ]);

      const products = productsRes.data || [];
      const reviews = reviewsRes.data || [];

      const bookCount = products.filter(p => p.type === 'book').length;
      const otherCount = products.filter(p => p.type === 'other').length;
      const soldCount = products.filter(p => p.status === 'sold').length;
      const offShelfCount = products.filter(p => p.status === 'off_shelf').length;
      const totalViews = products.reduce((sum, p) => sum + (p.view_count || 0), 0);

      setStats({ userCount: profilesRes.count || 0, bookCount, otherCount, soldCount, offShelfCount, totalViews });

      // Raw dates for trends
      setUserDates((profileDatesRes.data || []).map(p => p.created_at));
      setProductDates(products.map(p => p.created_at));
      // For sold: use updated_at of sold products as approximate sold date
      setSoldDates(products.filter(p => p.status === 'sold').map(p => p.updated_at));
      setOffShelfDates(products.filter(p => p.status === 'off_shelf').map(p => p.updated_at));
      setViewDates((viewDatesRes.data || []).map(v => v.viewed_at));

      // Book tag distribution
      const tagMap: Record<string, number> = {};
      products.filter(p => p.type === 'book' && p.book_tag).forEach(p => {
        tagMap[p.book_tag!] = (tagMap[p.book_tag!] || 0) + 1;
      });
      setBookTags(Object.entries(tagMap).map(([name, value]) => ({ name, value })));

      // Price distribution
      setPriceData(PRICE_RANGES.map(r => ({
        name: r.label,
        count: products.filter(p => p.price >= r.min && (r.max === Infinity ? true : p.price < r.max)).length,
      })));

      // Review stats
      const activeReviews = reviews.filter(r => !r.is_default).length;
      const defaultReviews = reviews.filter(r => r.is_default).length;
      setReviewStats([
        { name: '主动评价', count: activeReviews },
        { name: '默认好评', count: defaultReviews },
      ]);
    } catch (err) {
      console.error('Failed to load stats', err);
    }
    setLoading(false);
  };

  // Compute trend data based on granularity
  const trendData = useMemo(() => {
    const buckets = generateBuckets(granularity);
    return buckets.map(b => {
      const row: any = { date: b.label, fullKey: b.key };
      row['上架'] = productDates.filter(d => getDateKey(d, granularity) === b.key).length;
      return row;
    });
  }, [productDates, granularity]);

  const userTrend = useMemo(() => {
    const buckets = generateBuckets(granularity);
    return buckets.map(b => ({
      date: b.label,
      新增用户: userDates.filter(d => getDateKey(d, granularity) === b.key).length,
    }));
  }, [userDates, granularity]);

  const soldTrend = useMemo(() => {
    const buckets = generateBuckets(granularity);
    return buckets.map(b => ({
      date: b.label,
      售出: soldDates.filter(d => getDateKey(d, granularity) === b.key).length,
    }));
  }, [soldDates, granularity]);

  const offShelfTrend = useMemo(() => {
    const buckets = generateBuckets(granularity);
    return buckets.map(b => ({
      date: b.label,
      下架: offShelfDates.filter(d => getDateKey(d, granularity) === b.key).length,
    }));
  }, [offShelfDates, granularity]);

  const viewTrend = useMemo(() => {
    const buckets = generateBuckets(granularity);
    return buckets.map(b => ({
      date: b.label,
      浏览量: viewDates.filter(d => getDateKey(d, granularity) === b.key).length,
    }));
  }, [viewDates, granularity]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">加载统计数据...</div>;
  }

  const statCards = [
    { label: '用户总数', value: stats.userCount, icon: Users },
    { label: '书籍数量', value: stats.bookCount, icon: BookOpen },
    { label: '其他物品', value: stats.otherCount, icon: Package },
    { label: '已售出', value: stats.soldCount, icon: ShoppingCart },
    { label: '已下架', value: stats.offShelfCount, icon: EyeOff },
    { label: '总浏览量', value: stats.totalViews, icon: Eye },
  ];

  const trendCharts = [
    { title: '用户增长趋势', data: userTrend, dataKey: '新增用户', color: 'hsl(var(--primary))' },
    { title: '上架趋势', data: trendData, dataKey: '上架', color: 'hsl(var(--chart-2))' },
    { title: '售出趋势', data: soldTrend, dataKey: '售出', color: 'hsl(var(--chart-3))' },
    { title: '下架趋势', data: offShelfTrend, dataKey: '下架', color: 'hsl(var(--chart-4))' },
    { title: '浏览趋势', data: viewTrend, dataKey: '浏览量', color: 'hsl(var(--chart-5))' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex flex-col items-center gap-1">
              <s.icon className="h-5 w-5 text-muted-foreground" />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Time granularity toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">时间维度：</span>
        <Tabs value={granularity} onValueChange={(v) => setGranularity(v as TimeGranularity)}>
          <TabsList>
            {(['day', 'week', 'month'] as TimeGranularity[]).map(g => (
              <TabsTrigger key={g} value={g} className="text-xs px-3">{GRANULARITY_LABELS[g]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 gap-4">
        {trendCharts.map(chart => (
          <Card key={chart.title}>
            <CardHeader><CardTitle className="text-sm">{chart.title}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chart.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey={chart.dataKey} stroke={chart.color} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Book tag pie chart */}
        <Card>
          <CardHeader><CardTitle className="text-sm">书籍标签分布</CardTitle></CardHeader>
          <CardContent>
            {bookTags.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={bookTags} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {bookTags.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>}
          </CardContent>
        </Card>

        {/* Price distribution */}
        <Card>
          <CardHeader><CardTitle className="text-sm">价格区间分布</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Review stats */}
        <Card>
          <CardHeader><CardTitle className="text-sm">评价统计</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={reviewStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminStats;
