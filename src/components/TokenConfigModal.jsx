import { useState } from 'react';
import { Key, X, Check, AlertCircle, Trash2 } from 'lucide-react';
import { getToken, setToken as setSyncToken, hasToken, pushRemoteData, fetchRemoteData, readLocalCache, getLocalVersion, createEmptyStore, mergeLocalToStore } from '../services/githubSync';
import defaultPlans from '../data/plans';

export default function TokenConfigModal({ onClose }) {
  const [token, setToken] = useState(getToken() || '');
  const [status, setStatus] = useState('idle'); // idle | testing | success | error
  const [msg, setMsg] = useState('');
  const [showClear, setShowClear] = useState(false);

  const handleSave = () => {
    if (!token.trim()) {
      setStatus('error');
      setMsg('请输入 Token');
      return;
    }

    setSyncToken(token.trim());
    setStatus('success');
    setMsg('Token 已保存');
    // 2秒后自动关闭
    setTimeout(() => onClose(), 1500);
  };

  const handleTest = async () => {
    if (!token.trim()) {
      setStatus('error');
      setMsg('请输入 Token');
      return;
    }

    setStatus('testing');
    setMsg('正在测试连接...');

    try {
      // 先临时设置 token
      setSyncToken(token.trim());

      // 尝试读取远程数据
      const result = await fetchRemoteData();

      if (result) {
        setStatus('success');
        setMsg(`连接成功！远程数据版本: v${result.store.version || 1}，${result.store.plans?.length || 0} 个方案`);
      } else {
        // 远程无文件，尝试创建初始数据
        const store = createEmptyStore(defaultPlans);
        const cached = readLocalCache();
        const merged = cached ? mergeLocalToStore(store) : store;
        const pushResult = await pushRemoteData(merged, null);

        if (pushResult.success) {
          setStatus('success');
          setMsg('远程文件不存在，已自动创建初始数据！');
        } else {
          setStatus('error');
          setMsg(`连接失败: ${pushResult.error}`);
        }
      }
    } catch (e) {
      setStatus('error');
      setMsg(`测试失败: ${e.message}`);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('tb_gh_token');
    setToken('');
    setStatus('idle');
    setMsg('');
    setShowClear(false);
  };

  const statusColor = {
    idle: '',
    testing: 'text-primary',
    success: 'text-primary',
    error: 'text-red-500',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
      <div className="bg-white rounded-xl shadow-lg w-[90vw] max-w-md p-6 mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#F5F5F5] rounded-full flex items-center justify-center">
              <Key className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">GitHub 同步配置</h2>
              <p className="text-xs text-text-secondary">配置 Token 后实现多设备数据同步</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition text-text-light"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Personal Access Token</label>
            <input
              type="password"
              value={token}
              onChange={e => { setToken(e.target.value); setStatus('idle'); setMsg(''); }}
              placeholder="ghp_xxxxxxxxxxxx"
              className="input-clean w-full px-3 py-2.5 rounded-lg text-sm font-mono"
              autoFocus
            />
            <p className="text-[11px] text-text-light mt-1.5">
              需要 repo 权限。在 GitHub Settings → Developer settings → Personal access tokens 创建
            </p>
          </div>

          {/* 状态消息 */}
          {msg && (
            <div className={`flex items-start gap-2 text-sm ${statusColor[status] || ''}`}>
              {status === 'success' ? (
                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : status === 'error' ? (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : null}
              <span>{msg}</span>
            </div>
          )}

          {/* 按钮 */}
          <div className="flex gap-2">
            {hasToken() && !showClear ? (
              <button
                onClick={() => setShowClear(true)}
                className="px-4 py-2.5 btn-secondary text-sm font-medium rounded-lg flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> 清除
              </button>
            ) : showClear ? (
              <button
                onClick={handleClear}
                className="px-4 py-2.5 bg-red-50 text-red-500 text-sm font-medium rounded-lg hover:bg-red-100 transition"
              >
                确认清除？
              </button>
            ) : null}
            <button
              onClick={handleTest}
              disabled={status === 'testing'}
              className="flex-1 py-2.5 bg-[#F5F5F5] text-text-primary text-sm font-medium rounded-lg hover:bg-[#EDEDED] transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {status === 'testing' ? (
                <>测试中...</>
              ) : (
                <>测试连接</>
              )}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 btn-primary text-sm font-bold rounded-lg flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> 保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
