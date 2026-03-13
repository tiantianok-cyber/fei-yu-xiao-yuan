import React, { useState, useEffect, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CityData {
  [province: string]: {
    [city: string]: string[];
  };
}

interface CitySelectorProps {
  province: string;
  city: string;
  district: string;
  onChange: (province: string, city: string, district: string) => void;
}

let cachedData: CityData | null = null;

export const CitySelector: React.FC<CitySelectorProps> = ({ province, city, district, onChange }) => {
  const [data, setData] = useState<CityData | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);

  useEffect(() => {
    if (cachedData) return;
    fetch('/data/ChinaCitys.json')
      .then(r => r.json())
      .then((d: CityData) => {
        cachedData = d;
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const provinces = useMemo(() => (data ? Object.keys(data) : []), [data]);
  const cities = useMemo(() => (data && province ? Object.keys(data[province] || {}) : []), [data, province]);
  const districts = useMemo(() => (data && province && city ? (data[province]?.[city] || []) : []), [data, province, city]);

  if (loading) return <div className="text-sm text-muted-foreground py-2">加载行政区划数据...</div>;

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select
        value={province}
        onValueChange={(v) => onChange(v, '', '')}
      >
        <SelectTrigger>
          <SelectValue placeholder="省/直辖市" />
        </SelectTrigger>
        <SelectContent className="max-h-[240px]">
          {provinces.map((p) => (
            <SelectItem key={p} value={p}>{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={city}
        onValueChange={(v) => onChange(province, v, '')}
        disabled={!province}
      >
        <SelectTrigger>
          <SelectValue placeholder="市" />
        </SelectTrigger>
        <SelectContent className="max-h-[240px]">
          {cities.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={district}
        onValueChange={(v) => onChange(province, city, v)}
        disabled={!city}
      >
        <SelectTrigger>
          <SelectValue placeholder="区/县" />
        </SelectTrigger>
        <SelectContent className="max-h-[240px]">
          {districts.map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
