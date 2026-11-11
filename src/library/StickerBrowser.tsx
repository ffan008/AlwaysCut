import { memo, useMemo, useState } from 'react';
import { tData, useT } from '../i18n/locale';
import { Icon } from '../components/icons';
import { STICKERS, STICKER_CATEGORIES, type StickerDef } from './stickerCatalog';

// Sticker library (Pro "贴纸" category counterpart): search + category chips +
// a simple card grid. Cards preview the inline SVG and add on click. Unlike the
// effect browsers, stickers add a NEW overlay clip (not applied to a selection).

const ALL = '__all__';

interface StickerBrowserProps {
  onAdd: (sticker: StickerDef) => void;
}

function matchesQuery(s: StickerDef, q: string): boolean {
  if (!q) return true;
  const tokens = q
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^\p{Letter}\p{Number}]+/u)
    .filter(Boolean);
  if (!tokens.length) return true;
  const hay = [s.name, ...s.keywords].join(' ').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

export const StickerBrowser = memo(function StickerBrowser({ onAdd }: StickerBrowserProps) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<string>(ALL);

  const list = useMemo(() => {
    const q = query.trim();
    return STICKERS.filter((s) => (chip === ALL || s.category === chip) && matchesQuery(s, q));
  }, [chip, query]);

  return (
    <div className="cc-sticker-browser">
      <label className="cc-sound-search" htmlFor="cc-sticker-library-search">
        <Icon name="search" size={13} />
        <input
          id="cc-sticker-library-search"
          type="search"
          placeholder={t('搜索贴纸，如：点赞 / 箭头 / 狗')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {query ? (
          <button type="button" className="cc-sound-search-clear" onClick={() => setQuery('')} aria-label={t('清除')}>
            <Icon name="x" size={12} />
          </button>
        ) : null}
      </label>

      <div className="cc-sound-chips" role="tablist" aria-label={t('贴纸分类')}>
        <button
          type="button"
          role="tab"
          aria-selected={chip === ALL}
          className={`cc-sound-chip${chip === ALL ? ' selected' : ''}`}
          onClick={() => setChip(ALL)}
        >
          {t('推荐')}
        </button>
        {STICKER_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={chip === c.id}
            className={`cc-sound-chip${chip === c.id ? ' selected' : ''}`}
            onClick={() => setChip(c.id)}
          >
            {t(c.name)}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="cc-sound-empty">{t('未找到相关贴纸')}{query ? t('（与「{query}」不匹配）', { query }) : ''}</div>
      ) : (
        <div className="cc-sticker-grid" role="list" aria-label={t('贴纸列表')}>
          {list.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              role="listitem"
              className="cc-sticker-card"
              title={t('点击添加到时间线：{name}', { name: tData(sticker.name) })}
              onClick={() => onAdd(sticker)}
            >
              <span className="cc-sticker-thumb" dangerouslySetInnerHTML={{ __html: sticker.svg }} />
              <span className="cc-sticker-name">{tData(sticker.name)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="cc-sound-hint">{t('点击贴纸添加到时间线 · 共 {n} 个', { n: list.length })}</div>
    </div>
  );
});
