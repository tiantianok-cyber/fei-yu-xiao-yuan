import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
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

interface Stats {
  userCount: number;
  bookCount: number;
  otherCount: number;
  soldCount: number;
  offShelfCount: number;
  totalViews: number;
}

const AdminStats: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ userCount: 0, bookCount: 0, otherCount: 0, soldCount: 0, offShelfCount: 0, totalViews: 0 });
  const [bookTags, setBookTags] = useState<{ name: string; value: number }[]>([]);
  const [priceData, setPriceData] = useState<{ name: string; count: number }[]>([]);
  const [reviewStats, setReviewStats] = useState<{ name: string; count: number }[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Basic counts
      const [profilesRes, productsRes, viewsRes, reviewsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id, type, status, price, book_tag, created_at, view_count'),
        supabase.from('product_views').select('id', { count: 'exact', head: true }),
        supabase.from('reviews').select('id, is_default'),
      ]);

      const products = productsRes.data || [];
      const reviews = reviewsRes.data || [];

      const bookCount = products.filter(p => p.type === 'book').length;
      const otherCount = products.filter(p => p.type === 'other').length;
      const soldCount = products.filter(p => p.status === 'sold').length;
      const offShelfCount = products.filter(p => p.status === 'off_shelf').length;
      const totalViews = products.reduce((sum, p) => sum + (p.view_count || 0), 0);

      setStats({
        userCount: profilesRes.count || 0,
        bookCount,
        otherCount,
        soldCount,
        offShelfCount,
        totalViews,
      });

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

      // Trend data (last 30 days)
      const now = new Date();
      const days: any[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        days.push({
          date: dateStr.slice(5), // MM-DD
          fullDate: dateStr,
          上架: 0,
        });
      }

      products.forEach(p => {
        const pDate = p.created_at?.slice(0, 10);
        const day = days.find(d => d.fullDate === pDate);
        if (day) day['上架']++;
      });

      setTrendData(days);
    } catch (err) {
      console.error('Failed to load stats', err);
    }
    setLoading(false);
  };

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

      {/* Trend chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">上架趋势（近30天）</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="上架" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
