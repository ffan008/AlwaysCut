// Built-in text-style presets (Pro "文本" category counterpart).
// Each preset maps to addTextClip's supported props (text/fontSize/color/fontWeight/align),
// so clicking a card drops an authored text clip the user can then move/resize in the inspector.

export interface TextStylePreset {
  id: string;
  name: string;
  category: TextStyleCategoryId;
  text: string;
  fontSize: number;
  color: string;
  fontWeight: number;
  align: 'left' | 'center' | 'right';
}

export interface TextStyleCategory {
  id: TextStyleCategoryId;
  name: string;
}

export type TextStyleCategoryId = 'title' | 'subtitle' | 'label';

export const TEXT_STYLE_CATEGORIES: TextStyleCategory[] = [
  { id: 'title', name: '标题' },
  { id: 'subtitle', name: '字幕' },
  { id: 'label', name: '标注' },
];

export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  // ── 标题 title ──
  {
    id: 'hero-title',
    name: '大标题',
    category: 'title',
    text: '标题文字',
    fontSize: 120,
    color: '#ffffff',
    fontWeight: 800,
    align: 'center',
  },
  {
    id: 'accent-title',
    name: '强调标题',
    category: 'title',
    text: '强调标题',
    fontSize: 108,
    color: '#f0a04b',
    fontWeight: 800,
    align: 'center',
  },
  {
    id: 'brand-title',
    name: '品牌色标题',
    category: 'title',
    text: '品牌标题',
    fontSize: 104,
    color: '#16a9f3',
    fontWeight: 800,
    align: 'center',
  },
  // ── 字幕 subtitle ──
  {
    id: 'subtitle-main',
    name: '副标题',
    category: 'subtitle',
    text: '副标题',
    fontSize: 56,
    color: '#ffffff',
    fontWeight: 600,
    align: 'center',
  },
  {
    id: 'caption-bottom',
    name: '底部字幕',
    category: 'subtitle',
    text: '这里是字幕文字',
    fontSize: 48,
    color: '#ffffff',
    fontWeight: 500,
    align: 'center',
  },
  {
    id: 'quote',
    name: '引言',
    category: 'subtitle',
    text: '「一句值得记住的话」',
    fontSize: 44,
    color: '#dedede',
    fontWeight: 400,
    align: 'center',
  },
  // ── 标注 label ──
  {
    id: 'corner-tag',
    name: '角标',
    category: 'label',
    text: '角标',
    fontSize: 36,
    color: '#f7b23b',
    fontWeight: 700,
    align: 'left',
  },
  {
    id: 'timestamp',
    name: '时间戳',
    category: 'label',
    text: '00:00',
    fontSize: 40,
    color: '#ffffff',
    fontWeight: 700,
    align: 'right',
  },
  {
    id: 'hint',
    name: '提示文字',
    category: 'label',
    text: '提示文字',
    fontSize: 32,
    color: '#8c8c8c',
    fontWeight: 500,
    align: 'left',
  },
];
