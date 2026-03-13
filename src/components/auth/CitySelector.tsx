import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AreaItem {
  area: string;
  code: string;
}

interface CityItem {
  city: string;
  code: string;
  areas: AreaItem[];
}

interface ProvinceItem {
  province: string;
  code: string;
  citys: CityItem[];
}

type CityData = ProvinceItem[];

interface CitySelectorProps {
  province: string;
  city: string;
  district: string;
  onChange: (province: string, city: string, district: string) => void;
  showLocatePrompt?: boolean;
}

let cachedData: CityData | null = null;

export const CitySelector: React.FC<CitySelectorProps> = ({ province, city, district, onChange, showLocatePrompt }) => {
  const [data, setData] = useState<CityData | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);
  const [locating, setLocating] = useState(false);

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

  const provinces = useMemo(() => (data ? data.map(p => p.province) : []), [data]);
  const cities = useMemo(() => {
    if (!data || !province) return [];
    const prov = data.find(p => p.province === province);
    return prov ? prov.citys.map(c => c.city) : [];
  }, [data, province]);
  const districts = useMemo(() => {
    if (!data || !province || !city) return [];
    const prov = data.find(p => p.province === province);
    const cit = prov?.citys.find(c => c.city === city);
    return cit ? cit.areas.map(a => a.area) : [];
  }, [data, province, city]);

  const handleLocate = useCallback(() => {
    const AMap = (window as any).AMap;
    if (!AMap) {
      toast.error('地图服务未加载');
      return;
    }
    setLocating(true);

    AMap.plugin('AMap.Geolocation', () => {
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      geolocation.getCurrentPosition((status: string, result: any) => {
        if (status !== 'complete' || !result.position) {
          setLocating(false);
          toast.error('定位失败，请手动选择城市');
          return;
        }

        const lnglat = [result.position.lng, result.position.lat];
        const geocoder = new AMap.Geocoder({ radius: 500 });
        geocoder.getAddress(lnglat, (geoStatus: string, geoResult: any) => {
          setLocating(false);
          if (geoStatus !== 'complete' || !geoResult.regeocode) {
            toast.error('无法解析当前位置');
            return;
          }

          const comp = geoResult.regeocode.addressComponent;
          const resolvedProvince = comp.province || '';
          const resolvedCity = comp.city || comp.province || '';
          const resolvedDistrict = comp.district || '';

          if (!data) {
            toast.error('城市数据未加载');
            return;
          }

          // Match against ChinaCitys.json data
          const matchedProv = data.find(p => resolvedProvince.includes(p.province) || p.province.includes(resolvedProvince));
          if (!matchedProv) {
            toast.error(`未匹配到省份: ${resolvedProvince}`);
            return;
          }

          const matchedCity = matchedProv.citys.find(c => resolvedCity.includes(c.city) || c.city.includes(resolvedCity));
          const finalCity = matchedCity?.city || '';

          let finalDistrict = '';
          if (matchedCity) {
            const matchedArea = matchedCity.areas.find(a => resolvedDistrict.includes(a.area) || a.area.includes(resolvedDistrict));
            finalDistrict = matchedArea?.area || '';
          }

          onChange(matchedProv.province, finalCity, finalDistrict);
          toast.success('定位成功');
        });
      });
    });
  }, [data, onChange]);

  if (loading) return <div className="text-sm text-muted-foreground py-2">加载行政区划数据...</div>;

  return (
    <div className="space-y-2">
      {showLocatePrompt && !province && (
        <div className="flex flex-col items-center gap-2 py-3 border border-dashed border-border rounded-lg mb-2">
          <p className="text-sm text-muted-foreground">未设置城市，点击下方按钮自动定位</p>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-1.5"
            onClick={handleLocate}
            disabled={locating}
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            自动定位当前城市
          </Button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="grid grid-cols-3 gap-2 flex-1">
          <Select
            value={province || undefined}
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
            value={city || undefined}
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
            value={district || undefined}
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1 text-xs"
          onClick={handleLocate}
          disabled={locating}
        >
          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
          定位
        </Button>
      </div>
    </div>
  );
};
