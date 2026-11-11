import { memo, useMemo, useState } from 'react';
import { tData, useT } from '../i18n/locale';
import { TEXT_STYLE_CATEGORIES, TEXT_STYLE_PRESETS, type TextStylePreset } from './textStyleCatalog';

// Text-style library (Pro "文本" category counterpart): a grid of authored text
// presets. Clicking adds a text clip via addTextClip (mapped in the controller).

const ALL = '__all__';

interface TextStyleBrowserProps {
  onAdd: (preset: TextStylePreset) => void;
}

export const TextStyleBrowser = memo(function TextStyleBrowser({ onAdd }: TextStyleBrowserProps) {
  const t = useT();
  const [chip, setChip] = useState<string>(ALL);

  const list = useMemo(
    () => TEXT_STYLE_PRESETS.filter((p) => chip === ALL || p.category === chip),
    [chip],
  );

  // Preview font scales down from the canvas-space size so cards stay legible
  // while still expressing relative weight/size differences.
  const previewSize = (fontSize: number) => Math.max(12, Math.min(26, Math.round(fontSize * 0.22)));

  return (
    <div className="cc-text-style-browser">
      <div className="cc-sound-chips" role="tablist" aria-label={t('文字样式分类')}>
        <button
          type="button"
          role="tab"
          aria-selected={chip === ALL}
          className={`cc-sound-chip${chip === ALL ? ' selected' : ''}`}
          onClick={() => setChip(ALL)}
        >
          {t('全部')}
        </button>
        {TEXT_STYLE_CATEGORIES.map((c) => (
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

      <div className="cc-sticker-grid" role="list" aria-label={t('文字样式列表')}>
        {list.map((preset) => (
          <button
            key={preset.id}
            type="button"
            role="listitem"
            className="cc-text-style-card"
            title={t('点击添加文字：{name}', { name: tData(preset.name) })}
            onClick={() => onAdd(preset)}
          >
            <span
              className="cc-text-style-preview"
              style={{
                fontSize: previewSize(preset.fontSize),
                color: preset.color,
                fontWeight: preset.fontWeight,
                textAlign: preset.align,
              }}
            >
              {tData(preset.text)}
            </span>
            <span className="cc-sticker-name">{tData(preset.name)}</span>
          </button>
        ))}
      </div>

      <div className="cc-sound-hint">{t('点击样式添加文字片段，可在属性面板调整位置与内容')}</div>
    </div>
  );
});
