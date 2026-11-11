import { memo, useMemo } from 'react';
import { useT } from '../i18n/locale';
import { Icon } from '../components/icons';
import type { MediaAsset } from '../editor/types';

// Shot library (Pro "镜头库" category counterpart). Presents the project's
// visual media (video/image) as pickable shots. Clicking adds the clip to the
// timeline (reusing addMediaItem). This is a lightweight pass — full AI shot
// matching (perception retrieval) lives in the agent toolchain, not here.

interface ShotBrowserProps {
  assets: MediaAsset[];
  fps: number;
  onAdd: (asset: MediaAsset) => void;
}

export const ShotBrowser = memo(function ShotBrowser({ assets, fps, onAdd }: ShotBrowserProps) {
  const t = useT();

  const shots = useMemo(
    () => assets.filter((a) => a.kind === 'video' || a.kind === 'image'),
    [assets],
  );

  if (shots.length === 0) {
    return (
      <div className="cc-sound-empty">
        {t('媒体池里还没有视频或图片镜头。')}
        <div style={{ marginTop: 8 }}>{t('先在「我的素材」导入素材，镜头会出现在这里供快速添加。')}</div>
      </div>
    );
  }

  return (
    <div className="cc-shot-browser">
      <div className="cc-shot-grid" role="list" aria-label={t('镜头列表')}>
        {shots.map((asset) => (
          <button
            key={asset.id}
            type="button"
            role="listitem"
            className="cc-shot-card"
            title={t('点击添加到时间线：{name}', { name: asset.name })}
            onClick={() => onAdd(asset)}
          >
            <span className="cc-shot-thumb">
              {asset.kind === 'video' ? (
                <video src={asset.src} muted preload="metadata" playsInline disablePictureInPicture />
              ) : (
                <img src={asset.src} alt={asset.name} loading="lazy" />
              )}
              {asset.kind === 'video' ? (
                <span className="cc-shot-play"><Icon name="play" size={14} /></span>
              ) : null}
            </span>
            <span className="cc-shot-meta">
              <span className="cc-shot-name" title={asset.name}>{asset.name}</span>
              <span className="cc-shot-dur">
                {asset.kind === 'video' ? `${(asset.durationInFrames / fps).toFixed(1)}s` : t('图片')}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="cc-sound-hint">{t('点击镜头添加到时间线 · 共 {n} 个', { n: shots.length })}</div>
    </div>
  );
});
