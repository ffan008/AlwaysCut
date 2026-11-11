import { memo, useMemo, useState } from 'react';
import { useT } from '../i18n/locale';
import { Icon } from '../components/icons';
import type { MediaAsset } from '../editor/types';
import { useSemanticSearch } from '../media/semantic-search/useSemanticSearch';
import { spokenMediaSearchHits, type SpokenMediaSearchHit } from '../media/searchMedia';
import { isSemanticMedia } from '../media/semantic-search/mediaFrames';
import { MAX_SEMANTIC_QUERY_LENGTH, type SemanticMatch } from '../media/semantic-search/types';

// Shot library (Pro "镜头库" counterpart) with AI perception retrieval.
//
// Two retrieval paths back the natural-language search box:
//   · visual — local ChineseCLIP over sampled/scene-aware frames (画面内容)
//   · spoken — the pool assets' ASR transcripts (说话内容)
// A hit is frame-accurate: clicking adds the clip at that exact source time
// (addMediaItem srcInFrame), not from the head of the asset.
//
// When the visual model is not yet enabled the browser still lets the user
// browse every shot and search spoken transcripts; the enable card offers the
// one-time local model (optional ~178MB pack) without blocking.

interface ShotBrowserProps {
  scopeId: string;
  assets: MediaAsset[];
  fps: number;
  onAdd: (asset: MediaAsset, srcInFrame?: number) => void;
}

interface VisualResult {
  asset: MediaAsset;
  match: SemanticMatch;
}
interface SpokenResult {
  asset: MediaAsset;
  hit: SpokenMediaSearchHit;
}

