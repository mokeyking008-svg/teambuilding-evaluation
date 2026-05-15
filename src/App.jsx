import { useState, useEffect, useRef } from 'react';
import { useUser, useVotes } from './hooks/useStore';
import { ALLOWED_NAMES } from './components/LoginModal';
import defaultPlans from './data/plans';
import LoginModal from './components/LoginModal';
import ReviewSection from './components/ReviewSection';
import AdminPanel from './components/AdminPanel';
import VoteResults from './components/VoteResults';
import VoteToast, { showToast } from './components/VoteToast';
import {
  Tent, Settings, LogIn, Vote, SearchX,
  MapPin, Clock, Coins, Star, X, FileText,
  Sparkles, CheckCircle, ThumbsUp,
  MessageSquare, TrendingUp,
} from 'lucide-react';

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

  // 点评数据
  const getReviewData = (planId) => {
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

    return { reviews: planReviews, addReview, getUserReview };
  };

  // 一键评分数据（滑块推荐指数）
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
    const wasAlreadyVoted = getUserVote(user.id) !== null;
    vote(user.id, planId);
    setVoteAnimId(planId);
    setTimeout(() => setVoteAnimId(null), 600);
    // 显示 toast（投票或改投都显示）
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      // 延迟一帧以读取更新后的投票数
      setTimeout(() => {
        showToast(plan.name, getTotalVotes());
      }, 50);
    }
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
            <Tent className="w-6 h-6 text-accent" />
            <h1 className="text-lg font-bold gradient-text hidden sm:block">
              团建方案投票
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 管理按钮 */}
            <button
              onClick={() => setShowAdmin(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-white/50 hover:text-white/80 hover:bg-white/5 text-sm rounded-lg transition"
              title="管理方案"
            >
              <Settings className="w-4 h-4" />
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
                <LogIn className="w-4 h-4" />
                登录
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 relative z-10">
        {/* 投票进度 */}
        <div className="mb-6 glass-solid rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Vote className="w-7 h-7 text-accent flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white/90">
                共 <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent font-bold text-lg">{totalVotes}</span>/<span className="text-white/60 font-medium">{ALLOWED_NAMES.length}</span> 人参与投票
              </p>
            </div>
            <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              {ALLOWED_NAMES.length > 0 ? Math.round((totalVotes / ALLOWED_NAMES.length) * 100) : 0}%
            </span>
          </div>
          {/* 进度条 */}
          <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${ALLOWED_NAMES.length > 0 ? Math.min((totalVotes / ALLOWED_NAMES.length) * 100, 100) : 0}%`,
                background: 'linear-gradient(90deg, #667EEA, #A78BFA)',
              }}
            />
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="mb-6 space-y-2 sm:space-y-3">
          <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
            <Coins className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-white/50"><span className="sm:hidden">预算/人</span><span className="hidden sm:inline">人均预算：</span></span>
            {[
              { key: 'all', label: '全部' },
              { key: '0-200', label: '0～200' },
              { key: '200-300', label: '200～300' },
              { key: '300+', label: '300+' },
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
            <Clock className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-white/50"><span className="sm:hidden">时长</span><span className="hidden sm:inline">团建时长：</span></span>
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

        {/* 方案卡片 - 精简版 */}
        {filteredPlans.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
            {filteredPlans.map(plan => {
              const qrd = getQuickRatingData(plan.id);
              const avgScore = qrd.getAverage();
              const userVoted = getUserVote(user?.id);
              const isVotedByMe = userVoted === plan.id;

              return (
                <div
                  key={plan.id}
                  className="plan-card glass rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                  onClick={() => toggleDetail(plan.id)}
                >
                  {/* 封面 + 标题 + 星级角标 */}
                  <div className="relative h-40 overflow-hidden">
                    <img src={plan.cover} alt={plan.name} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-white font-bold text-base leading-tight">{plan.name}</h3>
                    </div>
                    {avgScore > 0 && (
                      <div className="absolute top-3 right-3 glass-solid rounded-full px-2.5 py-1 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-star fill-star" />
                        <span className="font-bold text-sm text-white">{avgScore.toFixed(1)}</span>
                      </div>
                    )}
                    {isVotedByMe && (
                      <div className="absolute top-3 left-3 bg-success text-white rounded-full px-2.5 py-1 text-xs font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> 已投
                      </div>
                    )}
                  </div>

                  {/* 信息标签 */}
                  <div className="p-4">
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="tag-glass inline-flex items-center gap-1 text-xs text-white/70 px-2 py-1 rounded-full">
                        <MapPin className="w-3 h-3 flex-shrink-0" /> {plan.location}
                      </span>
                      <span className="tag-glass inline-flex items-center gap-1 text-xs text-white/70 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3 flex-shrink-0" /> {plan.duration}
                      </span>
                      <span className="tag-glass inline-flex items-center gap-1 text-xs text-white/70 px-2 py-1 rounded-full">
                        <Coins className="w-3 h-3 flex-shrink-0" /> ¥{plan.budgetNum}/人
                      </span>
                    </div>

                    {/* 投票按钮 - 卡片上唯一独立操作 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleVote(plan.id); }}
                      className={`w-full py-2.5 rounded-xl text-sm font-bold transition ${
                        isVotedByMe
                          ? 'bg-success/15 text-success border-2 border-success/30'
                          : 'btn-glass text-white shadow-lg'
                      } ${voteAnimId === plan.id ? 'vote-pulse' : ''}`}
                    >
                      {isVotedByMe ? (
                        <span className="flex items-center justify-center gap-1"><CheckCircle className="w-4 h-4" /> 已投</span>
                      ) : (
                        <span className="flex items-center justify-center gap-1"><ThumbsUp className="w-4 h-4" /> 投票</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <SearchX className="w-16 h-16 text-white/20 mx-auto" />
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
            getReviewData={getReviewData}
            getQuickRatingData={getQuickRatingData}
            refreshKey={refreshKey}
            onRefresh={forceRefresh}
            detailRef={detailRef}
          />
        )}

        {/* 投票结果 */}
        <div className="mb-8">
          <VoteResults plans={plans} getVoteCount={getVoteCount} getTotalVotes={getTotalVotes} votes={votes} refreshKey={refreshKey} />
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-white/25 relative z-10">
        <p>团建方案投票</p>
      </footer>

      {/* Modals */}
      <VoteToast />
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
function PlanDetailModal({ plan, user, onClose, onVote, getUserVote, voteAnimId, getReviewData, getQuickRatingData, refreshKey, onRefresh, detailRef }) {
  const reviewData = getReviewData(plan.id);
  const qrd = getQuickRatingData(plan.id);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    // 触发重新渲染以读取最新 localStorage 数据
  }, [refreshKey]);

  const userVoted = getUserVote(user?.id);
  const isVotedByMe = userVoted === plan.id;

  const handleSubmitReview = (userId, userName, userAvatar, content) => {
    reviewData.addReview(userId, userName, userAvatar, content);
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
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
              <h2 className="text-white font-bold text-xl sm:text-2xl mb-2">{plan.name}</h2>
              <div className="flex flex-wrap gap-2">
                <span className="tag-glass text-white/90 text-xs px-3 py-1 rounded-full inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {plan.location}
                </span>
                <span className="tag-glass text-white/90 text-xs px-3 py-1 rounded-full inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {plan.duration}
                </span>
                <span className="tag-glass text-white/90 text-xs px-3 py-1 rounded-full inline-flex items-center gap-1">
                  <Coins className="w-3 h-3" /> ¥{plan.budgetNum}/人
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            {/* 方案详情 */}
            <div>
              <h3 className="text-base font-bold text-white/90 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" /> 方案介绍
              </h3>
              <p className="text-white/60 text-sm leading-relaxed">{plan.details || plan.summary}</p>
            </div>

            {/* 标签 */}
            {plan.tags && plan.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {plan.tags.map(tag => (
                  <span key={tag} className="tag-glass text-primary text-xs font-medium px-3 py-1 rounded-full">#{tag}</span>
                ))}
              </div>
            )}

            {/* 已收到的评价 - 大众点评风格 */}
            <ReviewSummary planId={plan.id} getQuickRatingData={getQuickRatingData} getReviewData={getReviewData} />

            {/* 推荐指数评分滑块 */}
            <QuickRatingPanel
              planId={plan.id}
              user={user}
              getQuickRatingData={getQuickRatingData}
              onRefresh={onRefresh}
            />

            {/* 点评 */}
            <ReviewSection
              user={user}
              planId={plan.id}
              getUserReview={reviewData.getUserReview}
              addReview={handleSubmitReview}
              reviews={reviewData.reviews}
            />

            {/* 投票按钮 */}
            <button
              onClick={() => { onVote(plan.id); onRefresh(); }}
              className={`w-full py-4 rounded-xl text-base font-bold transition ${
                isVotedByMe
                  ? 'bg-success/15 text-success border-2 border-success/30'
                  : 'btn-glass text-white shadow-xl hover:shadow-2xl active:scale-[0.98]'
              } ${voteAnimId === plan.id ? 'vote-pulse' : ''}`}
            >
              {isVotedByMe ? (
                <span className="flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" /> 已投（点击改投）</span>
              ) : (
                <span className="flex items-center justify-center gap-2"><ThumbsUp className="w-5 h-5" /> 投票</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 详情页内推荐指数评分滑块
function QuickRatingPanel({ planId, user, getQuickRatingData, onRefresh }) {
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

  const fillPercent = ((sliderVal - 1) / 4) * 100;

  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    setSliderVal(val);
    if (user) {
      qrd.updateScore(user.id, val);
      setJustRated(true);
      onRefresh();
    }
  };

  const handleSliderCommit = () => {
    if (!user) return;
    qrd.updateScore(user.id, sliderVal);
    setJustRated(true);
    onRefresh();
  };

  return (
    <div className="glass rounded-xl p-4">
      {/* 标题行 + 平均分统计 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-white/70 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-accent" /> 推荐指数
        </span>
        <div className="flex items-center gap-2">
          {ratingCount > 0 && (
            <span className="text-xs text-white/40">{ratingCount}人评</span>
          )}
          {avgScore > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-star fill-star" />
              <span className={`font-bold ${avgScore >= 4 ? 'text-green-400' : avgScore >= 3 ? 'text-yellow-400' : avgScore >= 2 ? 'text-orange-400' : 'text-red-400'}`}>
                {avgScore.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 滑块 */}
      <div className="relative mb-2">
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
        <span className="text-xs text-white/25">不推荐</span>
        {user ? (
          <span className={`text-xs ${justRated ? getScoreColor(sliderVal) : 'text-white/25'} transition-colors`}>
            {justRated ? `${getScoreLabel(sliderVal)} ${sliderVal.toFixed(1)}` : '拖动评分'}
          </span>
        ) : (
          <span className="text-xs text-primary/70">登录后可评分</span>
        )}
        <span className="text-xs text-white/25">超推荐</span>
      </div>
    </div>
  );
}

// 详情页评价摘要 - 大众点评风格
function ReviewSummary({ planId, getQuickRatingData, getReviewData }) {
  const qrd = getQuickRatingData(planId);
  const reviewData = getReviewData(planId);

  const avgScore = qrd.getAverage();
  const ratingCount = qrd.getRatingCount();
  const reviewCount = reviewData.reviews.length;

  // 评分分布统计
  const allQuickRatings = JSON.parse(localStorage.getItem('tb_quick_ratings') || '{}');
  const planRatings = allQuickRatings[planId] || {};
  const scoreValues = Object.values(planRatings);

  const scoreDistribution = [5, 4, 3, 2, 1].map(score => {
    const count = scoreValues.filter(v => Math.round(v) === score).length;
    return { score, count, percent: scoreValues.length > 0 ? (count / scoreValues.length) * 100 : 0 };
  });

  // 评价摘要（取最新3条点评的前20字）
  const recentReviews = [...reviewData.reviews]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 3);

  if (ratingCount === 0 && reviewCount === 0) return null;

  return (
    <div className="glass rounded-xl p-4 sm:p-5">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-white/90 flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-accent" /> 已收到的评价
        </span>
        <span className="text-xs text-white/30">
          {ratingCount}人评分{reviewCount > 0 ? ` · ${reviewCount}条点评` : ''}
        </span>
      </div>

      <div className="flex gap-5">
        {/* 左侧：大分数 */}
        <div className="flex flex-col items-center justify-center flex-shrink-0 min-w-[70px]">
          <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
            {avgScore > 0 ? avgScore.toFixed(1) : '-'}
          </div>
          <div className="flex items-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map(s => (
              <Star
                key={s}
                className={`w-3 h-3 ${s <= Math.round(avgScore) ? 'text-star fill-star' : 'text-white/15'}`}
              />
            ))}
          </div>
          <span className="text-xs text-white/30 mt-1">{ratingCount}人评</span>
        </div>

        {/* 右侧：评分分布 */}
        <div className="flex-1 space-y-1.5">
          {scoreDistribution.map(({ score, count, percent }) => (
            <div key={score} className="flex items-center gap-2">
              <span className="text-xs text-white/40 w-4 text-right flex-shrink-0">{score}</span>
              <div className="flex-1 h-[6px] bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(percent, count > 0 ? 4 : 0)}%`,
                    background: score >= 4 ? 'linear-gradient(90deg, #667EEA, #A78BFA)'
                      : score === 3 ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                      : 'linear-gradient(90deg, #EF4444, #F87171)',
                  }}
                />
              </div>
              <span className="text-xs text-white/25 w-5 text-right flex-shrink-0">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 最新点评摘要 */}
      {recentReviews.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-medium text-white/50">最新点评</span>
          </div>
          {recentReviews.map((review, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <img src={review.userAvatar} alt={review.userName} className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
              <p className="text-xs text-white/40 leading-relaxed">
                <span className="text-white/60 font-medium">{review.userName}</span>
                {'：'}{review.content.length > 30 ? review.content.slice(0, 30) + '...' : review.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
