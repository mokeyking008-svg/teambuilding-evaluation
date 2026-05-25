import { useState, useEffect, useCallback, useRef } from 'react';

// localStorage keys
const KEYS = {
  USER: 'tb_user',
  RATINGS: 'tb_ratings',
  REVIEWS: 'tb_reviews',
  VOTES: 'tb_votes',
  PLANS: 'tb_plans',
  USERS: 'tb_users',
  QUICK_RATINGS: 'tb_quick_ratings',
};

// 数据版本号 — 递增此版本号将清除所有用户的本地数据（投票/评分/点评/登录）
const DATA_VERSION = 3;
const DATA_VERSION_KEY = 'tb_data_version';

// 头像 URL 生成（统一 lorelei 风格）
export function getAvatarUrl(seed) {
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(seed)}`;
}

// 初始化 localStorage 数据
function initStorage() {
  const savedVersion = localStorage.getItem(DATA_VERSION_KEY);
  if (savedVersion !== String(DATA_VERSION)) {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
    localStorage.removeItem(DATA_VERSION_KEY);
  }
  localStorage.setItem(DATA_VERSION_KEY, String(DATA_VERSION));

  if (!localStorage.getItem(KEYS.RATINGS)) {
    localStorage.setItem(KEYS.RATINGS, JSON.stringify({}));
  }
  if (!localStorage.getItem(KEYS.REVIEWS)) {
    localStorage.setItem(KEYS.REVIEWS, JSON.stringify({}));
  }
  if (!localStorage.getItem(KEYS.VOTES)) {
    localStorage.setItem(KEYS.VOTES, JSON.stringify({}));
  }
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

// ====== 远程同步回调注册 ======
// 允许外部注入 pushRemoteData 函数（从 App 层传入）
let _pushRemote = null;
let _remoteStoreRef = null; // 指向最新的远程 store（含 sha）

export function setSyncFunctions(pushFn, storeRef) {
  _pushRemote = pushFn;
  _remoteStoreRef = storeRef;
}

// ====== 用户状态 hook ======
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

// ====== 投票 hook（支持远程同步） ======
export function useVotes() {
  const [votes, setVotes] = useState(() => {
    return JSON.parse(localStorage.getItem(KEYS.VOTES) || '{}');
  });

  // 从远程数据初始化（如果远程有更新）
  const initFromRemote = useCallback((remoteVotes) => {
    if (remoteVotes && Object.keys(remoteVotes).length >= 0) {
      setVotes({ ...remoteVotes });
      localStorage.setItem(KEYS.VOTES, JSON.stringify(remoteVotes));
    }
  }, []);

  const vote = useCallback((userId, planId) => {
    setVotes(prev => {
      const newVotes = { ...prev };
      delete newVotes[userId];
      newVotes[userId] = planId;
      localStorage.setItem(KEYS.VOTES, JSON.stringify(newVotes));

      // 异步推送到远程（不阻塞 UI）
      if (_pushRemote && _remoteStoreRef?.current) {
        const store = _remoteStoreRef.current;
        store.votes = { ...newVotes };
        _pushRemote(store, store._sha).catch(() => {});
      }

      return newVotes;
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

  return { votes, vote, getUserVote, getVoteCount, getTotalVotes, getVoteResults, initFromRemote };
}

// ====== 评分 hook（支持远程同步） ======
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

// ====== 点评 hook（支持远程同步） ======
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

      // 异步推送到远程
      if (_pushRemote && _remoteStoreRef?.current) {
        const store = _remoteStoreRef.current;
        store.reviews = { ...all };
        _pushRemote(store, store._sha).catch(() => {});
      }

      return [...existing];
    });
  }, [planId]);

  const getUserReview = useCallback((userId) => {
    return reviews.find(r => r.userId === userId) || null;
  }, [reviews]);

  return { reviews, addReview, getUserReview };
}

// ====== 获取所有方案评分的 hook ======
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
