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
    showToast('添加成功');
  };

  const handleEdit = (planData) => {
    const updated = plans.map(p => p.id === planData.id ? planData : p);
    onSavePlans(updated);
    setEditingPlan(null);
    showToast('修改成功');
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
      <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
        <div className="bg-white rounded-xl shadow-lg w-[90vw] max-w-sm p-6 mx-4" onClick={e => e.stopPropagation()}>
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-[#F5F5F5] rounded-full mb-3">
              <Lock className="w-5 h-5 text-text-secondary" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">管理员验证</h2>
            <p className="text-sm text-text-secondary mt-1">输入密码</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setPwdError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="输入密码..."
            className={`input-clean w-full px-4 py-3 rounded-lg text-sm text-center tracking-widest ${pwdError ? 'border-red-400/50' : ''}`}
            autoFocus
          />
          {pwdError && <p className="text-xs text-red-500 mt-2 text-center">{pwdError}</p>}
          <div className="flex gap-3 mt-4">
            <button
              onClick={onExit}
              className="flex-1 py-3 btn-secondary text-sm font-medium rounded-lg"
            >
              返回
            </button>
            <button
              onClick={handleLogin}
              className="flex-1 py-3 btn-primary text-sm font-bold rounded-lg"
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
      <div className="fixed inset-0 z-50 overflow-y-auto modal-overlay">
        <div className="min-h-full flex items-start justify-center py-6 px-4" onClick={onExit}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-[#F0F0F0] flex items-center justify-between">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-1.5">
                {editingPlan === 'new' ? (
                  <><Plus className="w-4 h-4 text-primary" /> 新增方案</>
                ) : (
                  <><Pencil className="w-4 h-4 text-primary" /> 编辑方案</>
                )}
              </h2>
              <button
                onClick={() => setEditingPlan(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition text-text-light"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
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
    <div className="fixed inset-0 z-50 overflow-y-auto modal-overlay" onClick={onExit}>
      <div className="min-h-full flex items-start justify-center py-6 px-4" onClick={e => e.stopPropagation()}>
        <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl relative">
          {/* Toast */}
          {toast && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-primary text-white px-6 py-3 rounded-full shadow-lg font-medium text-sm flex items-center gap-2">
              <Check className="w-4 h-4" /> {toast}
            </div>
          )}

          {/* Header */}
          <div className="p-5 border-b border-[#F0F0F0] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-text-primary flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-primary" /> 方案管理
              </h2>
              <p className="text-sm text-text-secondary mt-0.5">{plans.length} 个方案</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingPlan('new')}
                className="flex items-center gap-1 px-4 py-2 btn-primary text-sm font-bold rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                新增
              </button>
              <button
                onClick={onExit}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition text-text-light"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 方案列表 */}
          <div className="p-4 space-y-1 max-h-[60vh] overflow-y-auto">
            {plans.map(plan => (
              <div
                key={plan.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#FAFAFA] transition group"
              >
                <img src={plan.cover} alt={plan.name} className="w-14 h-10 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary text-sm truncate">{plan.name}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-text-light mt-0.5">
                    <span>{plan.location}</span>
                    <span>·</span>
                    <span>¥{plan.budgetNum}/人</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition admin-actions">
                  <button
                    onClick={() => setEditingPlan(plan)}
                    className="p-1.5 text-text-light hover:text-primary hover:bg-[#E8FFF0] rounded-md transition"
                    title="编辑"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(plan.id)}
                    className="p-1.5 text-text-light hover:text-red-500 hover:bg-red-50 rounded-md transition"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {plans.length === 0 && (
              <div className="text-center py-12">
                <Inbox className="w-10 h-10 text-text-light mx-auto" />
                <p className="text-text-light mt-2 text-sm">暂无方案</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 删除确认框 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-lg w-[90vw] max-w-sm p-6 mx-4" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-50 rounded-full mb-3">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-text-primary">确认删除？</h3>
              <p className="text-sm text-text-secondary mt-1">删除后相关数据将一并清除</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 btn-secondary text-sm font-medium rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-1.5 text-sm"
              >
                <Trash2 className="w-3.5 h-3.5" /> 确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
