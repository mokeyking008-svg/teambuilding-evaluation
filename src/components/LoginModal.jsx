import { useState } from 'react';
import { mockUsers } from '../data/plans';

export default function LoginModal({ onLogin, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = mockUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-md p-6 mx-4" onClick={e => e.stopPropagation()}>
        {/* 钉钉 Logo */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0089FF] rounded-full mb-3">
            <svg viewBox="0 0 24 24" className="w-9 h-9 text-white" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800">钉钉扫码登录</h2>
          <p className="text-sm text-gray-500 mt-1">请选择你的身份（Mock模式）</p>
        </div>

        {/* 搜索框 */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="搜索同事姓名..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0089FF]/30 focus:border-[#0089FF] transition"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>

        {/* 用户列表 */}
        <div className="max-h-60 overflow-y-auto space-y-1 mb-4">
          {filtered.map(user => (
            <button
              key={user.id}
              onClick={() => onLogin(user)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-orange-50 transition text-left group"
            >
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border-2 border-transparent group-hover:border-orange-300 transition" />
              <span className="font-medium text-gray-700 group-hover:text-orange-600 transition">{user.name}</span>
              <svg className="w-4 h-4 ml-auto text-gray-300 group-hover:text-orange-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-4">未找到匹配的用户</p>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">正式上线后将使用钉钉 OAuth2 扫码登录</p>
      </div>
    </div>
  );
}
