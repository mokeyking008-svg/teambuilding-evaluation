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

// 数据版本号，新增字段后递增以触发迁移
const PLANS_VERSION_KEY = 'tb_plans_version';
const PLANS_DATA_VERSION = 2;

// 获取方案列表（优先 localStorage，回退到默认，自动补齐新增字段）
function loadPlans() {
  const stored = localStorage.getItem(PLANS_KEY);
  const savedVersion = parseInt(localStorage.getItem(PLANS_VERSION_KEY) || '1', 10);

  if (stored && savedVersion >= PLANS_DATA_VERSION) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) { /* ignore */ }
  }

  // 有旧数据但版本落后 → 合并迁移：保留用户可能修改的字段，补齐新增结构化字段
  if (stored && savedVersion < PLANS_DATA_VERSION) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const migrated = parsed.map(saved => {
          const template = defaultPlans.find(d => d.id === saved.id);
          if (!template) return saved; // 已删除的方案保留原样
          return {
            ...template,            // 以默认数据为基底（包含所有最新字段）
            ...saved,               // 用户自定义字段覆盖（如 name、cover 等）
            // 确保结构化字段来自最新默认数据
            itinerary: template.itinerary,
            budgetBreakdown: template.budgetBreakdown,
            highlights: template.highlights,
          };
        });
        localStorage.setItem(PLANS_KEY, JSON.stringify(migrated));
        localStorage.setItem(PLANS_VERSION_KEY, String(PLANS_DATA_VERSION));
        return migrated;
      }
    } catch (e) { /* ignore */ }
  }

  // 首次访问，初始化默认方案到 localStorage
  localStorage.setItem(PLANS_KEY, JSON.stringify(defaultPlans));
  localStorage.setItem(PLANS_VERSION_KEY, String(PLANS_DATA_VERSION));
  return defaultPlans;
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
    // 时长：包含匹配（"全天" 匹配 "1天"，"2天" 匹配 "2天1夜"）
    if (filterDuration !== 'all') {
      const d = (plan.duration || '').replace(/\s/g, '');
      if (filterDuration === '0.5天') {
        if (!d.includes('0.5') && !d.includes('半天')) return false;
      } else if (filterDuration === '全天') {
        if (!d.includes('1天') && d.includes('2天')) return false;
      } else if (filterDuration === '2天') {
        if (!d.includes('2天')) return false;
      }
    }
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
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 顶部导航 - 白色实心 */}
      <header className="sticky top-0 z-40 nav-bar">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Tent className="w-5 h-5 text-primary" />
            <h1 className="text-base font-bold text-text-primary hidden sm:block">
              团建方案投票
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 管理按钮 */}
            <button
              onClick={() => setShowAdmin(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-text-light hover:text-text-primary text-sm rounded-lg transition"
              title="管理方案"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">管理</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary hidden sm:inline">{user.name}</span>
                <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full" />
                <button onClick={logout} className="text-xs text-text-light hover:text-text-secondary transition ml-1">退出</button>
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="btn-primary flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-full"
              >
                <LogIn className="w-3.5 h-3.5" />
                登录
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5">
        {/* 投票进度 - 白色卡片 */}
        <div className="mb-5 card p-4">
          <div className="flex items-center gap-3">
            <Vote className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-text-secondary">
                共 <span className="text-primary font-bold text-lg">{totalVotes}</span><span className="text-text-light">/{ALLOWED_NAMES.length}</span> 人参与投票
              </p>
            </div>
            <span className="text-xl font-bold text-primary">
              {ALLOWED_NAMES.length > 0 ? Math.round((totalVotes / ALLOWED_NAMES.length) * 100) : 0}%
            </span>
          </div>
          {/* 进度条 */}
          <div className="mt-3 h-1.5 bg-[#E8E8E8] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out bg-primary"
              style={{
                width: `${ALLOWED_NAMES.length > 0 ? Math.min((totalVotes / ALLOWED_NAMES.length) * 100, 100) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* 筛选栏 - 横向 Tab 风格 */}
        <div className="mb-5 space-y-3">
          <div className="flex gap-2 items-center overflow-x-auto pb-1">
            <span className="text-xs text-text-light flex-shrink-0">预算：</span>
            {[
              { key: 'all', label: '全部' },
              { key: '0-200', label: '0～200' },
              { key: '200-300', label: '200～300' },
              { key: '300+', label: '300+' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setFilterBudget(item.key)}
                className={`filter-btn px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  filterBudget === item.key
                    ? 'btn-primary text-white'
                    : 'tag-clean'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center overflow-x-auto pb-1">
            <span className="text-xs text-text-light flex-shrink-0">时长：</span>
            {[
              { key: 'all', label: '全部' },
              { key: '0.5天', label: '0.5天' },
              { key: '全天', label: '全天' },
              { key: '2天', label: '2天' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setFilterDuration(item.key)}
                className={`filter-btn px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  filterDuration === item.key
                    ? 'btn-primary text-white'
                    : 'tag-clean'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 方案卡片列表 */}
        {filteredPlans.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {filteredPlans.map(plan => {
              const qrd = getQuickRatingData(plan.id);
              const avgScore = qrd.getAverage();
              const userVoted = getUserVote(user?.id);
              const isVotedByMe = userVoted === plan.id;

              return (
                <div
                  key={plan.id}
                  className="plan-card card overflow-hidden cursor-pointer"
                  onClick={() => toggleDetail(plan.id)}
                >
                  {/* 封面 + 标题 + 角标 */}
                  <div className="relative h-36 overflow-hidden">
                    <img src={plan.cover} alt={plan.name} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute bottom-2.5 left-3 right-3">
                      <h3 className="text-white font-bold text-sm leading-tight drop-shadow-sm">{plan.name}</h3>
                    </div>
                    {avgScore > 0 && (
                      <div className="absolute top-2.5 right-2.5 bg-white rounded-full px-2 py-0.5 flex items-center gap-0.5 shadow-sm">
                        <Star className="w-3 h-3 text-star fill-star" />
                        <span className="font-bold text-xs text-text-primary">{avgScore.toFixed(1)}</span>
                      </div>
                    )}
                    {isVotedByMe && (
                      <div className="absolute top-2.5 left-2.5 bg-primary text-white rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-0.5 shadow-sm">
                        <CheckCircle className="w-3 h-3" /> 已投
                      </div>
                    )}
                  </div>

                  {/* 信息标签 */}
                  <div className="p-3">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="tag-clean inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full">
                        <MapPin className="w-2.5 h-2.5" /> {plan.location}
                      </span>
                      <span className="tag-clean inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full">
                        <Clock className="w-2.5 h-2.5" /> {plan.duration}
                      </span>
                      <span className="tag-clean inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full">
                        <Coins className="w-2.5 h-2.5" /> ¥{plan.budgetNum}/人
                      </span>
                    </div>

                    {/* 投票按钮 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleVote(plan.id); }}
                      className={`w-full py-2 rounded-lg text-xs font-bold transition ${
                        isVotedByMe
                          ? 'bg-[#E8FFF0] text-primary border border-primary/20'
                          : 'btn-primary'
                      } ${voteAnimId === plan.id ? 'vote-pulse' : ''}`}
                    >
                      {isVotedByMe ? (
                        <span className="flex items-center justify-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> 已投</span>
                      ) : (
                        <span className="flex items-center justify-center gap-1"><ThumbsUp className="w-3.5 h-3.5" /> 投票</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <SearchX className="w-14 h-14 text-text-light mx-auto" />
            <p className="text-text-light mt-3">没有找到匹配的方案</p>
            <button onClick={() => { setFilterBudget('all'); setFilterDuration('all'); }} className="mt-2 text-primary hover:text-primary-dark text-sm font-medium transition">
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

      <footer className="text-center py-5 text-xs text-text-light">
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
    <div className="fixed inset-0 z-50 overflow-y-auto modal-overlay" onClick={onClose}>
      <div className="min-h-full flex items-start justify-center py-6 px-4" onClick={e => e.stopPropagation()}>
        <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl relative" ref={detailRef}>
          <div className="relative h-48 sm:h-56 overflow-hidden rounded-t-xl">
            <img src={plan.cover} alt={plan.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5">
              <h2 className="text-white font-bold text-xl sm:text-2xl mb-2 drop-shadow-sm">{plan.name}</h2>
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-black/20 backdrop-blur-sm text-white text-[11px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" /> {plan.location}
                </span>
                <span className="bg-black/20 backdrop-blur-sm text-white text-[11px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" /> {plan.duration}
                </span>
                <span className="bg-black/20 backdrop-blur-sm text-white text-[11px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                  <Coins className="w-2.5 h-2.5" /> ¥{plan.budgetNum}/人
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* 方案简介 */}
            <div>
              <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" /> 方案简介
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">{plan.summary}</p>
            </div>

            {/* 结构化详情：行程安排 / 预算明细 / 方案亮点 */}
            {plan.itinerary && (
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" /> 行程安排
                </h3>
                <div className="space-y-1.5">
                  {plan.itinerary.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <span className="text-[11px] font-mono text-primary bg-[#E8FFF0] px-2 py-0.5 rounded flex-shrink-0 mt-0.5 whitespace-nowrap">{item.time}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-text-primary">{item.title}</span>
                        <p className="text-xs text-text-light mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {plan.budgetBreakdown && plan.budgetBreakdown.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-primary" /> 预算明细
                </h3>
                <div className="card-static overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
                        <th className="text-left text-text-light font-medium px-3 py-2">项目</th>
                        <th className="text-right text-text-light font-medium px-3 py-2 w-16">总价</th>
                        <th className="text-right text-text-light font-medium px-3 py-2 w-16">人均</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.budgetBreakdown.map((row, idx) => (
                        <tr key={idx} className="border-b border-[#F5F5F5] last:border-0">
                          <td className="text-text-secondary px-3 py-2">{row.item}</td>
                          <td className="text-right text-text-light px-3 py-2">{row.cost}</td>
                          <td className="text-right text-text-primary font-medium px-3 py-2">{row.perPerson}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[#E5E5E5]">
                        <td className="text-text-primary font-bold px-3 py-2">合计</td>
                        <td className="text-right text-text-secondary px-3 py-2">
                          {plan.budgetBreakdown.reduce((s, r) => s + r.cost, 0)}
                        </td>
                        <td className="text-right text-primary font-bold px-3 py-2">
                          {plan.budgetBreakdown.reduce((s, r) => s + r.perPerson, 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {plan.highlights && plan.highlights.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> 方案亮点
                </h3>
                <div className="space-y-2">
                  {plan.highlights.map((h, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{idx + 1}</span>
                      <p className="text-sm text-text-secondary leading-relaxed">{h}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 兼容旧版 details 纯文本 */}
            {!plan.itinerary && plan.details && (
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" /> 方案介绍
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">{plan.details}</p>
              </div>
            )}

            {/* 标签 */}
            {plan.tags && plan.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {plan.tags.map(tag => (
                  <span key={tag} className="tag-clean text-xs px-2.5 py-1 rounded-full">#{tag}</span>
                ))}
              </div>
            )}

            {/* 已收到的评价 */}
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
              className={`w-full py-3.5 rounded-xl text-sm font-bold transition ${
                isVotedByMe
                  ? 'bg-[#E8FFF0] text-primary border border-primary/20'
                  : 'btn-primary'
              } ${voteAnimId === plan.id ? 'vote-pulse' : ''}`}
            >
              {isVotedByMe ? (
                <span className="flex items-center justify-center gap-1.5"><CheckCircle className="w-4 h-4" /> 已投（点击改投）</span>
              ) : (
                <span className="flex items-center justify-center gap-1.5"><ThumbsUp className="w-4 h-4" /> 投票</span>
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
    if (val < 2) return 'text-red-500';
    if (val < 3) return 'text-orange-500';
    if (val < 4) return 'text-yellow-500';
    return 'text-green-600';
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
    <div className="card p-4">
      {/* 标题行 + 平均分统计 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-text-primary flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> 推荐指数
        </span>
        <div className="flex items-center gap-2">
          {ratingCount > 0 && (
            <span className="text-[11px] text-text-light">{ratingCount}人评</span>
          )}
          {avgScore > 0 && (
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-star fill-star" />
              <span className={`font-bold text-sm ${avgScore >= 4 ? 'text-green-600' : avgScore >= 3 ? 'text-yellow-500' : avgScore >= 2 ? 'text-orange-500' : 'text-red-500'}`}>
                {avgScore.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 滑块 */}
      <div className="relative mb-2">
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 h-1 rounded-full pointer-events-none bg-primary"
          style={{ width: `${fillPercent}%` }}
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
        <span className="text-[11px] text-text-light">不推荐</span>
        {user ? (
          <span className={`text-[11px] ${justRated ? getScoreColor(sliderVal) : 'text-text-light'} transition-colors`}>
            {justRated ? `${getScoreLabel(sliderVal)} ${sliderVal.toFixed(1)}` : '拖动评分'}
          </span>
        ) : (
          <span className="text-[11px] text-text-light">登录后可评分</span>
        )}
        <span className="text-[11px] text-text-light">超推荐</span>
      </div>
    </div>
  );
}

// 详情页评价摘要
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
    <div className="card p-4">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-text-primary flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-primary" /> 已收到的评价
        </span>
        <span className="text-[11px] text-text-light">
          {ratingCount}人评分{reviewCount > 0 ? ` · ${reviewCount}条点评` : ''}
        </span>
      </div>

      <div className="flex gap-5">
        {/* 左侧：大分数 */}
        <div className="flex flex-col items-center justify-center flex-shrink-0 min-w-[60px]">
          <div className="text-3xl font-bold text-text-primary">
            {avgScore > 0 ? avgScore.toFixed(1) : '-'}
          </div>
          <div className="flex items-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map(s => (
              <Star
                key={s}
                className={`w-2.5 h-2.5 ${s <= Math.round(avgScore) ? 'text-star fill-star' : 'text-star-empty'}`}
              />
            ))}
          </div>
          <span className="text-[11px] text-text-light mt-1">{ratingCount}人评</span>
        </div>

        {/* 右侧：评分分布 */}
        <div className="flex-1 space-y-1.5">
          {scoreDistribution.map(({ score, count, percent }) => (
            <div key={score} className="flex items-center gap-2">
              <span className="text-[11px] text-text-light w-4 text-right flex-shrink-0">{score}</span>
              <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(percent, count > 0 ? 4 : 0)}%`,
                    background: score >= 4 ? '#31C27C'
                      : score === 3 ? '#F59E0B'
                      : '#EF4444',
                  }}
                />
              </div>
              <span className="text-[11px] text-text-light w-4 text-right flex-shrink-0">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 最新点评摘要 */}
      {recentReviews.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#F0F0F0] space-y-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span className="text-[11px] font-medium text-text-secondary">最新点评</span>
          </div>
          {recentReviews.map((review, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-white">{(review.userName || '?')[0]}</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                <span className="text-text-primary font-medium">{review.userName}</span>
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
