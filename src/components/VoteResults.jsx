import { useMemo } from 'react';
import { BarChart3, Star, Trophy, Medal, Award } from 'lucide-react';

export default function VoteResults({ plans, getVoteCount, getTotalVotes, votes, refreshKey }) {
  const totalVotes = getTotalVotes();
  const voteResults = {};

  plans.forEach(plan => {
    voteResults[plan.id] = getVoteCount(plan.id);
  });

  // 获取评分排名（读取滑块推荐指数 tb_quick_ratings）
  // refreshKey 变化时重新计算，确保滑块评分后排名立即更新
  const ratingRanking = useMemo(() => {
    const allQuickRatings = JSON.parse(localStorage.getItem('tb_quick_ratings') || '{}');
    return plans.map(plan => {
      const planData = allQuickRatings[plan.id] || {};
      const values = Object.values(planData);
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      return { ...plan, avgRating: avg, ratingCount: values.length };
    }).sort((a, b) => b.avgRating - a.avgRating);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, refreshKey]);

  // 投票排名
  const voteRanking = plans.map(plan => ({
    ...plan,
    voteCount: voteResults[plan.id] || 0,
    votePercent: totalVotes > 0 ? ((voteResults[plan.id] || 0) / totalVotes * 100) : 0,
  })).sort((a, b) => b.voteCount - a.voteCount);

  const maxVotes = voteRanking[0]?.voteCount || 0;

  return (
    <div className="space-y-8">
      {/* 投票进度 - Glass */}
      <div className="btn-glass rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm">投票人数</p>
            <p className="text-3xl font-bold mt-1">{totalVotes}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-sm">参与方案数</p>
            <p className="text-3xl font-bold mt-1">{plans.length}</p>
          </div>
        </div>
        {totalVotes > 0 && (
          <div className="mt-3 bg-white/20 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-500"
              style={{ width: `${Math.min(totalVotes / plans.length / 3 * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* 投票柱状图 */}
      <div>
        <h3 className="text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent" /> 投票排行
        </h3>
        <div className="glass rounded-xl p-5 space-y-4">
          {voteRanking.map((plan, idx) => (
            <div key={plan.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {idx === 0 && maxVotes > 0 && (
                    <span className="bg-accent/20 text-accent text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> 领先
                    </span>
                  )}
                  <span className="font-medium text-white/80 text-sm truncate max-w-[200px] sm:max-w-none">{plan.name}</span>
                </div>
                <span className="text-sm font-bold text-white/90">
                  {plan.voteCount} 票
                  {plan.votePercent > 0 && (
                    <span className="text-white/40 font-normal ml-1">({plan.votePercent.toFixed(1)}%)</span>
                  )}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-4 sm:h-6 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2 ${
                    idx === 0 && maxVotes > 0
                      ? 'bg-gradient-to-r from-primary to-secondary'
                      : 'bg-gradient-to-r from-primary/50 to-secondary/50'
                  }`}
                  style={{ width: `${totalVotes > 0 ? Math.max(plan.votePercent, plan.voteCount > 0 ? 8 : 0) : 0}%` }}
                >
                  {plan.votePercent >= 15 && (
                    <span className="text-xs font-bold text-white">{plan.votePercent.toFixed(0)}%</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {totalVotes === 0 && (
            <p className="text-center text-white/30 py-4">暂无投票数据</p>
          )}
        </div>
      </div>

      {/* 评分排名 */}
      <div>
        <h3 className="text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-accent" /> 评分排行
        </h3>
        <div className="glass rounded-xl overflow-hidden">
          {ratingRanking.map((plan, idx) => (
            <div
              key={plan.id}
              className={`flex items-center gap-4 p-4 ${idx > 0 ? 'border-t border-white/5' : ''} ${
                idx === 0 && plan.avgRating > 0 ? 'bg-accent/5' : ''
              }`}
            >
              <span className="text-2xl font-bold w-8 text-center">
                {idx === 0 && plan.avgRating > 0 ? (
                  <Award className="w-7 h-7 text-amber-400 mx-auto" />
                ) : idx === 1 && plan.avgRating > 0 ? (
                  <Medal className="w-6 h-6 text-gray-300 mx-auto" />
                ) : idx === 2 && plan.avgRating > 0 ? (
                  <Medal className="w-6 h-6 text-amber-600 mx-auto" />
                ) : (
                  <span className="text-white/40">{idx + 1}</span>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white/80 text-sm truncate">{plan.name}</p>
                <p className="text-xs text-white/30">{plan.ratingCount} 人评</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-star fill-star" />
                <span className="font-bold text-lg text-white/90">{plan.avgRating > 0 ? plan.avgRating.toFixed(1) : '-'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
