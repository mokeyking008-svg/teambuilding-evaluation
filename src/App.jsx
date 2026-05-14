import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useRatings, useReviews, useVotes } from './hooks/useStore';
import defaultPlans from './data/plans';
import { ratingDimensions } from './data/plans';
import LoginModal from './components/LoginModal';
import RatingSection from './components/RatingSection';
import VoteResults from './components/VoteResults';
import AdminPanel from './components/AdminPanel';

// 方案存储 key
const PLANS_KEY = 'tb_plans';

// 获取方案列表（优先 localStorage，回退到默认）
function loadPlans() {
  const stored = localStorage.getItem(PLANS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) { /* ignore */ }
  }
  // 首次访问，初始化默认方案到 localStorage
  localStorage.setItem(PLANS_KEY, JSON.stringify(defaultPlans));
  return defaultPlans;
}

function App() {
  const { user, login, logout } = useUser();
  const [showLogin, setShowLogin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [filterBudget, setFilterBudget] = useState('all');
  const [filterDuration, setFilterDuration] = useState('all');
  const [showResults, setShowResults] = useState(false);
  const [voteAnimId, setVoteAnimId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const detailRef = useRef(null);

  // 方案数据（localStorage 持久化）
  const [plans, setPlans] = useState(loadPlans);

  const forceRefresh = () => setRefreshKey(k => k + 1);

  // 投票
  const { votes, vote, getUserVote, getVoteCount, getTotalVotes } = useVotes();

  // 保存方案到 localStorage
  const handleSavePlans = (updated) => {
    setPlans(updated);
    localStorage.setItem(PLANS_KEY, JSON.stringify(updated));
    forceRefresh();
  };

  // 预创建所有方案的评分数据（从 localStorage 读取）
  const getPlanRatingData = (planId) => {
    const allRatings = JSON.parse(localStorage.getItem('tb_ratings') || '{}');
    const userRatings = allRatings[planId] || {};
    const values = Object.values(userRatings);

    const getAverage = () => {
      if (values.length === 0) return 0;
      const dims = Object.keys(values[0]);
      const dimAvgs = dims.map(dim => values.reduce((s, v) => s + (v[dim] || 0), 0) / values.length);
      return dimAvgs.reduce((s, v) => s + v, 0) / dimAvgs.length;
    };

    const getDimensionAverage = (dimKey) => {
      if (values.length === 0) return 0;
      return values.reduce((s, v) => s + (v[dimKey] || 0), 0) / values.length;
    };

    const getRatingCount = () => values.length;
    const getUserRating = (userId) => userRatings[userId] || null;

    const updateRating = (userId, scores) => {
      const all = JSON.parse(localStorage.getItem('tb_ratings') || '{}');
      all[planId] = { ...all[planId], [userId]: scores };
      localStorage.setItem('tb_ratings', JSON.stringify(all));
    };

    const allReviews = JSON.parse(localStorage.getItem('tb_reviews') || '{}');
    const planReviews = allReviews[planId] || [];

    const addReview = (userId, userName, userAvatar, content) => {
      const all = JSON.parse(localStorage.getItem('tb_reviews') || '{}');
      const existing = all[planId] || [];
      const idx = existing.findIndex(r => r.userId === userId);
      const newReview = { userId, userName, userAvatar, content, updatedAt: new Date().toISOString() };
      if (idx >= 0) { existing[idx] = newReview; }
      else { newReview.createdAt = new Date().toISOString(); existing.push(newReview); }
      all[planId] = existing;
      localStorage.setItem('tb_reviews', JSON.stringify(all));
    };

    const getUserReview = (userId) => planReviews.find(r => r.userId === userId) || null;

    return {
      getAverage, getDimensionAverage, getRatingCount,
      getUserRating, updateRating,
      reviews: planReviews, addReview, getUserReview,
    };
  };

  // 过滤方案
  const filteredPlans = plans.filter(plan => {
    if (filterBudget !== 'all' && plan.budget !== filterBudget) return false;
    if (filterDuration !== 'all' && plan.duration !== filterDuration) return false;
    return true;
  });

  // 投票
  const handleVote = (planId) => {
    if (!user) { setShowLogin(true); return; }
    vote(user.id, planId);
    setVoteAnimId(planId);
    setTimeout(() => setVoteAnimId(null), 600);
  };

  // 展开详情
  const toggleDetail = (planId) => {
    if (expandedPlan === planId) {
      setExpandedPlan(null);
    } else {
      setExpandedPlan(planId);
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const currentPlan = plans.find(p => p.id === expandedPlan);
  const totalVotes = getTotalVotes();

  return (
    <div className="min-h-screen bg-warm-bg">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏕️</span>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent hidden sm:block">
              团建方案评估
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 管理按钮 */}
            <button
              onClick={() => setShowAdmin(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 text-sm rounded-lg transition"
              title="管理方案"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span className="hidden sm:inline">管理</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 hidden sm:inline">{user.name}</span>
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border-2 border-orange-200" />
                <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600 transition ml-1">退出</button>
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0089FF] text-white text-sm font-medium rounded-full hover:bg-[#0077DD] transition shadow-sm"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
                登录
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* 投票进度 */}
        {totalVotes > 0 && (
          <div className="mb-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">🗳️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">
                共 <span className="text-primary font-bold text-lg">{totalVotes}</span> 人参与投票
              </p>
              <p className="text-xs text-gray-500">你的每一票都很重要！</p>
            </div>
          </div>
        )}

        {/* 筛选栏 */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-gray-500">💰 预算：</span>
            {[
              { key: 'all', label: '全部' },
              { key: '0-100', label: '¥0-100' },
              { key: '100-200', label: '¥100-200' },
              { key: '200+', label: '¥200+' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setFilterBudget(item.key)}
                className={`filter-btn px-3 py-1.5 rounded-full text-sm font-medium ${
                  filterBudget === item.key
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-orange-50 border border-gray-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-gray-500">⏱️ 时长：</span>
            {[
              { key: 'all', label: '全部' },
              { key: '半天', label: '半天' },
              { key: '一天', label: '一天' },
              { key: '两天+', label: '两天+' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setFilterDuration(item.key)}
                className={`filter-btn px-3 py-1.5 rounded-full text-sm font-medium ${
                  filterDuration === item.key
                    ? 'bg-secondary text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-teal-50 border border-gray-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 方案卡片 */}
        {filteredPlans.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {filteredPlans.map(plan => {
              const rd = getPlanRatingData(plan.id);
              const avgScore = rd.getAverage();
              const voteCount = getVoteCount(plan.id);
              const userVoted = getUserVote(user?.id);
              const isVotedByMe = userVoted === plan.id;

              return (
                <div
                  key={plan.id}
                  className="plan-card bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer"
                  onClick={() => toggleDetail(plan.id)}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img src={plan.cover} alt={plan.name} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-white font-bold text-base leading-tight">{plan.name}</h3>
                    </div>
                    {avgScore > 0 && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
                        <span className="text-sm">⭐</span>
                        <span className="font-bold text-sm text-gray-800">{avgScore.toFixed(1)}</span>
                      </div>
                    )}
                    {isVotedByMe && (
                      <div className="absolute top-3 left-3 bg-success text-white rounded-full px-2.5 py-1 text-xs font-bold">✓ 已投</div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">📍 {plan.location}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">⏱️ {plan.duration}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">👥 {plan.maxPeople}人</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{plan.summary}</p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                      <span className="text-primary font-bold text-lg">¥{plan.budgetNum}<span className="text-xs text-gray-400 font-normal">/人</span></span>
                      <span className="text-xs text-gray-400">🗳️ {voteCount} 票</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleVote(plan.id); }}
                      className={`mt-3 w-full py-2.5 rounded-xl text-sm font-bold transition ${
                        isVotedByMe
                          ? 'bg-success/10 text-success border-2 border-success/30'
                          : 'bg-gradient-to-r from-primary to-primary-light text-white hover:from-primary-dark hover:to-primary shadow-md hover:shadow-lg active:scale-[0.98]'
                      } ${voteAnimId === plan.id ? 'vote-pulse' : ''}`}
                    >
                      {isVotedByMe ? '✓ 已投票（点击改投）' : '🗳️ 投给这个方案'}
                    </button>
                    {plan.tags && plan.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {plan.tags.map(tag => (
                          <span key={tag} className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <span className="text-6xl">🔍</span>
            <p className="text-gray-400 mt-4 text-lg">没有找到匹配的方案</p>
            <button onClick={() => { setFilterBudget('all'); setFilterDuration('all'); }} className="mt-3 text-primary hover:text-primary-dark text-sm font-medium">
              清除筛选
            </button>
          </div>
        )}

        {/* 方案详情弹窗 */}
        {currentPlan && (
          <PlanDetailModal
            plan={currentPlan}
            user={user}
            onClose={() => setExpandedPlan(null)}
            onVote={handleVote}
            getUserVote={getUserVote}
            voteAnimId={voteAnimId}
            getPlanRatingData={getPlanRatingData}
            refreshKey={refreshKey}
            onRefresh={forceRefresh}
            detailRef={detailRef}
          />
        )}

        {/* 投票结果 */}
        <div className="mb-8">
          <button
            onClick={() => setShowResults(!showResults)}
            className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between hover:shadow-md transition group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div className="text-left">
                <h2 className="text-lg font-bold text-gray-800 group-hover:text-primary transition">查看投票结果</h2>
                <p className="text-sm text-gray-400">票数统计与评分排名</p>
              </div>
            </div>
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${showResults ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          {showResults && (
            <div className="mt-4">
              <VoteResults plans={plans} getVoteCount={getVoteCount} getTotalVotes={getTotalVotes} votes={votes} />
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-gray-400">
        <p>团建方案评估工具 · 数据存储在本地浏览器</p>
        <p className="mt-1">正式版将接入后端服务</p>
      </footer>

      {/* Modals */}
      {showLogin && (
        <LoginModal onLogin={(u) => { login(u); setShowLogin(false); }} onClose={() => setShowLogin(false)} />
      )}
      {showAdmin && (
        <AdminPanel
          plans={plans}
          onSavePlans={handleSavePlans}
          onExit={() => setShowAdmin(false)}
        />
      )}
    </div>
  );
}

// 详情弹窗组件
function PlanDetailModal({ plan, user, onClose, onVote, getUserVote, voteAnimId, getPlanRatingData, refreshKey, onRefresh, detailRef }) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ratingsHook = useRatings(plan.id);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const reviewsHook = useReviews(plan.id);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    // 触发重新渲染以读取最新 localStorage 数据
  }, [refreshKey]);

  const avgScore = ratingsHook.getAverage();
  const ratingCount = ratingsHook.getRatingCount();
  const userVoted = getUserVote(user?.id);
  const isVotedByMe = userVoted === plan.id;

  const handleSubmitRating = (userId, scores) => {
    ratingsHook.updateRating(userId, scores);
    onRefresh();
  };

  const handleSubmitReview = (userId, userName, userAvatar, content) => {
    reviewsHook.addReview(userId, userName, userAvatar, content);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 modal-overlay" onClick={onClose}>
      <div className="min-h-full flex items-start justify-center py-8 px-4" onClick={e => e.stopPropagation()}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative" ref={detailRef}>
          <div className="relative h-56 sm:h-64 overflow-hidden rounded-t-2xl">
            <img src={plan.cover} alt={plan.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/40 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
            <div className="absolute bottom-6 left-6 right-6">
              <h2 className="text-white font-bold text-2xl mb-2">{plan.name}</h2>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">📍 {plan.location}</span>
                <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">⏱️ {plan.duration}</span>
                <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">👥 最多{plan.maxPeople}人</span>
                <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">💰 ¥{plan.budgetNum}/人</span>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-2">📋 方案详情</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{plan.details || plan.summary}</p>
            </div>

            {plan.tags && plan.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {plan.tags.map(tag => (
                  <span key={tag} className="bg-orange-50 text-primary text-xs font-medium px-3 py-1 rounded-full">#{tag}</span>
                ))}
              </div>
            )}

            {avgScore > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3">📊 综合评分</h3>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">⭐</span>
                  <span className="text-2xl font-bold text-gray-800">{avgScore.toFixed(1)}</span>
                  <span className="text-sm text-gray-400">({ratingCount} 人评分)</span>
                </div>
                <div className="space-y-2">
                  {ratingDimensions.map(dim => {
                    const avg = ratingsHook.getDimensionAverage(dim.key);
                    return (
                      <div key={dim.key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{dim.icon} {dim.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-star rounded-full h-1.5 transition-all duration-500" style={{ width: `${avg / 5 * 100}%` }} />
                          </div>
                          <span className="text-sm font-medium text-gray-700 w-8 text-right">{avg.toFixed(1)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <RatingSection
              user={user}
              planId={plan.id}
              getUserRating={ratingsHook.getUserRating}
              updateRating={handleSubmitRating}
              getUserReview={reviewsHook.getUserReview}
              addReview={handleSubmitReview}
              reviews={reviewsHook.reviews}
            />

            <button
              onClick={() => { onVote(plan.id); onRefresh(); }}
              className={`w-full py-4 rounded-xl text-base font-bold transition ${
                isVotedByMe
                  ? 'bg-success/10 text-success border-2 border-success/30'
                  : 'bg-gradient-to-r from-primary to-primary-light text-white hover:from-primary-dark hover:to-primary shadow-lg hover:shadow-xl active:scale-[0.98]'
              } ${voteAnimId === plan.id ? 'vote-pulse' : ''}`}
            >
              {isVotedByMe ? '✓ 已投票（点击改投其他方案）' : '🗳️ 投票支持这个方案！'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
