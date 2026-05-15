import { useState, useEffect, useRef } from 'react';
import { useUser, useVotes } from './hooks/useStore';
import defaultPlans from './data/plans';
import LoginModal from './components/LoginModal';
import ReviewSection from './components/ReviewSection';
import VoteResults from './components/VoteResults';
import AdminPanel from './components/AdminPanel';
import {
  Tent, Settings, LogIn, Vote, ChevronDown, SearchX,
  MapPin, Clock, Coins, Star, Trophy, X, FileText,
  Sparkles, CheckCircle, ThumbsUp,
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
            <Tent className="w-6 h-6 text-accent" />
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
        {/* 投票进度 - Glass */}
        {totalVotes > 0 && (
          <div className="mb-6 glass-solid rounded-2xl p-4 flex items-center gap-3">
            <Vote className="w-7 h-7 text-accent flex-shrink-0" />
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
            <Coins className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-white/50">人均预算：</span>
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
            <Clock className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-white/50">团建时长：</span>
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
                  className="plan-card glass rounded-2xl overflow-hidden"
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

                    {/* 底部双按钮 - 投票为主 CTA */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleDetail(plan.id)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition border border-white/10"
                      >
                        查看详情
                      </button>
                      <button
                        onClick={() => handleVote(plan.id)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
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
          <button
            onClick={() => setShowResults(!showResults)}
            className="w-full glass glass-hover rounded-2xl p-5 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-accent" />
              <div className="text-left">
                <h2 className="text-lg font-bold text-white/90 group-hover:text-white transition">查看投票结果</h2>
                <p className="text-sm text-white/40">票数统计与评分排名</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-white/40 transition-transform ${showResults ? 'rotate-180' : ''}`} />
          </button>
          {showResults && (
            <div className="mt-4">
              <VoteResults plans={plans} getVoteCount={getVoteCount} getTotalVotes={getTotalVotes} votes={votes} refreshKey={refreshKey} />
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
                <FileText className="w-4 h-4 text-accent" /> 方案详情
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
                <span className="flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" /> 已投票（点击改投其他方案）</span>
              ) : (
                <span className="flex items-center justify-center gap-2"><ThumbsUp className="w-5 h-5" /> 投票支持这个方案！</span>
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

export default App;
