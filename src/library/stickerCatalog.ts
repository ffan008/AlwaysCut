// Built-in sticker library (Pro "贴纸" category counterpart).
// Stickers are authored as inline SVG so they ship with the app and add as
// `svg` clips (data-URI src, kind='svg') without touching the media pool.
// Categories mirror Pro's sticker panel: 推荐(all) / 箭头 / 表情 / 气泡 / 形状 / 装饰.

export interface StickerDef {
  id: string;
  /** Localized label via the i18n `t()` helper (Chinese key stored here). */
  name: string;
  /** Category id, resolved against STICKER_CATEGORIES. */
  category: StickerCategoryId;
  /** Search keywords (Chinese + English) for the filter box. */
  keywords: string[];
  /** Inline SVG (viewBox 0 0 100 100, transparent background). */
  svg: string;
}

export interface StickerCategory {
  id: StickerCategoryId;
  name: string;
}

export type StickerCategoryId = 'arrow' | 'emoji' | 'bubble' | 'shape' | 'deco';

export const STICKER_CATEGORIES: StickerCategory[] = [
  { id: 'arrow', name: '箭头' },
  { id: 'emoji', name: '表情' },
  { id: 'bubble', name: '气泡' },
  { id: 'shape', name: '形状' },
  { id: 'deco', name: '装饰' },
];

const round = 'stroke-linecap="round" stroke-linejoin="round"';

