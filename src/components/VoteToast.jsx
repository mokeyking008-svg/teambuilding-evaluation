import { useState, useEffect } from 'react';
import { CheckCircle, RefreshCw, Users } from 'lucide-react';

let globalToast = null;

export function showToast(planName, totalVoteCount) {
  if (globalToast) {
    globalToast({ planName, totalVoteCount });
  }
}

export default function VoteToast() {
  const [toast, setToast] = useState(null);

  // 注册全局回调
  useEffect(() => {
    globalToast = ({ planName, totalVoteCount }) => {
      setToast({ planName, totalVoteCount, show: true });
    };
    return () => { globalToast = null; };
  }, []);

  // 自动消失
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(prev => prev ? { ...prev, show: false } : null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // 完全移除
  useEffect(() => {
    if (toast && !toast.show) {
      const timer = setTimeout(() => setToast(null), 400);
      return () => clearTimeout(timer);
    }
  }, [toast?.show]);

  if (!toast) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center transition-all"
      style={{ transitionDuration: '400ms' }}
    >
      {/* 半透明背景 */}
      {toast.show && <div className="absolute inset-0 bg-black/20" />}
      {/* Toast 内容 */}
      <div
        className={`relative transition-all ${toast.show ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
        style={{ transitionDuration: '400ms' }}
      >
      <div className="glass-solid rounded-2xl px-5 py-4 shadow-2xl min-w-[280px] max-w-[360px] border border-success/20">
        {/* 主标题 */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-4 h-4 text-success" />
          </div>
          <span className="text-sm font-bold text-text-primary">
            已为「{toast.planName}」投票 <span className="text-success">&#10003;</span>
          </span>
        </div>

        {/* 副提示 */}
        <div className="flex items-center gap-1.5 ml-9 text-xs text-text-light">
          <RefreshCw className="w-3 h-3" />
          <span>你还可以修改投票</span>
        </div>

        {/* 实时人数 */}
        <div className="mt-2.5 ml-9 flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-primary/8 rounded-full px-2.5 py-1">
            <Users className="w-3 h-3 text-primary" />
            <span className="text-xs font-bold text-primary">已投票 {toast.totalVoteCount} 人</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
