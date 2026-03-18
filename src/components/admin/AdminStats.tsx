import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
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

const GRADE_ORDER = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级', '高一', '高二', '高三'];

type TimeGranularity = 'day' | 'week' | 'month';

interface Stats {
  userCount: number;
  bookCount: number;
  otherCount: number;
  soldCount: number;
  offShelfCount: number;
  totalViews: number;
}

function getDateKey(dateStr: string, granularity: TimeGranularity): string {
  const d = new Date(dateStr);
  if (granularity === 'day') return d.toISOString().slice(0, 10);
  if (granularity === 'month') return d.toISOString().slice(0, 7);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

function generateBuckets(granularity: TimeGranularity): { key: string; label: string }[] {
  const buckets: { key: string; label: string }[] = [];
  const now = new Date();
  if (granularity === 'day') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.push({ key, label: key.slice(5) });
    }
  } else if (granularity === 'week') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 7);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d); monday.setDate(diff);
      const key = monday.toISOString().slice(0, 10);
      if (!buckets.find(b => b.key === key)) buckets.push({ key, label: key.slice(5) });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      buckets.push({ key, label: key.slice(2) });
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
  const [cityData, setCityData] = useState<{ name: string; count: number }[]>([]);
  const [gradeData, setGradeData] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const [userDates, setUserDates] = useState<string[]>([]);
  const [productDates, setProductDates] = useState<string[]>([]);
  const [soldDates, setSoldDates] = useState<string[]>([]);
  const [offShelfDates, setOffShelfDates] = useState<string[]>([]);
  const [viewDates, setViewDates] = useState<string[]>([]);

  const [granularity, setGranularity] = useState<TimeGranularity>('day');
  const [activeTrend, setActiveTrend] = useState('users');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profilesRes, productsRes, profileDetailsRes, viewDatesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id, type, status, price, book_tag, created_at, view_count, updated_at').limit(5000),
        supabase.from('profiles').select('created_at, city, child_grade'),
        supabase.from('product_views').select('viewed_at').limit(5000),
      ]);

      if (productsRes.error) console.error('Products query error:', productsRes.error);
      if (viewDatesRes.error) console.error('Views query error:', viewDatesRes.error);
      if (profileDetailsRes.error) console.error('Profiles query error:', profileDetailsRes.error);

      const products = productsRes.data || [];
      const reviews = reviewsRes.data || [];
      const profileDetails = profileDetailsRes.data || [];

      console.log('Admin stats loaded:', { products: products.length, views: (viewDatesRes.data || []).length, profiles: profileDetails.length });

      const bookCount = products.filter(p => p.type === 'book').length;
      const otherCount = products.filter(p => p.type === 'other').length;
      const soldCount = products.filter(p => p.status === 'sold').length;
      const offShelfCount = products.filter(p => p.status === 'off_shelf').length;
      const totalViews = products.reduce((sum, p) => sum + (p.view_count || 0), 0);

      setStats({ userCount: profilesRes.count || 0, bookCount, otherCount, soldCount, offShelfCount, totalViews });

      setUserDates(profileDetails.map(p => p.created_at).filter(Boolean));
      setProductDates(products.map(p => p.created_at).filter(Boolean));
      setSoldDates(products.filter(p => p.status === 'sold').map(p => p.updated_at).filter(Boolean));
      setOffShelfDates(products.filter(p => p.status === 'off_shelf').map(p => p.updated_at).filter(Boolean));
      setViewDates((viewDatesRes.data || []).map(v => v.viewed_at).filter(Boolean));

      // City distribution
      const cityMap: Record<string, number> = {};
      profileDetails.forEach(p => {
        const city = p.city?.trim();
        if (city) cityMap[city] = (cityMap[city] || 0) + 1;
      });
      setCityData(
        Object.entries(cityMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
      );

      // Grade distribution
      const gradeMap: Record<string, number> = {};
      profileDetails.forEach(p => {
        const grade = p.child_grade?.trim();
        if (grade) gradeMap[grade] = (gradeMap[grade] || 0) + 1;
      });
      setGradeData(
        GRADE_ORDER
          .filter(g => gradeMap[g])
          .map(g => ({ name: g, count: gradeMap[g] }))
          .concat(
            Object.entries(gradeMap)
              .filter(([g]) => !GRADE_ORDER.includes(g))
              .map(([name, count]) => ({ name, count }))
          )
      );

      // Book tag distribution
      const tagMap: Record<string, number> = {};
      products.filter(p => p.type === 'book' && p.book_tag).forEach(p => {
        tagMap[p.book_tag!] = (tagMap[p.book_tag!] || 0) + 1;
      });
      setBookTags(Object.entries(tagMap).map(([name, value]) => ({ name, value })));

      setPriceData(PRICE_RANGES.map(r => ({
        name: r.label,
        count: products.filter(p => p.price >= r.min && (r.max === Infinity ? true : p.price < r.max)).length,
      })));

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

  const buildTrend = (dates: string[], key: string) => {
    const buckets = generateBuckets(granularity);
    return buckets.map(b => ({
      date: b.label,
      [key]: dates.filter(d => getDateKey(d, granularity) === b.key).length,
    }));
  };

  const userTrend = useMemo(() => buildTrend(userDates, '新增用户'), [userDates, granularity]);
  const listingTrend = useMemo(() => buildTrend(productDates, '上架'), [productDates, granularity]);
  const soldTrend = useMemo(() => buildTrend(soldDates, '售出'), [soldDates, granularity]);
  const offShelfTrend = useMemo(() => buildTrend(offShelfDates, '下架'), [offShelfDates, granularity]);
  const viewTrend = useMemo(() => buildTrend(viewDates, '浏览量'), [viewDates, granularity]);

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

  const trendTabs = [
    { key: 'users', label: '用户增长', data: userTrend, dataKey: '新增用户', color: 'hsl(var(--primary))' },
    { key: 'listing', label: '上架', data: listingTrend, dataKey: '上架', color: 'hsl(var(--chart-2))' },
    { key: 'sold', label: '售出', data: soldTrend, dataKey: '售出', color: 'hsl(var(--chart-3))' },
    { key: 'offshelf', label: '下架', data: offShelfTrend, dataKey: '下架', color: 'hsl(var(--chart-4))' },
    { key: 'views', label: '浏览', data: viewTrend, dataKey: '浏览量', color: 'hsl(var(--chart-5))' },
  ];

  const activeChart = trendTabs.find(t => t.key === activeTrend) || trendTabs[0];

  // City chart: use horizontal bar for many cities, with dynamic height
  const cityChartHeight = Math.max(300, cityData.length * 28);

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

      {/* Trend charts with tabs */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-sm">趋势统计</CardTitle>
            <Tabs value={granularity} onValueChange={(v) => setGranularity(v as TimeGranularity)}>
              <TabsList className="h-8">
                {(['day', 'week', 'month'] as TimeGranularity[]).map(g => (
                  <TabsTrigger key={g} value={g} className="text-xs px-2.5 h-6">{GRANULARITY_LABELS[g]}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTrend} onValueChange={setActiveTrend}>
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              {trendTabs.map(t => (
                <TabsTrigger key={t.key} value={t.key} className="text-xs px-3">{t.label}</TabsTrigger>
              ))}
            </TabsList>
            {trendTabs.map(t => (
              <TabsContent key={t.key} value={t.key}>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={t.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey={t.dataKey} stroke={t.color} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* City distribution - horizontal bar with scroll */}
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-sm">用户城市分布（共 {cityData.length} 个城市）</CardTitle></CardHeader>
          <CardContent>
            {cityData.length > 0 ? (
              <ScrollArea className="w-full" style={{ height: Math.min(cityChartHeight, 500) }}>
                <div style={{ height: cityChartHeight, minWidth: '100%' }}>
                  <ResponsiveContainer width="100%" height={cityChartHeight}>
                    <BarChart data={cityData} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            ) : <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>}
          </CardContent>
        </Card>

        {/* Grade distribution */}
        <Card>
          <CardHeader><CardTitle className="text-sm">年级分布</CardTitle></CardHeader>
          <CardContent>
            {gradeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={gradeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>}
          </CardContent>
        </Card>

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
