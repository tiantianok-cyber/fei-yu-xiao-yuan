import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    AMap: any;
  }
}

interface AMapLocationPickerProps {
  /** 'community' extracts 住宅区/小区, 'school' extracts 学校 */
  type: 'community' | 'school';
  onConfirm: (name: string) => void;
}

const POI_TYPE_COMMUNITY = '120000'; // 商务住宅
const POI_TYPE_SCHOOL = '141200|141201|141202|141203'; // 学校相关

const AMapLocationPicker: React.FC<AMapLocationPickerProps> = ({ type, onConfirm }) => {
  const [open, setOpen] = useState(false);
  const [resolvedName, setResolvedName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const placeSearchRef = useRef<any>(null);

  const searchNearbyPOI = useCallback((lnglat: [number, number]) => {
    setLoading(true);
    setError('');
    setResolvedName('');

    const AMap = window.AMap;
    if (!AMap) {
      setError('地图加载失败');
      setLoading(false);
      return;
    }

    // Use PlaceSearch to find nearby POIs
    const poiType = type === 'community' ? POI_TYPE_COMMUNITY : POI_TYPE_SCHOOL;
    const label = type === 'community' ? '小区' : '学校';

    if (!placeSearchRef.current) {
      placeSearchRef.current = new AMap.PlaceSearch({
        type: poiType,
        pageSize: 5,
        pageIndex: 1,
      });
    } else {
      placeSearchRef.current.setType(poiType);
    }

    placeSearchRef.current.searchNearBy('', lnglat, 1000, (status: string, result: any) => {
      setLoading(false);
      if (status === 'complete' && result.poiList && result.poiList.pois.length > 0) {
        const poi = result.poiList.pois[0];
        setResolvedName(poi.name);
      } else {
        // Fallback: use geocoder
        if (!geocoderRef.current) {
          geocoderRef.current = new AMap.Geocoder({ radius: 500 });
        }
        geocoderRef.current.getAddress(lnglat, (geoStatus: string, geoResult: any) => {
          if (geoStatus === 'complete' && geoResult.regeocode) {
            const info = geoResult.regeocode.addressComponent;
            const neighborhood = info.neighborhood;
            if (neighborhood && typeof neighborhood === 'string' && neighborhood.length > 0) {
              setResolvedName(neighborhood);
            } else {
              setError(`未识别到${label}名称`);
            }
          } else {
            setError(`未识别到${label}名称`);
          }
        });
      }
    });
  }, [type]);

  const initMap = useCallback(() => {
    const AMap = window.AMap;
    if (!AMap || !mapContainerRef.current) return;

    setLoading(true);
    setError('');
    setResolvedName('');

    const map = new AMap.Map(mapContainerRef.current, {
      zoom: 16,
      resizeEnable: true,
    });
    mapRef.current = map;

    const marker = new AMap.Marker({
      draggable: true,
      cursor: 'move',
      anchor: 'bottom-center',
    });
    markerRef.current = marker;

    // On marker drag end, re-search nearby POI
    marker.on('dragend', () => {
      const pos = marker.getPosition();
      if (pos) {
        const lnglat: [number, number] = [pos.getLng(), pos.getLat()];
        searchNearbyPOI(lnglat);
      }
    });

    // On map click, move marker and re-search
    map.on('click', (e: any) => {
      const { lng, lat } = e.lnglat;
      marker.setPosition([lng, lat]);
      searchNearbyPOI([lng, lat]);
    });

    // Load PlaceSearch plugin
    AMap.plugin(['AMap.PlaceSearch', 'AMap.Geolocation', 'AMap.Geocoder'], () => {
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        buttonPosition: 'RB',
        showButton: true,
        showMarker: false,
        showCircle: false,
      });
      map.addControl(geolocation);

      geolocation.getCurrentPosition((status: string, result: any) => {
        if (status === 'complete' && result.position) {
          const lnglat: [number, number] = [result.position.lng, result.position.lat];
          map.setCenter(lnglat);
          marker.setPosition(lnglat);
          map.add(marker);
          searchNearbyPOI(lnglat);
        } else {
          setLoading(false);
          setError('定位失败，请手动拖动标记选择位置');
          // Default to a central location
          const defaultPos: [number, number] = [116.397428, 39.90923];
          map.setCenter(defaultPos);
          marker.setPosition(defaultPos);
          map.add(marker);
        }
      });
    });
  }, [searchNearbyPOI]);

  useEffect(() => {
    if (open) {
      // Small delay to allow dialog to render
      const timer = setTimeout(initMap, 200);
      return () => {
        clearTimeout(timer);
        if (mapRef.current) {
          mapRef.current.destroy();
          mapRef.current = null;
        }
        placeSearchRef.current = null;
        geocoderRef.current = null;
      };
    }
  }, [open, initMap]);

  const handleConfirm = () => {
    if (resolvedName) {
      onConfirm(resolvedName);
    }
    setOpen(false);
  };

  const label = type === 'community' ? '小区' : '学校';

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1 text-xs"
        onClick={() => setOpen(true)}
      >
        <MapPin className="h-3.5 w-3.5" />
        定位
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-sm">选择{label}位置</DialogTitle>
          </DialogHeader>

          {/* Map container */}
          <div ref={mapContainerRef} className="w-full h-[300px] sm:h-[350px]" />

          {/* Result area */}
          <div className="px-4 py-3 border-t border-border space-y-3">
            <div className="min-h-[24px] flex items-center gap-2">
              {loading && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  正在识别{label}...
                </span>
              )}
              {!loading && resolvedName && (
                <span className="text-sm font-medium text-foreground">
                  📍 {resolvedName}
                </span>
              )}
              {!loading && error && (
                <span className="text-sm text-destructive">{error}</span>
              )}
              {!loading && !resolvedName && !error && (
                <span className="text-sm text-muted-foreground">拖动标记选择位置</span>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleConfirm}
                disabled={!resolvedName || loading}
              >
                确认选择
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AMapLocationPicker;
