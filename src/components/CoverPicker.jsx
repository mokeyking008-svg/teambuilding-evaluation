import { useState, useRef } from 'react';

// 预设封面图库
export const presetCovers = [
  { url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop', label: '🏔️ 山脉' },
  { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop', label: '🏖️ 海滩' },
  { url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=400&fit=crop', label: '🌿 田野' },
  { url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=400&fit=crop', label: '🎮 电竞' },
  { url: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=600&h=400&fit=crop', label: '🏃 运动' },
  { url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=400&fit=crop', label: '🎨 文艺' },
  { url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop', label: '🏃‍♂️ 跑步' },
  { url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&h=400&fit=crop', label: '🚣 划船' },
  { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop', label: '🌄 日落山' },
  { url: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=600&h=400&fit=crop', label: '🏕️ 露营' },
  { url: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=600&h=400&fit=crop', label: '🎉 派对' },
  { url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop', label: '🏟️ 体育场' },
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
      <div className="flex gap-1 glass rounded-lg p-1">
        <button
          type="button"
          onClick={() => setMode('preset')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
            mode === 'preset' ? 'glass-solid text-white shadow-sm' : 'text-white/50'
          }`}
        >
          🖼️ 预设图库
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
            mode === 'url' ? 'glass-solid text-white shadow-sm' : 'text-white/50'
          }`}
        >
          🔗 输入链接
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
              className="input-glass flex-1 px-3 py-2 rounded-lg text-sm"
              onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              className="px-3 py-2 btn-glass text-white text-sm font-medium rounded-lg"
            >
              确认
            </button>
          </div>
          <p className="text-xs text-white/30 mt-1">支持 jpg/png/webp 格式的图片链接</p>
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
              className={`relative rounded-lg overflow-hidden aspect-[3/2] border-2 transition hover:scale-105 ${
                preview === img.url ? 'border-primary shadow-lg' : 'border-transparent hover:border-white/20'
              }`}
            >
              <img src={img.url} alt={img.label} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                <span className="text-white text-[10px] px-1 pb-0.5 truncate w-full text-center">{img.label}</span>
              </div>
              {preview === img.url && (
                <div className="absolute top-1 right-1 w-5 h-5 btn-glass rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 预览 */}
      {preview && (
        <div className="relative rounded-xl overflow-hidden border border-white/10">
          <img src={preview} alt="封面预览" className="w-full h-32 object-cover" />
          <button
            type="button"
            onClick={() => { onChange(''); setPreview(''); setUrlInput(''); }}
            className="absolute top-2 right-2 w-6 h-6 glass-solid rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
