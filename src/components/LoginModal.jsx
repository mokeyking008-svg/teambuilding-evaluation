import { useState, useEffect, useRef } from 'react';

// DiceBear 头像地址
function getAvatarUrl(name) {
  const seed = encodeURIComponent(name + Date.now());
  return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}`;
}

// 检查是否为空或纯空格
function isValidName(name) {
  return name && name.trim().length > 0;
}

export default function LoginModal({ onLogin, onClose }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!isValidName(trimmed)) {
      setError('请输入你的姓名');
      return;
    }
    if (trimmed.length > 10) {
      setError('姓名不能超过 10 个字符');
      return;
    }
    // 用 localStorage 生成稳定 ID
    const existingUsers = JSON.parse(localStorage.getItem('tb_users') || '{}');
    let userId = existingUsers[trimmed];
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      existingUsers[trimmed] = userId;
      localStorage.setItem('tb_users', JSON.stringify(existingUsers));
    }

    const avatar = `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(userId)}`;
    onLogin({ id: userId, name: trimmed, avatar });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-sm p-6 mx-4" onClick={e => e.stopPropagation()}>
        {/* 头像 + 标题 */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0089FF] rounded-full mb-3">
            <svg viewBox="0 0 24 24" className="w-9 h-9 text-white" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800">登录</h2>
          <p className="text-sm text-gray-500 mt-1">输入你的姓名即可参与投票</p>
        </div>

        {/* 输入框 */}
        <div className="mb-4">
          <input
            ref={inputRef}
            type="text"
            placeholder="请输入姓名"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            maxLength={10}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0089FF]/30 focus:border-[#0089FF] transition"
          />
          {error && <p className="text-red-500 text-xs mt-1.5 ml-1">{error}</p>}
        </div>

        {/* 预览头像 */}
        {isValidName(name) && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
            <img
              src={`https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(name.trim())}`}
              alt="预览"
              className="w-10 h-10 rounded-full border-2 border-gray-200"
            />
            <span className="text-sm text-gray-600">{name.trim()} <span className="text-gray-400">(你的头像)</span></span>
          </div>
        )}

        {/* 登录按钮 */}
        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-[#0089FF] text-white font-medium rounded-xl hover:bg-[#0077DD] transition shadow-sm active:scale-[0.98]"
        >
          进入
        </button>

        <button
          onClick={onClose}
          className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600 transition"
        >
          取消
        </button>
      </div>
    </div>
  );
}