export const STICKERS: StickerDef[] = [
  // ── 箭头 arrow ──
  {
    id: 'arrow-right',
    name: '右箭头',
    category: 'arrow',
    keywords: ['箭头', '指向', '向右', 'arrow', 'right', 'next'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#16a9f3"/><path d="M28 50h40M54 36l14 14-14 14" stroke="#fff" stroke-width="7" fill="none" ${round}/></svg>`,
  },
  {
    id: 'arrow-up',
    name: '上箭头',
    category: 'arrow',
    keywords: ['箭头', '向上', '上升', 'arrow', 'up'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#23d160"/><path d="M50 72V32M36 46l14-14 14 14" stroke="#fff" stroke-width="7" fill="none" ${round}/></svg>`,
  },
  {
    id: 'arrow-down',
    name: '下箭头',
    category: 'arrow',
    keywords: ['箭头', '向下', '下降', 'arrow', 'down'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#5b9dff"/><path d="M50 28v44M36 58l14 14 14-14" stroke="#fff" stroke-width="7" fill="none" ${round}/></svg>`,
  },
  {
    id: 'arrow-turn',
    name: '转弯箭头',
    category: 'arrow',
    keywords: ['箭头', '转弯', '返回', 'arrow', 'turn', 'back'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#ee8b4d"/><path d="M70 38H42a12 12 0 0 0-12 12v12M30 46l-12 12 12 12M30 50h28" stroke="#fff" stroke-width="7" fill="none" ${round}/></svg>`,
  },
  // ── 表情 emoji ──
  {
    id: 'smile',
    name: '笑脸',
    category: 'emoji',
    keywords: ['笑脸', '开心', '微笑', 'smile', 'happy', '哈哈'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#ffcf3f"/><circle cx="35" cy="40" r="5" fill="#4a2f00"/><circle cx="65" cy="40" r="5" fill="#4a2f00"/><path d="M32 60c6 9 30 9 36 0" stroke="#4a2f00" stroke-width="6" fill="none" ${round}/></svg>`,
  },
  {
    id: 'wow',
    name: '惊讶',
    category: 'emoji',
    keywords: ['惊讶', '震惊', '哇', 'wow', 'surprised'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#ffcf3f"/><circle cx="35" cy="40" r="6" fill="#4a2f00"/><circle cx="65" cy="40" r="6" fill="#4a2f00"/><ellipse cx="50" cy="62" rx="10" ry="13" fill="#4a2f00"/></svg>`,
  },
  {
    id: 'cool',
    name: '墨镜',
    category: 'emoji',
    keywords: ['墨镜', '酷', '帅', 'cool', 'sunglasses'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#ffcf3f"/><rect x="18" y="34" width="64" height="16" rx="4" fill="#262626"/><path d="M42 34v16M58 34v16" stroke="#262626" stroke-width="3"/><path d="M32 62c5 7 30 7 36 0" stroke="#4a2f00" stroke-width="6" fill="none" ${round}/></svg>`,
  },
  {
    id: 'love-eyes',
    name: '爱心眼',
    category: 'emoji',
    keywords: ['爱心', '喜欢', '心动', 'love', 'heart eyes'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#ffcf3f"/><path d="M35 34c-2-4-8-4-8 0s4 6 8 8c4-2 8-4 8-8s-6-4-8 0z" fill="#ef4343"/><path d="M65 34c-2-4-8-4-8 0s4 6 8 8c4-2 8-4 8-8s-6-4-8 0z" fill="#ef4343"/><path d="M34 62c6 7 26 7 32 0" stroke="#4a2f00" stroke-width="6" fill="none" ${round}/></svg>`,
  },
  {
    id: 'heart',
    name: '爱心',
    category: 'emoji',
    keywords: ['爱心', '喜欢', '红心', 'heart', 'love', 'like'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 84C28 66 12 50 12 34c0-12 9-20 19-20 6 0 12 3 19 11 7-8 13-11 19-11 10 0 19 8 19 20 0 16-16 32-38 50z" fill="#ef4343"/></svg>`,
  },
  {
    id: 'thumb',
    name: '点赞',
    category: 'emoji',
    keywords: ['点赞', '赞', '大拇指', 'like', 'thumb', 'good'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#16a9f3"/><path d="M42 44V34c0-4 3-8 7-8s6 4 6 8v18h14c3 0 5 2 5 5l-2 16a6 6 0 0 1-6 5H40l8-22c-4-3-6-7-6-12z" fill="#fff"/><rect x="26" y="46" width="12" height="22" rx="5" fill="#fff"/></svg>`,
  },
  // ── 气泡 bubble ──
  {
    id: 'speech',
    name: '对话气泡',
    category: 'bubble',
    keywords: ['气泡', '对话', '说话', 'speech', 'bubble', 'chat'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M16 20h68a8 8 0 0 1 8 8v40a8 8 0 0 1-8 8H50L30 92v-16h-14a8 8 0 0 1-8-8V28a8 8 0 0 1 8-8z" fill="#16a9f3"/><circle cx="34" cy="48" r="5" fill="#fff"/><circle cx="50" cy="48" r="5" fill="#fff"/><circle cx="66" cy="48" r="5" fill="#fff"/></svg>`,
  },
  {
    id: 'boom',
    name: '爆炸',
    category: 'bubble',
    keywords: ['爆炸', '爆', '冲击', 'boom', 'bang', 'pop'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 8l7 16 17 1-12 12 4 17-16-7-16 7 4-17L26 25l17-1z" fill="#ee8b4d"/><path d="M50 22l5 11 12 1-9 9 3 12-11-5-11 5 3-12-9-9 12-1z" fill="#ffcf3f"/></svg>`,
  },
  {
    id: 'thought',
    name: '思考',
    category: 'bubble',
    keywords: ['思考', '想法', '气泡', 'thought', 'idea'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><ellipse cx="50" cy="46" rx="38" ry="26" fill="#8b8dff"/><circle cx="34" cy="46" r="6" fill="#fff"/><circle cx="50" cy="46" r="6" fill="#fff"/><circle cx="66" cy="46" r="6" fill="#fff"/><circle cx="50" cy="80" r="7" fill="#8b8dff"/><circle cx="38" cy="92" r="4" fill="#8b8dff"/></svg>`,
  },
  // ── 形状 shape ──
  {
    id: 'star',
    name: '星星',
    category: 'shape',
    keywords: ['星星', '星', 'star', '五角星'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 8l12 30 32 3-24 22 7 32-27-18-27 18 7-32-24-22 32-3z" fill="#f0a04b"/></svg>`,
  },
  {
    id: 'badge',
    name: '徽章',
    category: 'shape',
    keywords: ['徽章', '标签', '奖章', 'badge', 'medal', 'tag'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 14l10 22 24 3-18 18 5 24-21-12-21 12 5-24-18-18 24-3z" fill="#ef4343"/><circle cx="50" cy="48" r="16" fill="#fff"/><path d="M40 48l7 7 13-14" stroke="#ef4343" stroke-width="5" fill="none" ${round}/></svg>`,
  },
  {
    id: 'circle-ring',
    name: '圆环',
    category: 'shape',
    keywords: ['圆环', '圆圈', '圆', 'circle', 'ring'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="36" fill="none" stroke="#16a9f3" stroke-width="14"/></svg>`,
  },
  {
    id: 'triangle',
    name: '警告三角',
    category: 'shape',
    keywords: ['三角', '警告', '注意', 'triangle', 'warning'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 10l42 74H8z" fill="#f7b23b"/><rect x="46" y="38" width="8" height="22" rx="3" fill="#1a1a1a"/><circle cx="50" cy="72" r="5" fill="#1a1a1a"/></svg>`,
  },
  // ── 装饰 deco ──
  {
    id: 'crown',
    name: '皇冠',
    category: 'deco',
    keywords: ['皇冠', '王冠', '冠军', 'crown', 'king'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M14 74h72l-6-34-22 16L50 34 42 56 20 40z" fill="#f0a04b"/><rect x="14" y="78" width="72" height="10" rx="3" fill="#ee8b4d"/><circle cx="16" cy="32" r="4" fill="#ef4343"/><circle cx="50" cy="30" r="4" fill="#23d160"/><circle cx="84" cy="32" r="4" fill="#16a9f3"/></svg>`,
  },
  {
    id: 'fire',
    name: '火焰',
    category: 'deco',
    keywords: ['火焰', '火', '热', 'fire', 'flame', 'hot'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 10c4 16-2 24-10 32-10 10-16 20-16 32a26 26 0 0 0 52 0c0-12-6-22-16-32 6-8 8-16 8-24-6 4-12 2-18-8z" fill="#ef4343"/><path d="M50 40c-4 8-12 14-12 24a12 12 0 0 0 24 0c0-10-6-16-12-24z" fill="#ffcf3f"/></svg>`,
  },
  {
    id: 'lightning',
    name: '闪电',
    category: 'deco',
    keywords: ['闪电', '电', '快', 'lightning', 'bolt', 'energy'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M56 8L24 56h20l-8 36 32-48H46z" fill="#ffcf3f"/></svg>`,
  },
  {
    id: 'gift',
    name: '礼物',
    category: 'deco',
    keywords: ['礼物', '礼品', '惊喜', 'gift', 'present'],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="16" y="34" width="68" height="52" rx="6" fill="#ef4343"/><rect x="10" y="24" width="80" height="14" rx="4" fill="#16a9f3"/><rect x="46" y="20" width="8" height="66" fill="#16a9f3"/><path d="M46 20c-8 0-12 8-4 14 4 3 6-6 4-14zM54 20c8 0 12 8 4 14-4 3-6-6-4-14z" fill="#23d160"/></svg>`,
  },
];

export const stickerSrc = (sticker: StickerDef): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(sticker.svg)}`;
