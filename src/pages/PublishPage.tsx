import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { GradeSemesterSelector } from '@/components/auth/GradeSemesterSelector';

const CONDITIONS = [
  { value: 'brand_new', label: '全新', desc: '未使用，包装完好' },
  { value: 'almost_new', label: '几乎全新', desc: '仅翻阅，无笔记折痕' },
  { value: 'slightly_used', label: '轻微使用', desc: '少量笔记，整体良好' },
  { value: 'used', label: '使用过', desc: '有笔记标注，不影响阅读' },
  { value: 'heavily_used', label: '大量使用', desc: '较多笔记磨损，可正常使用' },
];

const BOOK_TAGS = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '科学', '音乐', '美术', '体育', '综合', '课外读物', '练习册', '试卷', '其他'];

const Chip: React.FC<{ label: string; selected: boolean; onClick: () => void }> = ({ label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-sm transition-colors whitespace-nowrap ${
      selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
    }`}
  >
    {label}
  </button>
);

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
  const [conditionNote, setConditionNote] = useState('');
  const [description, setDescription] = useState('');
  const [defectDescription, setDefectDescription] = useState('');
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

  // Default school from profile
  useEffect(() => {
    if (profile?.school && !school) setSchool(profile.school);
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
    if (type === 'book' && !condition) { toast({ title: '请选择成色', variant: 'destructive' }); return; }
    if (type === 'other' && !condition) {
      // For "other" type, default to "used"
    }

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
      condition_note: conditionNote.trim() || null,
      description: description.trim() || null,
      defect_description: defectDescription.trim() || null,
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

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-lg font-semibold text-foreground mb-4">发布物品</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type */}
        <div className="space-y-2">
          <Label>类型</Label>
          <div className="flex gap-2">
            <Chip label="书籍" selected={type === 'book'} onClick={() => setType('book')} />
            <Chip label="其他" selected={type === 'other'} onClick={() => setType('other')} />
          </div>
        </div>

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

        {/* Name */}
        <div className="space-y-2">
          <Label>{type === 'book' ? '书名' : '物品名称'} *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={type === 'book' ? '请输入书名' : '请输入物品名称'} />
        </div>

        {/* Book-specific fields */}
        {type === 'book' && (
          <>
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

            {/* Book tag */}
            <div className="space-y-2">
              <Label>科目分类</Label>
              <div className="flex flex-wrap gap-2">
                {BOOK_TAGS.map(tag => (
                  <Chip key={tag} label={tag} selected={bookTag === tag} onClick={() => setBookTag(bookTag === tag ? '' : tag)} />
                ))}
              </div>
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
          </>
        )}

        {/* Grade & Semester */}
        <div className="space-y-2">
          <Label>年级与学期</Label>
          <GradeSemesterSelector
            grade={grade}
            semester={semester}
            onChange={(g, s) => { setGrade(g); setSemester(s); }}
          />
        </div>

        {/* School */}
        <div className="space-y-2">
          <Label>适用学校</Label>
          <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="适用的学校名称（选填）" />
        </div>

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

        {/* Condition note */}
        <div className="space-y-2">
          <Label>成色说明</Label>
          <Textarea
            value={conditionNote}
            onChange={(e) => setConditionNote(e.target.value)}
            placeholder="补充描述成色细节（选填）"
            rows={2}
          />
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

        {/* Defect description */}
        <div className="space-y-2">
          <Label>瑕疵说明</Label>
          <Textarea
            value={defectDescription}
            onChange={(e) => setDefectDescription(e.target.value)}
            placeholder="如有瑕疵请如实描述（选填）"
            rows={2}
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          发布
        </Button>
      </form>
    </div>
  );
};

export default PublishPage;
