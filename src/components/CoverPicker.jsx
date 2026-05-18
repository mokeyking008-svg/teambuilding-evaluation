import { useState, useRef } from 'react';
import { ImageIcon, Link, X, Check } from 'lucide-react';

// 预设封面图库
export const presetCovers = [
  { url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop', label: '山脉' },
  { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop', label: '海滩' },
  { url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=400&fit=crop', label: '田野' },
  { url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=400&fit=crop', label: '电竞' },
  { url: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=600&h=400&fit=crop', label: '运动' },
  { url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=400&fit=crop', label: '文艺' },
  { url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop', label: '跑步' },
  { url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&h=400&fit=crop', label: '划船' },
  { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop', label: '日落山' },
  { url: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=600&h=400&fit=crop', label: '露营' },
  { url: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=600&h=400&fit=crop', label: '派对' },
  { url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop', label: '体育场' },
];

export default function CoverPicker({ value, onChange }) {
  const [mode, setMode] = useState(value && !presetCovers.find(p => p.url === value) ? 'url' : 'preset');
  const [urlInput, setUrlInput] = useState(value || '');
  const [preview, setPreview] = useState(value || '');
  const fileRef = useRef(null);

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setPreview(urlInput.trim());
    }
  };

  const handlePresetSelect = (url) => {
    onChange(url);
    setPreview(url);
  };

  return (
    <div className="space-y-3">
      {/* 模式切换 */}
      <div className="flex gap-1 bg-[#F5F5F5] rounded-lg p-1">
        <button
          type="button"
          onClick={() => setMode('preset')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition flex items-center justify-center gap-1 ${
            mode === 'preset' ? 'bg-white text-text-primary shadow-sm' : 'text-text-light'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" /> 预设图库
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition flex items-center justify-center gap-1 ${
            mode === 'url' ? 'bg-white text-text-primary shadow-sm' : 'text-text-light'
          }`}
        >
          <Link className="w-3.5 h-3.5" /> 输入链接
        </button>
      </div>

      {/* URL 输入 */}
      {mode === 'url' && (
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="粘贴图片 URL..."
              className="input-clean flex-1 px-3 py-2 rounded-lg text-sm"
              onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              className="px-3 py-2 btn-primary text-sm font-medium rounded-lg"
            >
              确认
            </button>
          </div>
          <p className="text-xs text-text-light mt-1">支持 jpg/png/webp 格式的图片链接</p>
        </div>
      )}

      {/* 预设图库 */}
      {mode === 'preset' && (
        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
          {presetCovers.map((img) => (
            <button
              key={img.url}
              type="button"
              onClick={() => handlePresetSelect(img.url)}
              className={`relative rounded-lg overflow-hidden aspect-[3/2] border-2 transition hover:scale-[1.03] ${
                preview === img.url ? 'border-primary shadow-md' : 'border-transparent hover:border-[#E5E5E5]'
              }`}
            >
              <img src={img.url} alt={img.label} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end">
                <span className="text-white text-[10px] px-1 pb-0.5 truncate w-full text-center">{img.label}</span>
              </div>
              {preview === img.url && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 预览 */}
      {preview && (
        <div className="relative rounded-lg overflow-hidden border border-[#F0F0F0]">
          <img src={preview} alt="封面预览" className="w-full h-28 object-cover" />
          <button
            type="button"
            onClick={() => { onChange(''); setPreview(''); setUrlInput(''); }}
            className="absolute top-2 right-2 w-6 h-6 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
