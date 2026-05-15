import { useState, useEffect, useCallback } from 'react';

// localStorage keys
const KEYS = {
  USER: 'tb_user',
  RATINGS: 'tb_ratings',
  REVIEWS: 'tb_reviews',
  VOTES: 'tb_votes',
};

// 头像 URL 生成（统一 lorelei 风格）
export function getAvatarUrl(seed) {
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(seed)}`;
}

// 初始化 localStorage 数据
function initStorage() {
  if (!localStorage.getItem(KEYS.RATINGS)) {
    localStorage.setItem(KEYS.RATINGS, JSON.stringify({}));
  }
  if (!localStorage.getItem(KEYS.REVIEWS)) {
    localStorage.setItem(KEYS.REVIEWS, JSON.stringify({}));
  }
  if (!localStorage.getItem(KEYS.VOTES)) {
    localStorage.setItem(KEYS.VOTES, JSON.stringify({}));
  }
  // 迁移旧版 fun-emoji 头像 → lorelei
  const savedUser = localStorage.getItem(KEYS.USER);
  if (savedUser) {
    const user = JSON.parse(savedUser);
    if (user.avatar && user.avatar.includes('fun-emoji')) {
      user.avatar = getAvatarUrl(user.id);
      localStorage.setItem(KEYS.USER, JSON.stringify(user));
    }
  }
}

initStorage();

// 用户状态 hook
export function useUser() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(KEYS.USER);
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback((userData) => {
    localStorage.setItem(KEYS.USER, JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(KEYS.USER);
    setUser(null);
  }, []);

  return { user, login, logout };
}

// 评分 hook
export function useRatings(planId) {
  const [ratings, setRatings] = useState(() => {
    const all = JSON.parse(localStorage.getItem(KEYS.RATINGS) || '{}');
    return all[planId] || {};
  });

  const updateRating = useCallback((userId, scores) => {
    setRatings(prev => {
      const all = JSON.parse(localStorage.getItem(KEYS.RATINGS) || '{}');
      all[planId] = { ...all[planId], [userId]: scores };
      localStorage.setItem(KEYS.RATINGS, JSON.stringify(all));
      return all[planId];
    });
  }, [planId]);

  const getUserRating = useCallback((userId) => {
    return ratings[userId] || null;
  }, [ratings]);

  const getAverage = useCallback(() => {
    const values = Object.values(ratings);
    if (values.length === 0) return 0;
    const dims = Object.keys(values[0]);
    const dimAvgs = dims.map(dim => {
      const sum = values.reduce((s, v) => s + (v[dim] || 0), 0);
      return sum / values.length;
    });
    return dimAvgs.reduce((s, v) => s + v, 0) / dimAvgs.length;
  }, [ratings]);

  const getDimensionAverage = useCallback((dimKey) => {
    const values = Object.values(ratings);
    if (values.length === 0) return 0;
    const sum = values.reduce((s, v) => s + (v[dimKey] || 0), 0);
    return sum / values.length;
  }, [ratings]);

  const getRatingCount = useCallback(() => {
    return Object.keys(ratings).length;
  }, [ratings]);

  return { ratings, updateRating, getUserRating, getAverage, getDimensionAverage, getRatingCount };
}

// 点评 hook
export function useReviews(planId) {
  const [reviews, setReviews] = useState(() => {
    const all = JSON.parse(localStorage.getItem(KEYS.REVIEWS) || '{}');
    return all[planId] || [];
  });

  const addReview = useCallback((userId, userName, userAvatar, content) => {
    setReviews(prev => {
      const all = JSON.parse(localStorage.getItem(KEYS.REVIEWS) || '{}');
      const existing = all[planId] || [];
      const idx = existing.findIndex(r => r.userId === userId);
      const newReview = {
        userId,
        userName,
        userAvatar,
        content,
        updatedAt: new Date().toISOString(),
      };
      if (idx >= 0) {
        existing[idx] = newReview;
      } else {
        newReview.createdAt = new Date().toISOString();
        existing.push(newReview);
      }
      all[planId] = existing;
      localStorage.setItem(KEYS.REVIEWS, JSON.stringify(all));
      return [...existing];
    });
  }, [planId]);

  const getUserReview = useCallback((userId) => {
    return reviews.find(r => r.userId === userId) || null;
  }, [reviews]);

  return { reviews, addReview, getUserReview };
}

// 投票 hook
export function useVotes() {
  const [votes, setVotes] = useState(() => {
    return JSON.parse(localStorage.getItem(KEYS.VOTES) || '{}');
  });

  const vote = useCallback((userId, planId) => {
    setVotes(prev => {
      // 移除之前的投票（改投）
      const newVotes = { ...prev };
      Object.keys(newVotes).forEach(key => {
        if (newVotes[key] === planId) delete newVotes[key];
      });
      // 找到并移除用户之前的投票
      for (const [key, val] of Object.entries(newVotes)) {
        if (val === userId) {
          delete newVotes[key];
          break;
        }
      }
      // 实际上投票是 userId -> planId 的映射
      const allVotes = {};
      const stored = JSON.parse(localStorage.getItem(KEYS.VOTES) || '{}');
      // stored 格式: { userId: planId }
      // 先清除该用户的旧投票
      delete stored[userId];
      // 添加新投票
      stored[userId] = planId;
      localStorage.setItem(KEYS.VOTES, JSON.stringify(stored));
      return { ...stored };
    });
  }, []);

  const getUserVote = useCallback((userId) => {
    return votes[userId] || null;
  }, [votes]);

  const getVoteCount = useCallback((planId) => {
    return Object.values(votes).filter(v => v === planId).length;
  }, [votes]);

  const getTotalVotes = useCallback(() => {
    return Object.keys(votes).length;
  }, [votes]);

  const getVoteResults = useCallback(() => {
    const results = {};
    Object.entries(votes).forEach(([userId, planId]) => {
      results[planId] = (results[planId] || 0) + 1;
    });
    return results;
  }, [votes]);

  return { votes, vote, getUserVote, getVoteCount, getTotalVotes, getVoteResults };
}

// 获取所有方案评分的 hook（用于排名）
export function useAllRatings() {
  const getAllAverages = useCallback(() => {
    const all = JSON.parse(localStorage.getItem(KEYS.RATINGS) || '{}');
    const results = {};
    Object.entries(all).forEach(([planId, userRatings]) => {
      const values = Object.values(userRatings);
      if (values.length > 0) {
        const dims = Object.keys(values[0]);
        const dimAvgs = dims.map(dim => {
          const sum = values.reduce((s, v) => s + (v[dim] || 0), 0);
          return sum / values.length;
        });
        results[planId] = dimAvgs.reduce((s, v) => s + v, 0) / dimAvgs.length;
      }
    });
    return results;
  }, []);

  return { getAllAverages };
}
