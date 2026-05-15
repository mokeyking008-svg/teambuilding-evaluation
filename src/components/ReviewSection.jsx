import { useState, useCallback } from 'react';
import { MessageSquare, PenLine, Users, PartyPopper } from 'lucide-react';

// 带文字降级的头像组件
function Avatar({ src, name, size = 'w-8 h-8' }) {
  const [error, setError] = useState(false);
  const handleErr = useCallback(() => setError(true), []);
  const textClass = size === 'w-5 h-5' ? 'text-[10px]' : size === 'w-6 h-6' ? 'text-xs' : 'text-sm';
  return error || !src ? (
    <div className={`${size} rounded-full bg-gradient-to-br from-primary/60 to-accent/60 flex items-center justify-center flex-shrink-0`}>
      <span className={`${textClass} font-bold text-white`}>{(name || '?')[0]}</span>
    </div>
  ) : (
    <img src={src} alt={name} className={`${size} rounded-full flex-shrink-0`} onError={handleErr} />
  );
}

export default function ReviewSection({ user, planId, getUserReview, addReview, reviews }) {
  const existingReview = getUserReview(user?.id);
  const [reviewText, setReviewText] = useState(existingReview?.content || '');
  const [submitted, setSubmitted] = useState(!!existingReview);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!user) {
    return (
      <div className="glass rounded-xl p-5 text-center">
        <p className="text-primary font-medium flex items-center justify-center gap-1.5">
          <PartyPopper className="w-4 h-4" /> 登录后可点评
        </p>
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
          提交成功！
        </div>
      )}

      {/* 写点评 */}
      {!submitted ? (
        <div className="glass rounded-xl p-5">
          <h3 className="text-base font-bold text-text-primary mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> 写点评
          </h3>
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
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <PenLine className="w-4 h-4 text-primary" /> 我的点评
            </h3>
            <button
              onClick={handleModify}
              className="text-sm text-primary hover:text-primary-light font-medium transition"
            >
              修改
            </button>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed">{reviewText}</p>
        </div>
      )}

      {/* 点评列表 */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> 全部点评
          </h3>
          {reviews.map((review, idx) => (
            <div key={idx} className="glass glass-hover rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <Avatar src={review.userAvatar} name={review.userName} />
                <span className="font-medium text-text-primary text-sm">{review.userName}</span>
                <span className="text-xs text-text-light ml-auto">
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
