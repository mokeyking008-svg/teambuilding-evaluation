import { useState, useEffect } from 'react';
import CoverPicker from './CoverPicker';
import { Save, Plus, ImageIcon, Link, X, Check } from 'lucide-react';

const emptyForm = {
  name: '',
  cover: '',
  location: '',
  duration: '全天',
  budget: '0-200',
  budgetNum: 150,
  summary: '',
  details: '',
  tags: '',
};

const durationOptions = ['0.5天', '全天', '2天'];
const budgetOptions = [
  { value: '0-200', label: '¥0～200' },
  { value: '200-300', label: '¥200～300' },
  { value: '300+', label: '¥300+' },
];

export default function PlanForm({ plan, onSave, onCancel }) {
  const [form, setForm] = useState(plan ? {
    ...plan,
    tags: Array.isArray(plan.tags) ? plan.tags.join('、') : (plan.tags || ''),
  } : { ...emptyForm });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (plan) {
      setForm({
        ...plan,
        tags: Array.isArray(plan.tags) ? plan.tags.join('、') : (plan.tags || ''),
      });
    }
  }, [plan]);

  const updateField = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = '请输入方案名称';
    if (!form.cover.trim()) e.cover = '请选择封面图';
    if (!form.location.trim()) e.location = '请输入地点';
    if (!form.summary.trim()) e.summary = '请输入简介';
    if (form.budgetNum <= 0) e.budgetNum = '预算必须大于 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const parsed = {
      ...form,
      tags: form.tags.split(/[、,，]/).map(t => t.trim()).filter(Boolean),
      budgetNum: Number(form.budgetNum),
    };

    if (plan) {
      parsed.id = plan.id;
    } else {
      const existing = JSON.parse(localStorage.getItem('tb_plans') || '[]');
      parsed.id = existing.length > 0 ? Math.max(...existing.map(p => p.id)) + 1 : 1;
    }

    onSave(parsed);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 方案名称 */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">方案名称 *</label>
        <input
          type="text"
          value={form.name}
          onChange={e => updateField('name', e.target.value)}
          placeholder="如：莫干山两日游"
          className={`input-glass w-full px-4 py-2.5 rounded-xl text-sm ${errors.name ? 'border-red-400/50' : ''}`}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>

      {/* 封面图 */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">封面图 *</label>
        <CoverPicker
          value={form.cover}
          onChange={url => updateField('cover', url)}
        />
        {errors.cover && <p className="text-xs text-red-500 mt-1">{errors.cover}</p>}
      </div>

      {/* 地点 */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">地点 *</label>
        <input
          type="text"
          value={form.location}
          onChange={e => updateField('location', e.target.value)}
          placeholder="如：浙江·莫干山"
          className={`input-glass w-full px-4 py-2.5 rounded-xl text-sm ${errors.location ? 'border-red-400/50' : ''}`}
        />
        {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
      </div>

      {/* 时长 + 预算 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">时长</label>
          <select
            value={form.duration}
            onChange={e => updateField('duration', e.target.value)}
            className="input-glass w-full px-4 py-2.5 rounded-xl text-sm"
          >
            {durationOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">预算区间</label>
          <select
            value={form.budget}
            onChange={e => updateField('budget', e.target.value)}
            className="input-glass w-full px-4 py-2.5 rounded-xl text-sm"
          >
            {budgetOptions.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
      </div>

      {/* 人均预算 */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">人均预算（元）</label>
        <input
          type="number"
          min="1"
          value={form.budgetNum}
          onChange={e => updateField('budgetNum', e.target.value)}
          className={`input-glass w-full px-4 py-2.5 rounded-xl text-sm ${errors.budgetNum ? 'border-red-400/50' : ''}`}
        />
        {errors.budgetNum && <p className="text-xs text-red-500 mt-1">{errors.budgetNum}</p>}
      </div>

      {/* 方案简介 */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">简介 *</label>
        <textarea
          value={form.summary}
          onChange={e => updateField('summary', e.target.value)}
          placeholder="几句话介绍方案亮点..."
          rows={3}
          className={`input-glass w-full px-4 py-2.5 rounded-xl text-sm resize-none ${errors.summary ? 'border-red-400/50' : ''}`}
        />
        {errors.summary && <p className="text-xs text-red-500 mt-1">{errors.summary}</p>}
      </div>

      {/* 详细介绍 */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">详细介绍</label>
        <textarea
          value={form.details}
          onChange={e => updateField('details', e.target.value)}
          placeholder="详细活动安排..."
          rows={4}
          className="input-glass w-full px-4 py-2.5 rounded-xl text-sm resize-none"
        />
      </div>

      {/* 标签 */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">标签</label>
        <input
          type="text"
          value={form.tags}
          onChange={e => updateField('tags', e.target.value)}
          placeholder="用顿号分隔，如：户外、竞技、BBQ"
          className="input-glass w-full px-4 py-2.5 rounded-xl text-sm"
        />
        <p className="text-xs text-text-light mt-1">顿号或逗号分隔</p>
      </div>

      {/* 按钮 */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 py-3 btn-glass text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
        >
          {plan ? <><Save className="w-4 h-4" /> 保存</> : <><Plus className="w-4 h-4" /> 添加</>}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 glass text-text-secondary font-medium rounded-xl hover:bg-primary/5 transition"
        >
          取消
        </button>
      </div>
    </form>
  );
}
