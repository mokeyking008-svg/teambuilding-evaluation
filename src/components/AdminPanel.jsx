import { useState } from 'react';
import PlanForm from './PlanForm';
import {
  Lock, Settings, Plus, X, Pencil, Trash2,
  Inbox, AlertTriangle, Check, CheckCircle,
} from 'lucide-react';

const ADMIN_PASSWORD = 'admin2025';

export default function AdminPanel({ plans, onSavePlans, onExit }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [editingPlan, setEditingPlan] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setPwdError('');
    } else {
      setPwdError('密码错误，请重试');
    }
  };

  const handleAdd = (planData) => {
    const updated = [...plans, planData];
    onSavePlans(updated);
    setEditingPlan(null);
    showToast('方案添加成功！');
  };

  const handleEdit = (planData) => {
    const updated = plans.map(p => p.id === planData.id ? planData : p);
    onSavePlans(updated);
    setEditingPlan(null);
    showToast('方案修改成功！');
  };

  const handleDelete = (planId) => {
    const updated = plans.filter(p => p.id !== planId);
    const ratings = JSON.parse(localStorage.getItem('tb_ratings') || '{}');
    const reviews = JSON.parse(localStorage.getItem('tb_reviews') || '{}');
    const votes = JSON.parse(localStorage.getItem('tb_votes') || '{}');
    delete ratings[planId];
    delete reviews[planId];
    const filteredVotes = {};
    Object.entries(votes).forEach(([uid, pid]) => {
      if (pid !== planId) filteredVotes[uid] = pid;
    });
    localStorage.setItem('tb_ratings', JSON.stringify(ratings));
    localStorage.setItem('tb_reviews', JSON.stringify(reviews));
    localStorage.setItem('tb_votes', JSON.stringify(filteredVotes));

    onSavePlans(updated);
    setDeleteConfirm(null);
    showToast('方案已删除');
  };

  // 密码验证界面
  if (!authenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay bg-black/60">
        <div className="glass-solid rounded-2xl shadow-2xl w-[90vw] max-w-sm p-6 mx-4" onClick={e => e.stopPropagation()}>
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 glass rounded-full mb-3">
              <Lock className="w-6 h-6 text-accent" />
            </div>
            <h2 className="text-xl font-bold text-white">管理员验证</h2>
            <p className="text-sm text-white/50 mt-1">请输入管理员密码</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setPwdError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="输入密码..."
            className={`input-glass w-full px-4 py-3 rounded-xl text-sm text-center tracking-widest ${pwdError ? 'border-red-500/50' : ''}`}
            autoFocus
          />
          {pwdError && <p className="text-xs text-red-400 mt-2 text-center">{pwdError}</p>}
          <div className="flex gap-3 mt-4">
            <button
              onClick={onExit}
              className="flex-1 py-3 glass text-white/70 font-medium rounded-xl hover:bg-white/10 transition"
            >
              返回
            </button>
            <button
              onClick={handleLogin}
              className="flex-1 py-3 btn-glass text-white font-bold rounded-xl shadow-lg"
            >
              验证
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 表单模式
  if (editingPlan === 'new' || (editingPlan && typeof editingPlan === 'object')) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 modal-overlay">
        <div className="min-h-full flex items-start justify-center py-8 px-4" onClick={onExit}>
          <div className="glass-solid rounded-2xl shadow-2xl w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {editingPlan === 'new' ? (
                  <><Plus className="w-5 h-5 text-accent" /> 新增方案</>
                ) : (
                  <><Pencil className="w-5 h-5 text-accent" /> 编辑方案</>
                )}
              </h2>
              <button
                onClick={() => setEditingPlan(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition text-white/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <PlanForm
                plan={editingPlan === 'new' ? null : editingPlan}
                onSave={editingPlan === 'new' ? handleAdd : handleEdit}
                onCancel={() => setEditingPlan(null)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 管理列表
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 modal-overlay" onClick={onExit}>
      <div className="min-h-full flex items-start justify-center py-8 px-4" onClick={e => e.stopPropagation()}>
        <div className="glass-solid rounded-2xl shadow-2xl w-full max-w-2xl relative">
          {/* Toast */}
          {toast && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-success text-white px-6 py-3 rounded-full shadow-lg font-medium text-sm flex items-center gap-2">
              <Check className="w-4 h-4" /> {toast}
            </div>
          )}

          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-accent" /> 方案管理
              </h2>
              <p className="text-sm text-white/50 mt-0.5">共 {plans.length} 个方案</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingPlan('new')}
                className="flex items-center gap-1.5 px-4 py-2 btn-glass text-white text-sm font-bold rounded-xl shadow-lg"
              >
                <Plus className="w-4 h-4" />
                新增
              </button>
              <button
                onClick={onExit}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition text-white/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 方案列表 */}
          <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {plans.map(plan => (
              <div
                key={plan.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition group"
              >
                <img src={plan.cover} alt={plan.name} className="w-16 h-12 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white/80 text-sm truncate">{plan.name}</p>
                  <div className="flex items-center gap-2 text-xs text-white/35 mt-0.5">
                    <span>{plan.location}</span>
                    <span>·</span>
                    <span>¥{plan.budgetNum}/人</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition admin-actions">
                  <button
                    onClick={() => setEditingPlan(plan)}
                    className="p-2 text-white/40 hover:text-primary hover:bg-primary/10 rounded-lg transition"
                    title="编辑"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(plan.id)}
                    className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {plans.length === 0 && (
              <div className="text-center py-12">
                <Inbox className="w-12 h-12 text-white/20 mx-auto" />
                <p className="text-white/30 mt-2">暂无方案，点击上方按钮新增</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 删除确认框 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70" onClick={() => setDeleteConfirm(null)}>
          <div className="glass-solid rounded-2xl shadow-2xl w-[90vw] max-w-sm p-6 mx-4" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-red-500/10 rounded-full mb-3">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">确认删除？</h3>
              <p className="text-sm text-white/50 mt-1">删除后该方案的评分、点评和投票数据将一并清除，此操作不可恢复。</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 glass text-white/70 font-medium rounded-xl hover:bg-white/10 transition"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> 确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
