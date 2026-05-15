import { useState } from 'react';

export default function ReviewSection({ user, planId, getUserReview, addReview, reviews }) {
  const existingReview = getUserReview(user?.id);
  const [reviewText, setReviewText] = useState(existingReview?.content || '');
  const [submitted, setSubmitted] = useState(!!existingReview);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!user) {
    return (
      <div className="glass rounded-xl p-5 text-center">
        <p className="text-primary font-medium">🎉 登录后即可点评</p>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!reviewText.trim()) return;
    addReview(user.id, user.name, user.avatar, reviewText.trim());
    setSubmitted(true);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleModify = () => {
    setSubmitted(false);
  };

  return (
    <div className="space-y-5">
      {/* 成功提示 */}
      {showSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-success text-white px-6 py-3 rounded-full shadow-lg font-medium text-sm animate-bounce">
          ✓ 提交成功！
        </div>
      )}

      {/* 写点评 */}
      {!submitted ? (
        <div className="glass rounded-xl p-5">
          <h3 className="text-base font-bold text-white/90 mb-3">💬 写点什么吧</h3>
          <textarea
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            placeholder="分享你对这个方案的看法..."
            className="input-glass w-full px-4 py-3 rounded-xl text-sm resize-none"
            rows={3}
          />
          <button
            onClick={handleSubmit}
            className="mt-3 w-full py-3 btn-glass text-white font-bold rounded-xl shadow-lg"
          >
            提交点评
          </button>
        </div>
      ) : (
        <div className="glass rounded-xl p-5 border border-success/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-white/90">📝 我的点评</h3>
            <button
              onClick={handleModify}
              className="text-sm text-primary hover:text-primary-light font-medium transition"
            >
              修改
            </button>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">{reviewText}</p>
        </div>
      )}

      {/* 点评列表 */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-white/90">🗣️ 大家怎么说</h3>
          {reviews.map((review, idx) => (
            <div key={idx} className="glass glass-hover rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <img src={review.userAvatar} alt={review.userName} className="w-8 h-8 rounded-full" />
                <span className="font-medium text-white/80 text-sm">{review.userName}</span>
                <span className="text-xs text-white/30 ml-auto">
                  {new Date(review.updatedAt || review.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed">{review.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
