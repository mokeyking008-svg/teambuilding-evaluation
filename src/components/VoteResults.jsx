import { useRatings } from '../hooks/useStore';

export default function VoteResults({ plans, getVoteCount, getTotalVotes, votes }) {
  const totalVotes = getTotalVotes();
  const voteResults = {};

  plans.forEach(plan => {
    voteResults[plan.id] = getVoteCount(plan.id);
  });

  // 获取评分排名
  const allRatings = JSON.parse(localStorage.getItem('tb_ratings') || '{}');
  const ratingRanking = plans.map(plan => {
    const userRatings = allRatings[plan.id] || {};
    const values = Object.values(userRatings);
    let avg = 0;
    if (values.length > 0) {
      const dims = Object.keys(values[0]);
      const dimAvgs = dims.map(dim => {
        const sum = values.reduce((s, v) => s + (v[dim] || 0), 0);
        return sum / values.length;
      });
      avg = dimAvgs.reduce((s, v) => s + v, 0) / dimAvgs.length;
    }
    return { ...plan, avgRating: avg, ratingCount: values.length };
  }).sort((a, b) => b.avgRating - a.avgRating);

  // 投票排名
  const voteRanking = plans.map(plan => ({
    ...plan,
    voteCount: voteResults[plan.id] || 0,
    votePercent: totalVotes > 0 ? ((voteResults[plan.id] || 0) / totalVotes * 100) : 0,
  })).sort((a, b) => b.voteCount - a.voteCount);

  const maxVotes = voteRanking[0]?.voteCount || 0;

  return (
    <div className="space-y-8">
      {/* 投票进度 */}
      <div className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">参与投票人数</p>
            <p className="text-3xl font-bold mt-1">{totalVotes}</p>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-sm">参与方案数</p>
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
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-2xl">📊</span> 投票结果
        </h3>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
          {voteRanking.map((plan, idx) => (
            <div key={plan.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {idx === 0 && maxVotes > 0 && (
                    <span className="bg-accent text-xs font-bold px-2 py-0.5 rounded-full text-gray-800">👑 领先</span>
                  )}
                  <span className="font-medium text-gray-700 text-sm truncate max-w-[200px] sm:max-w-none">{plan.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-800">
                  {plan.voteCount} 票
                  {plan.votePercent > 0 && (
                    <span className="text-gray-400 font-normal ml-1">({plan.votePercent.toFixed(1)}%)</span>
                  )}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2 ${
                    idx === 0 && maxVotes > 0
                      ? 'bg-gradient-to-r from-primary to-primary-light'
                      : 'bg-gradient-to-r from-secondary to-secondary-light'
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
            <p className="text-center text-gray-400 py-4">暂无投票数据</p>
          )}
        </div>
      </div>

      {/* 评分排名 */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-2xl">⭐</span> 评分排名
        </h3>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {ratingRanking.map((plan, idx) => (
            <div
              key={plan.id}
              className={`flex items-center gap-4 p-4 ${idx > 0 ? 'border-t border-gray-50' : ''} ${
                idx === 0 && plan.avgRating > 0 ? 'bg-yellow-50/50' : ''
              }`}
            >
              <span className={`text-2xl font-bold w-8 text-center ${
                idx === 0 ? 'text-accent-dark' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-300' : 'text-gray-300'
              }`}>
                {idx === 0 && plan.avgRating > 0 ? '🥇' : idx === 1 && plan.avgRating > 0 ? '🥈' : idx === 2 && plan.avgRating > 0 ? '🥉' : `${idx + 1}`}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-700 text-sm truncate">{plan.name}</p>
                <p className="text-xs text-gray-400">{plan.ratingCount} 人评分</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg">⭐</span>
                <span className="font-bold text-lg text-gray-800">{plan.avgRating > 0 ? plan.avgRating.toFixed(1) : '-'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
