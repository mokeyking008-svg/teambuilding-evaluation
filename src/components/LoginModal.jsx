import { useState, useEffect, useRef } from 'react';
import { UserCircle, LogIn, ShieldAlert } from 'lucide-react';
import { getAvatarUrl } from '../hooks/useStore';

// 仅限以下人员登录
export const ALLOWED_NAMES = [
  '杨志伟', '高亚鹏', '常大伟', '高露', '张学德', '刘岩',
  '陈汉威', '黄天石', '李青远', '王馨悦', '朱伊凡', '吕梓通',
  '顾文庆', '陈欣蓝', '杨武',
];

export default function LoginModal({ onLogin, onClose }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const suggestions = name.trim()
    ? ALLOWED_NAMES.filter(n => n.includes(name.trim())).slice(0, 5)
    : [];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 点击外部关闭建议列表
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('请输入你的姓名');
      return;
    }
    if (!ALLOWED_NAMES.includes(trimmed)) {
      setError('非组织内部人员，不能参与投票');
      return;
    }
    const existingUsers = JSON.parse(localStorage.getItem('tb_users') || '{}');
    let userId = existingUsers[trimmed];
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      existingUsers[trimmed] = userId;
      localStorage.setItem('tb_users', JSON.stringify(existingUsers));
    }

    const avatar = getAvatarUrl(userId);
    onLogin({ id: userId, name: trimmed, avatar });
  };

  const selectSuggestion = (suggestion) => {
    setName(suggestion);
    setError('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        return;
      }
      if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[selectedIndex]);
        return;
      }
    }
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg w-[90vw] max-w-sm p-6 mx-4" onClick={e => e.stopPropagation()}>
        {/* 头像 + 标题 */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3 bg-primary">
            <UserCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">登录</h2>
          <p className="text-sm text-text-secondary mt-1">输入姓名参与投票</p>
        </div>

        {/* 输入框 + 建议列表 */}
        <div className="mb-4 relative" ref={suggestionsRef}>
          <input
            ref={inputRef}
            type="text"
            placeholder="输入姓名"
            value={name}
            onChange={e => {
              setName(e.target.value);
              setError('');
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => { if (name.trim()) setShowSuggestions(true); }}
            onKeyDown={handleKeyDown}
            maxLength={10}
            className={`input-clean w-full px-4 py-3 rounded-lg text-sm ${error ? 'border-red-400/50' : ''}`}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg overflow-hidden shadow-lg z-10 border border-[#F0F0F0]">
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => selectSuggestion(s)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition flex items-center gap-2.5 ${
                    i === selectedIndex
                      ? 'bg-[#F0FFF5] text-text-primary'
                      : 'text-text-secondary hover:bg-[#FAFAFA] hover:text-text-primary'
                  }`}
                >
                  <img
                    src={getAvatarUrl(s)}
                    alt={s}
                    className="w-6 h-6 rounded-full flex-shrink-0"
                  />
                  <span>{s}</span>
                  <span className="ml-auto text-xs text-text-light font-mono">
                    {s.replace(name.trim(), '')}
                  </span>
                </button>
              ))}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-1.5 mt-1.5 ml-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <p className="text-red-500 text-xs">{error}</p>
            </div>
          )}
        </div>

        {/* 预览头像（仅匹配名单时显示） */}
        {name.trim() && ALLOWED_NAMES.includes(name.trim()) && (
          <div className="flex items-center gap-3 p-3 bg-[#F5F5F5] rounded-lg mb-4">
            <img
              src={getAvatarUrl(name.trim())}
              alt="预览"
              className="w-9 h-9 rounded-full"
            />
            <span className="text-sm text-text-secondary">{name.trim()}</span>
          </div>
        )}

        {/* 登录按钮 */}
        <button
          onClick={handleSubmit}
          className="w-full py-3 btn-primary text-sm font-bold rounded-lg flex items-center justify-center gap-1.5"
        >
          <LogIn className="w-4 h-4" /> 进入
        </button>

        <button
          onClick={onClose}
          className="w-full mt-2 py-2 text-sm text-text-light hover:text-text-secondary transition"
        >
          取消
        </button>
      </div>
    </div>
  );
}
