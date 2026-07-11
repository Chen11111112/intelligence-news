import { getSelectableTag } from '@/lib/tags';

const copy = {
  nav: { explore: 'Explore', channel: 'Channel', words: 'Words', profile: 'Profile', notifications: 'Notifications' },
  brand: { title: 'Intelligence', accent: 'News' },
  explore: {
    topicsTitle: '探索主題',
    latestTitle: '最新資訊',
    noTags: '尚未選擇新聞標籤，請至個人設定選擇你想追蹤的分類。',
    goProfile: '前往設定',
    emptyNews: '所選標籤目前沒有新聞。請在個人設定確認標籤後執行爬蟲更新。',
    tapExplore: '點擊探索 →',
    selectedTags: '已選標籤',
    adjust: '調整',
    backHome: '返回探索首頁',
    articleCount: '共 {count} 則即時新聞',
    crawlNote: '資料由爬蟲依你的標籤設定每小時更新',
    topicEmpty: '{tag} 目前沒有新聞，請確認標籤後執行爬蟲。',
  },
  topic: {
    locked: '{tag} 未解鎖',
    lockedDesc: '此標籤不在你的設定中。最多可選 {max} 個標籤。',
    manageTags: '管理標籤設定',
  },
  words: { title: '我的收藏', subtitle: '共 {count} 篇', empty: '尚未收藏任何文章。', goExplore: '前往探索新聞 →' },
  channel: {
    title: '學習頻道',
    subtitle: '從收藏文章中選擇一篇，用文字或麥克風與 AI 討論內容；口說時 AI 會糾正文法與表達。',
    empty: '尚未收藏任何文章，請先收藏後再來討論。',
    goExplore: '前往探索新聞 →',
    pickArticle: '我的收藏 · {count} 篇',
    bookmarked: '已收藏',
    discuss: '與 AI 討論',
    selectPrompt: '請選擇左側收藏文章開始對話',
    chatHint: '用英文分享你對這篇新聞的看法，AI 會依你的考試目標回覆。',
    oralHint: '點麥克風用英文口說，AI 會糾正錯誤並繼續對話。',
    inputPlaceholder: '輸入英文訊息…',
    thinking: 'AI 思考中…',
    oralCorrections: '口說糾正',
    suggested: '建議說法',
    startMic: '開始語音輸入',
    stopMic: '停止錄音',
    micUnsupported: '此瀏覽器不支援語音辨識，請改用 Chrome 或 Edge。',
    micDenied: '請允許麥克風權限後再試。',
    micError: '語音辨識失敗，請再試一次。',
    muteTts: '關閉語音朗讀',
    enableTts: '開啟語音朗讀',
    closeChat: '關閉對話',
    readFull: '閱讀全文',
    examLevel: '{exam} {score}',
    aiLimit: '今日 AI 額度已用完',
    sendFailed: '傳送失敗，請稍後再試',
    oralFailed: '口說分析失敗，請稍後再試',
  },
  notifications: {
    title: '通知',
    empty: '目前沒有通知',
    markAllRead: '全部標為已讀',
    newArticle: '爬蟲已更新新聞',
    newArticles: '有 {count} 篇新文章符合你的標籤',
    view: '查看',
  },
  common: { loading: '載入中…', back: '返回', save: '儲存' },
  ai: {
    loginRequired: '請先登入帳號以使用 AI 功能！',
    loginAction: '前往登入',
  },
  profile: {
    loading: '載入個人設定中…',
    tags: '新聞分類偏好',
    tagsDesc: '每小時依你所選標籤更新新聞（已選 {current}/{max}）',
    exam: '英文程度設定',
    examTap: '點擊設定',
    examCurrent: '目前目標：{exam} {score}。點擊「點擊設定」調整。',
    usageLimits: '每日 AI {ai} 篇 · 最多 {tags} 個標籤',
    saveAll: '儲存所有設定',
    saved: '設定已成功儲存！',
    member: '{exam} {score} 學習者',
    allTags: '所有新聞種類標籤',
    selectScore: '設定你的目標分數',
    aiHint: '設定儲存後，AI 將依 {exam} {score} 生成摘要與測驗。每日限 {limit} 篇文章。',
    crawlSynced: '已同步爬蟲設定，將每小時自動更新所選標籤新聞。',
    crawlSyncFailed: '爬蟲設定已儲存，但即時抓取失敗，請稍後執行 npm run crawl。',
    needTag: '請至少選擇一個新聞標籤。',
    noTagsYet: '尚未選擇任何標籤',
    noTagsProfile: '尚未設定追蹤標籤',
  },
  article: {
    notFound: '找不到文章',
    back: '返回',
    aiSummary: 'AI 學習摘要',
    getSummary: '取得 AI 摘要',
    generating: '正在生成摘要…',
    cached: '已載入先前儲存的 AI 摘要',
    examTarget: '測驗目標',
    regenerate: '重新生成',
    quiz: '字彙測驗',
    source: '出處',
    original: '原文連結',
    loadingBody: '正在載入全文…',
  },
} as const;

function getByPath(path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = copy;
  for (const part of parts) {
    if (!cur || typeof cur !== 'object' || !(part in cur)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  let text = getByPath(key) ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
}

export function tagLabel(slug: string): string {
  return getSelectableTag(slug)?.zh ?? slug;
}

/** 將瀏覽器語音辨識錯誤碼轉為繁體中文 */
export function speechErrorLabel(code: string, tFn: typeof t = t): string {
  switch (code) {
    case 'SPEECH_NOT_SUPPORTED':
    case 'service-not-allowed':
      return tFn('channel.micUnsupported');
    case 'not-allowed':
    case 'permission-denied':
      return tFn('channel.micDenied');
    case 'no-speech':
      return '未偵測到語音，請再試一次';
    case 'audio-capture':
      return '無法擷取音訊，請確認麥克風裝置';
    case 'network':
      return '網路異常，語音辨識失敗';
    case 'aborted':
      return '語音辨識已取消';
    default:
      return tFn('channel.micError');
  }
}