const VISUAL_LIMIT = 12;
const SPOKEN_LIMIT = 8;

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export const ShotBrowser = memo(function ShotBrowser({ scopeId, assets, fps, onAdd }: ShotBrowserProps) {
  const t = useT();
  const semantic = useSemanticSearch(scopeId, assets);
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');

  const byId = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);
  const shots = useMemo(() => assets.filter((a) => a.kind === 'video' || a.kind === 'image'), [assets]);
  const visualAssets = useMemo(() => assets.filter(isSemanticMedia), [assets]);

  const { status } = semantic.state;
  const modelReady = status === 'ready' || status === 'indexing' || status === 'searching';
  const searching = searchedQuery.length > 0;

  // Spoken (ASR transcript) matches — pure local text search, model-independent.
  const spokenHits = useMemo(
    () => (searching ? spokenMediaSearchHits(searchedQuery, assets, SPOKEN_LIMIT) : []),
    [searching, searchedQuery, assets],
  );

  const visualResults: VisualResult[] = useMemo(
    () => semantic.state.matches
      .slice(0, VISUAL_LIMIT)
      .map((match) => ({ asset: byId.get(match.assetId), match }))
      .filter((x): x is VisualResult => x.asset != null),
    [semantic.state.matches, byId],
  );

  const spokenResults: SpokenResult[] = useMemo(
    () => spokenHits
      .map((hit) => ({ asset: byId.get(hit.assetId), hit }))
      .filter((x): x is SpokenResult => x.asset != null),
    [spokenHits, byId],
  );

  const runSearch = () => {
    const q = query.trim();
    setSearchedQuery(q);
    if (modelReady) void semantic.search(q);
  };
  const clearSearch = () => {
    setQuery('');
    setSearchedQuery('');
    if (modelReady) void semantic.search('');
  };
  const enableVisual = () => {
    const needsPack = semantic.state.pack === 'absent' || semantic.state.pack === 'error';
    void (needsPack ? semantic.installAndEnable() : semantic.enable());
  };

  const totalVisual = visualAssets.length;
  const indexed = Math.min(semantic.state.indexedAssets, totalVisual);
  const allIndexed = totalVisual > 0 && indexed >= totalVisual;

  return (
    <div className="cc-shot-browser">
      <form
        className="cc-shot-search"
        onSubmit={(event) => { event.preventDefault(); runSearch(); }}
      >
        <Icon name="search" size={15} />
        <input
          value={query}
          maxLength={MAX_SEMANTIC_QUERY_LENGTH}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('描述镜头，例如：海边日落 / 有人说话')}
        />
        {query ? (
          <button type="button" aria-label={t('清除')} onClick={clearSearch}><Icon name="x" size={14} /></button>
        ) : null}
        <button type="submit" className="primary" disabled={!query.trim()}>{t('搜索')}</button>
      </form>

      {!modelReady && (
        <div className="cc-shot-enable">
          <span className="cc-shot-enable-icon"><Icon name="sparkles" size={16} /></span>
          <div>
            <strong>{t('按画面内容搜镜头')}</strong>
            <p>{t('本地语义检索，索引与搜索都在本机完成，素材不会上传。')}</p>
          </div>
          <button type="button" onClick={enableVisual}>
            <Icon name={semantic.state.pack === 'downloading' ? 'download' : 'sparkles'} size={13} />
            {semantic.state.pack === 'downloading'
              ? t('下载中… {n}%', { n: semantic.state.packProgress })
              : semantic.state.pack === 'absent' || semantic.state.pack === 'error'
                ? t('下载并启用')
                : t('启用视觉检索')}
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div className="cc-shot-progress">
          <progress max={100} value={semantic.state.modelProgress} />
          <span>{Math.round(semantic.state.modelProgress)}% · {semantic.state.device === 'webgpu' ? t('GPU 加速') : t('CPU 模式')}</span>
        </div>
      )}

      {modelReady && totalVisual > 0 && (
        <div className="cc-shot-index">
          {status === 'indexing' ? (
            <span>{t('正在建立索引… {done} / {total}', { done: semantic.state.indexedAssets, total: semantic.state.totalAssets })}</span>
          ) : (
            <span>{t('已索引 {done} / {total} 个素材', { done: indexed, total: totalVisual })}</span>
          )}
          {status !== 'indexing' && !allIndexed ? (
            <button type="button" onClick={() => void semantic.index()}>{t('建立索引')}</button>
          ) : null}
        </div>
      )}

      {searching ? (
        visualResults.length || spokenResults.length ? (
          <div className="cc-shot-results">
            {visualResults.length ? (
              <div className="cc-shot-group">
                <div className="cc-shot-group-title">{t('语义结果 {n} 个', { n: visualResults.length })}</div>
                <div className="cc-shot-grid" role="list" aria-label={t('语义结果')}>
                  {visualResults.map(({ asset, match }) => (
                    <ShotCard
                      key={`v:${asset.id}:${match.sampleTime}`}
                      asset={asset}
                      timeSec={match.sampleTime}
                      title={asset.name}
                      badge={`${Math.round(match.score * 100)}%`}
                      onAdd={() => onAdd(asset, Math.max(0, Math.round(match.sampleTime * fps)))}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {spokenResults.length ? (
              <div className="cc-shot-group">
                <div className="cc-shot-group-title">{t('口语匹配 {n} 处', { n: spokenResults.length })}</div>
                <div className="cc-shot-grid" role="list" aria-label={t('口语匹配')}>
                  {spokenResults.map(({ asset, hit }) => (
                    <ShotCard
                      key={`s:${asset.id}:${hit.sourceStartMs}`}
                      asset={asset}
                      timeSec={hit.sourceStartMs / 1000}
                      title={asset.name}
                      badge={t('命中')}
                      text={hit.text}
                      onAdd={() => onAdd(asset, Math.max(0, Math.round((hit.sourceStartMs / 1000) * fps)))}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="cc-sound-empty">{t('没有匹配的镜头，换个描述试试。')}</div>
        )
      ) : shots.length === 0 ? (
        <div className="cc-sound-empty">
          {t('媒体池里还没有视频或图片镜头。')}
          <div style={{ marginTop: 8 }}>{t('先在「我的素材」导入素材，镜头会出现在这里供快速添加。')}</div>
        </div>
      ) : (
        <div className="cc-shot-grid" role="list" aria-label={t('镜头列表')}>
          {shots.map((asset) => (
            <ShotCard
              key={asset.id}
              asset={asset}
              timeSec={0}
              title={asset.name}
              badge={asset.kind === 'video' ? `${(asset.durationInFrames / fps).toFixed(1)}s` : t('图片')}
              onAdd={() => onAdd(asset)}
            />
          ))}
        </div>
      )}

      {!searching && shots.length > 0 && (
        <div className="cc-sound-hint">{t('点击镜头添加到时间线 · 共 {n} 个', { n: shots.length })}</div>
      )}
    </div>
  );
});

function ShotCard({ asset, timeSec, title, badge, text, onAdd }: {
  asset: MediaAsset;
  timeSec: number;
  title: string;
  badge: string;
  text?: string;
  onAdd: () => void;
}) {
  const t = useT();
  const frameSrc = asset.kind === 'video' ? `${asset.src}#t=${timeSec.toFixed(2)}` : asset.src;
  return (
    <button type="button" role="listitem" className="cc-shot-card" title={t('点击添加到时间线：{name}', { name: title })} onClick={onAdd}>
      <span className="cc-shot-thumb">
        {asset.kind === 'video' ? (
          <video src={frameSrc} muted preload="metadata" playsInline disablePictureInPicture />
        ) : (
          <img src={frameSrc} alt={title} loading="lazy" />
        )}
        {asset.kind === 'video' ? <span className="cc-shot-play"><Icon name="play" size={14} /></span> : null}
        {timeSec > 0 ? <span className="cc-shot-time">{formatTime(timeSec)}</span> : null}
      </span>
      <span className="cc-shot-meta">
        <span className="cc-shot-name" title={title}>{title}</span>
        <span className="cc-shot-dur">{text ? text.slice(0, 24) : badge}</span>
        {text ? <span className="cc-shot-score">{badge}</span> : null}
      </span>
    </button>
  );
}
