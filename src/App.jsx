import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useRatings, useReviews, useVotes } from './hooks/useStore';
import defaultPlans from './data/plans';
import { ratingDimensions } from './data/plans';
import LoginModal from './components/LoginModal';
import StarRating from './components/StarRating';
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

// 装饰性浮动光球
function FloatingOrbs() {
  return (
    <>
      <div className="bg-orb" style={{ width: 400, height: 400, top: '-10%', left: '-5%', background: '#667EEA' }} />
      <div className="bg-orb" style={{ width: 350, height: 350, top: '30%', right: '-8%', background: '#764BA2' }} />
      <div className="bg-orb" style={{ width: 300, height: 300, bottom: '5%', left: '20%', background: '#A78BFA' }} />
    </>
  );
}

function App() {
  const { user, login, logout } = useUser();
  const [showLogin, setShowLogin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [filterBudget, setFilterBudget] = useState('all');
  const [filterDuration, setFilterDuration] = useState('all');
  const [showResults, setShowResults] = useState(true);
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

  // 一键评分数据（独立存储，与5维评分互不干扰）
  const getQuickRatingData = (planId) => {
    const all = JSON.parse(localStorage.getItem('tb_quick_ratings') || '{}');
    const planData = all[planId] || {};
    const values = Object.values(planData);
    const getAverage = () => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const getRatingCount = () => values.length;
    const getUserScore = (userId) => planData[userId] || null;
    const updateScore = (userId, score) => {
      const a = JSON.parse(localStorage.getItem('tb_quick_ratings') || '{}');
      if (!a[planId]) a[planId] = {};
      a[planId][userId] = score;
      localStorage.setItem('tb_quick_ratings', JSON.stringify(a));
    };
    return { getAverage, getRatingCount, getUserScore, updateScore };
  };

  // 过滤方案
  const filteredPlans = plans.filter(plan => {
    // 预算：按 budgetNum 范围筛选
    if (filterBudget !== 'all') {
      const num = plan.budgetNum || 0;
      if (filterBudget === '0-200' && (num < 0 || num > 200)) return false;
      if (filterBudget === '200-300' && (num < 200 || num > 300)) return false;
      if (filterBudget === '300+' && num < 300) return false;
    }
    // 时长：精确匹配
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
    <div className="min-h-screen relative">
      <FloatingOrbs />

      {/* 顶部导航 - Glass */}
      <header className="sticky top-0 z-40 nav-glass">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏕️</span>
            <h1 className="text-lg font-bold gradient-text hidden sm:block">
              数字化平台中心 · 团建方案投票
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 管理按钮 */}
            <button
              onClick={() => setShowAdmin(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-white/50 hover:text-white/80 hover:bg-white/5 text-sm rounded-lg transition"
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
                <span className="text-sm text-white/70 hidden sm:inline">{user.name}</span>
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border-2 border-primary/40" />
                <button onClick={logout} className="text-xs text-white/40 hover:text-white/70 transition ml-1">退出</button>
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="btn-glass flex items-center gap-1.5 px-4 py-1.5 text-white text-sm font-medium rounded-full"
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

      <main className="max-w-5xl mx-auto px-4 py-6 relative z-10">
        {/* 投票进度 - Glass */}
        {totalVotes > 0 && (
          <div className="mb-6 glass-solid rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">🗳️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white/90">
                共 <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent font-bold text-lg">{totalVotes}</span> 人参与投票
              </p>
              <p className="text-xs text-white/40">你的每一票都很重要！</p>
            </div>
          </div>
        )}

        {/* 筛选栏 */}
        <div className="mb-6 space-y-2 sm:space-y-3">
          <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
            <span className="text-xs sm:text-sm font-medium text-white/50">💰 人均预算：</span>
            {[
              { key: 'all', label: '全部' },
              { key: '0-200', label: '¥0～200' },
              { key: '200-300', label: '¥200～300' },
              { key: '300+', label: '¥300+' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setFilterBudget(item.key)}
                className={`filter-btn px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium ${
                  filterBudget === item.key
                    ? 'btn-glass text-white shadow-lg'
                    : 'glass text-white/60 hover:text-white/90'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
            <span className="text-xs sm:text-sm font-medium text-white/50">⏱️ 团建时长：</span>
            {[
              { key: 'all', label: '全部' },
              { key: '0.5天', label: '0.5天' },
              { key: '全天', label: '全天' },
              { key: '2天', label: '2天' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setFilterDuration(item.key)}
                className={`filter-btn px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium ${
                  filterDuration === item.key
                    ? 'btn-glass text-white shadow-lg'
                    : 'glass text-white/60 hover:text-white/90'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 方案卡片 - Glass */}
        {filteredPlans.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
            {filteredPlans.map(plan => {
              const rd = getPlanRatingData(plan.id);
              const qrd = getQuickRatingData(plan.id);
              // 角标优先用一键评分均分，降级用5维均分
              const avgScore = qrd.getAverage() || rd.getAverage();
              const voteCount = getVoteCount(plan.id);
              const userVoted = getUserVote(user?.id);
              const isVotedByMe = userVoted === plan.id;

              return (
                <div
                  key={plan.id}
                  className="plan-card glass rounded-2xl overflow-hidden cursor-pointer"
                  onClick={() => toggleDetail(plan.id)}
                >
                  <div className="relative h-40 overflow-hidden">
                    <img src={plan.cover} alt={plan.name} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-white font-bold text-base leading-tight">{plan.name}</h3>
                    </div>
                    {avgScore > 0 && (
                      <div className="absolute top-3 right-3 glass-solid rounded-full px-2.5 py-1 flex items-center gap-1">
                        <span className="text-sm">⭐</span>
                        <span className="font-bold text-sm text-white">{avgScore.toFixed(1)}</span>
                      </div>
                    )}
                    {isVotedByMe && (
                      <div className="absolute top-3 left-3 bg-success text-white rounded-full px-2.5 py-1 text-xs font-bold">✓ 已投</div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="tag-glass inline-flex items-center gap-1 text-xs text-white/70 px-2 py-1 rounded-full">📍 {plan.location}</span>
                      <span className="tag-glass inline-flex items-center gap-1 text-xs text-white/70 px-2 py-1 rounded-full">⏱️ {plan.duration}</span>
                      <span className="tag-glass inline-flex items-center gap-1 text-xs text-white/70 px-2 py-1 rounded-full">👥 {plan.maxPeople}人</span>
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed line-clamp-3">{plan.summary}</p>

                    {/* 卡片上一键评分滑块 */}
                    <CardQuickRating
                      planId={plan.id}
                      user={user}
                      getQuickRatingData={getQuickRatingData}
                      onRefresh={forceRefresh}
                    />

                    <button
                      onClick={(e) => { e.stopPropagation(); handleVote(plan.id); }}
                      className={`mt-3 w-full py-2.5 rounded-xl text-sm font-bold transition ${
                        isVotedByMe
                          ? 'glass text-success border-2 border-success/30'
                          : 'btn-glass text-white shadow-lg'
                      } ${voteAnimId === plan.id ? 'vote-pulse' : ''}`}
                    >
                      {isVotedByMe ? '✓ 已投票（点击改投）' : '🗳️ 投给这个方案'}
                    </button>
                    {plan.tags && plan.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {plan.tags.map(tag => (
                          <span key={tag} className="tag-glass text-xs text-white/40 px-2 py-0.5 rounded-full">#{tag}</span>
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
            <p className="text-white/40 mt-4 text-lg">没有找到匹配的方案</p>
            <button onClick={() => { setFilterBudget('all'); setFilterDuration('all'); }} className="mt-3 text-primary hover:text-primary-light text-sm font-medium transition">
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
            className="w-full glass glass-hover rounded-2xl p-5 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div className="text-left">
                <h2 className="text-lg font-bold text-white/90 group-hover:text-white transition">查看投票结果</h2>
                <p className="text-sm text-white/40">票数统计与评分排名</p>
              </div>
            </div>
            <svg className={`w-5 h-5 text-white/40 transition-transform ${showResults ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      <footer className="text-center py-6 text-xs text-white/25 relative z-10">
        <p>数字化平台中心 · 团建方案投票</p>
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 modal-overlay" onClick={onClose}>
      <div className="min-h-full flex items-start justify-center py-8 px-4" onClick={e => e.stopPropagation()}>
        <div className="glass-solid rounded-2xl shadow-2xl w-full max-w-2xl relative" ref={detailRef}>
          <div className="relative h-48 sm:h-64 overflow-hidden rounded-t-2xl">
            <img src={plan.cover} alt={plan.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 glass-solid rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
              <h2 className="text-white font-bold text-xl sm:text-2xl mb-2">{plan.name}</h2>
              <div className="flex flex-wrap gap-2">
                <span className="glass-solid text-white/90 text-xs px-3 py-1 rounded-full">📍 {plan.location}</span>
                <span className="glass-solid text-white/90 text-xs px-3 py-1 rounded-full">⏱️ {plan.duration}</span>
                <span className="glass-solid text-white/90 text-xs px-3 py-1 rounded-full">👥 最多{plan.maxPeople}人</span>
                <span className="glass-solid text-white/90 text-xs px-3 py-1 rounded-full">💰 ¥{plan.budgetNum}/人</span>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white/90 mb-2">📋 方案详情</h3>
              <p className="text-white/60 text-sm leading-relaxed">{plan.details || plan.summary}</p>
            </div>

            {plan.tags && plan.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {plan.tags.map(tag => (
                  <span key={tag} className="tag-glass text-primary text-xs font-medium px-3 py-1 rounded-full">#{tag}</span>
                ))}
              </div>
            )}

            {avgScore > 0 && (
              <div className="glass rounded-xl p-4">
                <h3 className="text-sm font-bold text-white/80 mb-3">📊 综合评分</h3>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">⭐</span>
                  <span className="text-2xl font-bold text-white">{avgScore.toFixed(1)}</span>
                  <span className="text-sm text-white/40">({ratingCount} 人评分)</span>
                </div>
                <div className="space-y-2">
                  {ratingDimensions.map(dim => {
                    const avg = ratingsHook.getDimensionAverage(dim.key);
                    return (
                      <div key={dim.key} className="flex items-center justify-between">
                        <span className="text-sm text-white/60">{dim.icon} {dim.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-white/10 rounded-full h-1.5">
                            <div className="bg-gradient-to-r from-primary to-accent rounded-full h-1.5 transition-all duration-500" style={{ width: `${avg / 5 * 100}%` }} />
                          </div>
                          <span className="text-sm font-medium text-white/80 w-8 text-right">{avg.toFixed(1)}</span>
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
                  ? 'glass text-success border-2 border-success/30'
                  : 'btn-glass text-white shadow-xl hover:shadow-2xl active:scale-[0.98]'
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

// 卡片上一键评分滑块（推荐指数）
function CardQuickRating({ planId, user, getQuickRatingData, onRefresh }) {
  const qrd = getQuickRatingData(planId);
  const avgScore = qrd.getAverage();
  const ratingCount = qrd.getRatingCount();
  const myScore = qrd.getUserScore(user?.id);

  const [sliderVal, setSliderVal] = useState(myScore || 3.0);
  const [justRated, setJustRated] = useState(!!myScore);

  useEffect(() => {
    const fresh = qrd.getUserScore(user?.id);
    if (fresh) { setSliderVal(fresh); setJustRated(true); }
  }, [qrd, user?.id]);

  const getScoreLabel = (val) => {
    if (val < 1.5) return '不推荐';
    if (val < 2.5) return '一般';
    if (val < 3.5) return '还不错';
    if (val < 4.5) return '推荐';
    return '超推荐';
  };

  const getScoreColor = (val) => {
    if (val < 2) return 'text-red-400';
    if (val < 3) return 'text-orange-400';
    if (val < 4) return 'text-yellow-400';
    return 'text-green-400';
  };

  // 滑块背景填充百分比
  const fillPercent = ((sliderVal - 1) / 4) * 100;

  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    setSliderVal(val);
  };

  const handleSliderCommit = () => {
    if (!user) return;
    qrd.updateScore(user.id, sliderVal);
    setJustRated(true);
    onRefresh();
  };

  return (
    <div className="mt-4 pt-3 border-t border-white/10" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/40">✨ 推荐指数</span>
        <div className="flex items-center gap-2">
          {ratingCount > 0 && (
            <span className="text-xs text-white/30">{ratingCount}人评</span>
          )}
          {justRated && (
            <span className={`text-lg font-bold ${getScoreColor(sliderVal)}`}>
              {sliderVal.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* 滑块 */}
      <div className="relative mb-1.5">
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 h-[6px] rounded-full pointer-events-none"
          style={{
            width: `${fillPercent}%`,
            background: 'linear-gradient(90deg, #667EEA, #A78BFA)',
          }}
        />
        <input
          type="range"
          min="1"
          max="5"
          step="0.1"
          value={sliderVal}
          onChange={handleSliderChange}
          onMouseUp={handleSliderCommit}
          onTouchEnd={handleSliderCommit}
          disabled={!user}
          className="quick-slider relative w-full z-[1]"
        />
      </div>

      {/* 两端标签 */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/25">不推荐</span>
        {user ? (
          <span className={`text-[10px] ${justRated ? getScoreColor(sliderVal) : 'text-white/25'} transition-colors`}>
            {justRated ? getScoreLabel(sliderVal) : '拖动评分'}
          </span>
        ) : (
          <span className="text-[10px] text-primary/70">登录后可评分</span>
        )}
        <span className="text-[10px] text-white/25">超推荐</span>
      </div>
    </div>
  );
}

export default App;
