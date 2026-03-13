import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, Loader2, AlertTriangle, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GradeSemesterSelector } from '@/components/auth/GradeSemesterSelector';

const CONDITIONS = [
  { value: 'brand_new', label: '全新', desc: '未使用，包装完好' },
  { value: 'almost_new', label: '几乎全新', desc: '仅翻阅，无笔记折痕' },
  { value: 'slightly_used', label: '轻微使用', desc: '少量笔记，整体良好' },
  { value: 'used', label: '使用过', desc: '有笔记标注，不影响阅读' },
  { value: 'heavily_used', label: '大量使用', desc: '较多笔记磨损，可正常使用' },
];

const BOOK_TAGS = ['学校推荐', '课外书', '教材教辅', '兴趣书', '工具书', '绘本', '课外读物', '其他'];

const PublishPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<'book' | 'other'>('book');
  const [name, setName] = useState('');
  const [author, setAuthor] = useState('');
  const [translator, setTranslator] = useState('');
  const [publisher, setPublisher] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [grade, setGrade] = useState('');
  const [semester, setSemester] = useState('');
  const [bookTag, setBookTag] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [school, setSchool] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from sessionStorage (copy from product detail)
  useEffect(() => {
    const prefill = sessionStorage.getItem('prefill_product');
    if (prefill) {
      try {
        const data = JSON.parse(prefill);
        if (data.type) setType(data.type);
        if (data.name) setName(data.name);
        if (data.author) setAuthor(data.author);
        if (data.translator) setTranslator(data.translator);
        if (data.publisher) setPublisher(data.publisher);
        if (data.publish_date) setPublishDate(data.publish_date);
        if (data.grade?.length) setGrade(data.grade[0]);
        if (data.semester) setSemester(data.semester);
        if (data.book_tag) setBookTag(data.book_tag);
      } catch {}
      sessionStorage.removeItem('prefill_product');
    }
  }, []);

  // Default school/grade/semester from profile
  useEffect(() => {
    if (profile?.school && !school) setSchool(profile.school);
    if (profile?.child_grade && !grade) setGrade(profile.child_grade);
    if (profile?.child_semester && !semester) setSemester(profile.child_semester);
  }, [profile]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: '图片不能超过5MB', variant: 'destructive' });
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!name.trim()) { toast({ title: '请输入名称', variant: 'destructive' }); return; }
    if (!price || Number(price) <= 0) { toast({ title: '请输入有效价格', variant: 'destructive' }); return; }
    if (type === 'book' && !bookTag) { toast({ title: '请选择书籍标签', variant: 'destructive' }); return; }
    if (type === 'book' && !condition) { toast({ title: '请选择成色', variant: 'destructive' }); return; }

    setSubmitting(true);

    let coverUrl: string | null = null;
    if (coverFile) {
      const ext = coverFile.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, coverFile, { upsert: true });
      if (uploadError) {
        toast({ title: '图片上传失败', description: uploadError.message, variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
      coverUrl = urlData.publicUrl;
    }

    const productData = {
      seller_id: user.id,
      type,
      name: name.trim(),
      author: type === 'book' ? (author.trim() || null) : null,
      translator: type === 'book' ? (translator.trim() || null) : null,
      publisher: type === 'book' ? (publisher.trim() || null) : null,
      publish_date: type === 'book' ? (publishDate.trim() || null) : null,
      grade: grade ? [grade] : null,
      semester: semester || null,
      book_tag: type === 'book' ? (bookTag || null) : null,
      condition: (type === 'book' ? condition : (condition || 'used')) as any,
      condition_note: null,
      description: description.trim() || null,
      defect_description: null,
      price: Number(price),
      school: school.trim() || null,
      cover_image_url: coverUrl,
    };

    const { error } = await supabase.from('products').insert(productData);
    if (error) {
      toast({ title: '发布失败', description: error.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    toast({ title: '发布成功 🎉' });
    navigate('/my-products');
  };

  const BookNotice = () => (
    <div className="space-y-2 mb-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>请确保上架书籍为正版，盗版/影印版书籍严禁上架。经发现将被下架处理；多次违规或情节严重者，将予以封号。</span>
      </div>
      <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 text-primary text-sm">
        <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
        <span>信息越丰富，越容易被他人查找到</span>
      </div>
    </div>
  );

  const OtherNotice = () => (
    <div className="space-y-2 mb-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>请确保物品为正品，并如实描述详细情况。</span>
      </div>
      <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 text-primary text-sm">
        <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
        <span>信息越丰富，越容易被他人查找到</span>
      </div>
    </div>
  );

  // Shared fields: cover, school, grade/semester, price, description
  const SharedFields = () => (
    <>
      {/* Cover image */}
      <div className="space-y-2">
        <Label>封面图片</Label>
        <div className="flex items-start gap-3">
          {coverPreview ? (
            <div className="relative w-24 h-[136px] rounded-lg overflow-hidden border border-border">
              <img src={coverPreview} alt="封面" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-[136px] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Camera className="h-6 w-6 mb-1" />
              <span className="text-xs">添加图片</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
        </div>
      </div>
    </>
  );

  const SchoolAndGradeFields = () => (
    <>
      {/* School */}
      <div className="space-y-2">
        <Label>适用学校</Label>
        <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="适用的学校名称（选填）" />
      </div>

      {/* Grade & Semester */}
      <div className="space-y-2">
        <Label>适用年级与学期</Label>
        <GradeSemesterSelector
          grade={grade}
          semester={semester}
          onChange={(g, s) => { setGrade(g); setSemester(s); }}
        />
      </div>
    </>
  );

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-lg font-semibold text-foreground mb-4">发布物品</h1>

      <Tabs value={type} onValueChange={(v) => setType(v as 'book' | 'other')}>
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="book" className="text-base">📚 书籍</TabsTrigger>
          <TabsTrigger value="other" className="text-base">📦 其他</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit} className="space-y-5">
          <TabsContent value="book" className="mt-0 space-y-5">
            <BookNotice />
            <SharedFields />

            {/* Book name */}
            <div className="space-y-2">
              <Label>书名 *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="请输入书名" />
            </div>

            {/* Author & Translator */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>作者</Label>
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="作者姓名" />
              </div>
              <div className="space-y-2">
                <Label>译者</Label>
                <Input value={translator} onChange={(e) => setTranslator(e.target.value)} placeholder="译者姓名（选填）" />
              </div>
            </div>

            {/* Publisher & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>出版社</Label>
                <Input value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="出版社名称" />
              </div>
              <div className="space-y-2">
                <Label>出版时间</Label>
                <Input value={publishDate} onChange={(e) => setPublishDate(e.target.value)} placeholder="如：2024年1月" />
              </div>
            </div>

            {/* Book tag - dropdown, required */}
            <div className="space-y-2">
              <Label>书籍标签 *</Label>
              <Select value={bookTag} onValueChange={setBookTag}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择书籍标签" />
                </SelectTrigger>
                <SelectContent>
                  {BOOK_TAGS.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <Label>成色 *</Label>
              <div className="space-y-1.5">
                {CONDITIONS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCondition(c.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border ${
                      condition === c.value
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <span className="font-medium">{c.label}</span>
                    <span className="text-muted-foreground ml-2">— {c.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <SchoolAndGradeFields />
          </TabsContent>

          <TabsContent value="other" className="mt-0 space-y-5">
            <OtherNotice />
            <SharedFields />

            {/* Item name */}
            <div className="space-y-2">
              <Label>物品名称 *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入物品名称（10字以内）"
                maxLength={10}
              />
            </div>

            <SchoolAndGradeFields />
          </TabsContent>

          {/* Price */}
          <div className="space-y-2">
            <Label>价格 *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">¥</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="pl-8"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>描述</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="关于这件物品的更多描述（选填）"
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            发布
          </Button>
        </form>
      </Tabs>
    </div>
  );
};

export default PublishPage;
