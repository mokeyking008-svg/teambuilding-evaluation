/**
 * GitHub API 数据同步服务
 *
 * 所有业务数据（方案、投票、评分、点评）统一存储在 repo 的 data/store.json 中。
 * - 公开仓库：读取无需 token；写入需要 Personal Access Token（repo 权限）
 * - token 通过环境变量 VITE_GH_TOKEN 在构建时注入，或运行时从管理面板配置
 * - 轮询间隔 15s，通过 version 字段检测变化
 */

// ====== 配置 ======
const REPO = 'mokeyking008-svg/tb';
const DATA_PATH = 'data/store.json';
const POLL_INTERVAL = 15_000; // 15 秒
const API_BASE = `https://api.github.com/repos/${REPO}/contents/${DATA_PATH}`;

// ====== Token 管理 ======
let _token = null;

export function setToken(token) {
  _token = token;
  localStorage.setItem('tb_gh_token', token);
}

export function getToken() {
  if (_token) return _token;
  // 运行时从 localStorage 读取（管理面板配置的 token）
  _token = localStorage.getItem('tb_gh_token') || '';
  return _token;
}

export function hasToken() {
  return !!getToken();
}

// ====== 数据结构 ======
// store.json 格式：
// {
//   version: 1,           // 每次写入递增，用于轮询检测变化
//   updatedAt: "ISO...",
//   plans: [...],         // 方案数据
//   votes: {},            // { userId: planId }
//   reviews: {},          // { planId: [{ userId, userName, userAvatar, content, createdAt, updatedAt }] }
//   quickRatings: {},     // { planId: { userId: score } }
// }

const LOCAL_CACHE_KEY = 'tb_remote_cache';
const LOCAL_VERSION_KEY = 'tb_remote_version';

/** 构建空 store */
export function createEmptyStore(plans) {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    plans: plans || [],
    votes: {},
    reviews: {},
    quickRatings: {},
  };
}

// ====== 核心 API 操作 ======

/** GitHub API 请求头 */
function headers(withAuth = false) {
  const h = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (withAuth) {
    const token = getToken();
    if (token) h.Authorization = `Bearer ${token}`;
  }
  return h;
}

/**
 * 从 GitHub 读取远程数据
 * @returns {{ store: object, sha: string } | null}
 */
export async function fetchRemoteData() {
  try {
    const res = await fetch(API_BASE, { headers: headers(false) });
    if (!res.ok) {
      if (res.status === 404) return null; // 文件不存在（首次使用）
      console.warn('[sync] fetch failed:', res.status);
      return null;
    }
    const data = await res.json();
    const content = JSON.parse(atob(data.content));
    return { store: content, sha: data.sha };
  } catch (e) {
    console.warn('[sync] fetch error:', e.message);
    return null;
  }
}

/**
 * 推送数据到 GitHub
 * @param {object} store - 完整的 store 对象
 * @param {string} [sha] - 当前文件的 SHA（用于更新）；不传则创建新文件
 * @returns {{ success: boolean, sha?: string, error?: string }}
 */
export async function pushRemoteData(store, sha) {
  const token = getToken();
  if (!token) {
    return { success: false, error: '未配置 GitHub Token' };
  }

  // 递增版本号
  store.version = (store.version || 0) + 1;
  store.updatedAt = new Date().toISOString();

  try {
    const body = {
      message: `update store v${store.version} - ${new Date().toLocaleString('zh-CN')}`,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(store, null, 2)))),
      sha: sha || undefined,
    };

    const res = await fetch(API_BASE, {
      method: 'PUT',
      headers: headers(true),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.message || `HTTP ${res.status}`;
      console.warn('[sync] push failed:', errMsg);
      return { success: false, error: errMsg };
    }

    const result = await res.json();
    // 缓存到本地
    cacheLocal(store);
    return { success: true, sha: result.content.sha };
  } catch (e) {
    console.warn('[sync] push error:', e.message);
    return { success: false, error: e.message };
  }
}

// ====== 本地缓存 ======

/** 缓存远程数据到 localStorage */
export function cacheLocal(store) {
  localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(store));
  localStorage.setItem(LOCAL_VERSION_KEY, String(store.version || 0));
}

/** 读取本地缓存 */
export function readLocalCache() {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** 读取本地缓存版本号 */
export function getLocalVersion() {
  return parseInt(localStorage.getItem(LOCAL_VERSION_KEY) || '0', 10);
}

// ====== 轮询 Hook ======

/**
 * 启动轮询，检测远程数据变化
 * @param {function} onUpdate - 检测到新版本时回调 (store) => void
 * @returns {{ start: () => void, stop: () => void }}
 */
export function usePolling(onUpdate) {
  let timer = null;
  let currentSha = null;

  const poll = async () => {
    const result = await fetchRemoteData();
    if (!result) return;

    const { store, sha } = result;
    currentSha = sha;

    const localVer = getLocalVersion();
    if (store.version > localVer) {
      cacheLocal(store);
      onUpdate(store);
    }
  };

  return {
    start: () => {
      stop();
      poll(); // 立即执行一次
      timer = setInterval(poll, POLL_INTERVAL);
    },
    stop: () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    getSha: () => currentSha,
  };
}

/**
 * 合并本地用户数据到远程 store
 * 用于：本地有投票/评分/点评，但远程还没有时，将本地数据合并后推送
 */
export function mergeLocalToStore(remoteStore) {
  const merged = { ...remoteStore };

  // 合并投票
  const localVotes = JSON.parse(localStorage.getItem('tb_votes') || '{}');
  if (Object.keys(localVotes).length > 0) {
    merged.votes = { ...(remoteStore.votes || {}), ...localVotes };
  }

  // 合并评分
  const localQuickRatings = JSON.parse(localStorage.getItem('tb_quick_ratings') || '{}');
  if (Object.keys(localQuickRatings).length > 0) {
    merged.quickRatings = { ...(remoteStore.quickRatings || {}) };
    for (const [planId, users] of Object.entries(localQuickRatings)) {
      if (!merged.quickRatings[planId]) merged.quickRatings[planId] = {};
      merged.quickRatings[planId] = { ...merged.quickRatings[planId], ...users };
    }
  }

  // 合并点评
  const localReviews = JSON.parse(localStorage.getItem('tb_reviews') || '{}');
  if (Object.keys(localReviews).length > 0) {
    merged.reviews = { ...(remoteStore.reviews || {}) };
    for (const [planId, list] of Object.entries(localReviews)) {
      if (!merged.reviews[planId]) merged.reviews[planId] = [];
      // 按 userId 去重合并
      const existingIds = new Set(merged.reviews[planId].map(r => r.userId));
      for (const review of list) {
        if (!existingIds.has(review.userId)) {
          merged.reviews[planId].push(review);
        }
      }
    }
  }

  return merged;
}
