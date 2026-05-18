import { useState } from 'react';
import StarRating from './StarRating';
import { ratingDimensions } from '../data/plans';

export default function RatingSection({ user, planId, getUserRating, updateRating, getUserReview, addReview, reviews }) {
  const existingRating = getUserRating(user?.id);
  const [scores, setScores] = useState(existingRating || {
    creativity: 0, feasibility: 0, cohesion: 0, costEffectiveness: 0, fun: 0,
  });
  const existingReview = getUserReview(user?.id);
  const [reviewText, setReviewText] = useState(existingReview?.content || '');
  const [submitted, setSubmitted] = useState(!!existingRating);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!user) {
    return (
      <div className="card p-5 text-center">
        <p className="text-primary font-medium">登录后即可评分和点评</p>
      </div>
    );
  }

  const handleSubmit = () => {
    const hasRating = Object.values(scores).some(v => v > 0);
    if (!hasRating && !reviewText.trim()) return;

    if (hasRating) {
      updateRating(user.id, scores);
    }
    if (reviewText.trim()) {
      addReview(user.id, user.name, user.avatar, reviewText.trim());
    }
    setSubmitted(true);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleModify = () => {
    setSubmitted(false);
  };

  return (
    <div className="space-y-4">
      {/* 成功提示 */}
      {showSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-white px-6 py-3 rounded-full shadow-lg font-medium text-sm">
          提交成功！
        </div>
      )}

      {/* 评分区域 */}
      {!submitted ? (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-text-primary mb-4">为这个方案打分</h3>
          <div className="space-y-3">
            {ratingDimensions.map(dim => (
              <div key={dim.key} className="flex items-center justify-between">
                <span className="text-text-secondary text-sm min-w-[100px]">
                  {dim.icon} {dim.label}
                </span>
                <StarRating
                  value={scores[dim.key]}
                  onChange={val => setScores(prev => ({ ...prev, [dim.key]: val }))}
                  size="md"
                />
              </div>
            ))}
          </div>

          {/* 文字点评 */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-text-secondary mb-2">写点什么吧</h4>
            <textarea
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="分享你对这个方案的看法..."
              className="input-clean w-full px-4 py-3 rounded-lg text-sm resize-none"
              rows={3}
            />
          </div>

          <button
            onClick={handleSubmit}
            className="mt-4 w-full py-2.5 btn-primary text-sm font-bold rounded-lg"
          >
            提交评分
          </button>
        </div>
      ) : (
        <div className="card p-5 border border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-text-primary">我的评分</h3>
            <button
              onClick={handleModify}
              className="text-sm text-primary hover:text-primary-dark font-medium transition"
            >
              修改
            </button>
          </div>
          <div className="space-y-2">
            {ratingDimensions.map(dim => (
              <div key={dim.key} className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">{dim.icon} {dim.label}</span>
                <StarRating value={scores[dim.key]} readOnly size="sm" />
              </div>
            ))}
          </div>
          {reviewText && (
            <div className="mt-3 pt-3 border-t border-[#F0F0F0]">
              <p className="text-text-secondary text-sm">{reviewText}</p>
            </div>
          )}
        </div>
      )}

      {/* 点评列表 */}
      {reviews.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-text-primary">大家怎么说</h3>
          {reviews.map((review, idx) => (
            <div key={idx} className="card card-hover p-4">
              <div className="flex items-center gap-3 mb-2">
                <img src={review.userAvatar} alt={review.userName} className="w-7 h-7 rounded-full" />
                <span className="font-medium text-text-primary text-sm">{review.userName}</span>
                <span className="text-[11px] text-text-light ml-auto">
                  {new Date(review.updatedAt || review.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed">{review.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
