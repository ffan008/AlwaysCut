import { useCallback, useState } from 'react';
import { Icon } from '../components/icons';
import { useT } from '../i18n/locale';
import { useScreenRecorder, type ScreenRecordingPhase } from './useScreenRecorder';
import './record-panel.css';

// Minimal recording UI: pick a screen/window, toggle the mic, record, then land
// the WebM blob in the media pool through the existing `importLocalMedia` bridge.
// Not yet wired into the Editor shell — it is a self-contained, importable module.

type Notice = { kind: 'ok' | 'error'; text: string };

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function recordingFileName(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `recording-${stamp}.webm`;
}

function phaseLabel(phase: ScreenRecordingPhase, t: ReturnType<typeof useT>): string {
  if (phase === 'recording') return t('录制中');
  if (phase === 'saving') return t('正在保存…');
  return t('未在录制');
}

export function RecordPanel() {
  const t = useT();
  const recorder = useScreenRecorder();
  const [notice, setNotice] = useState<Notice | null>(null);
  const { start, stop } = recorder;

  const handleStart = useCallback(() => {
    setNotice(null);
    void start();
  }, [start]);

  const handleStop = useCallback(async () => {
    setNotice(null);
    try {
      const blob = await stop();
      if (!blob) {
        setNotice({ kind: 'error', text: t('录制未产生数据。') });
        return;
      }
      const bridge = window.alwaysCutDesktop;
      if (!bridge) {
        setNotice({ kind: 'error', text: t('仅在桌面应用中支持保存到媒体池。') });
        return;
      }
      const file = new File([blob], recordingFileName(), { type: blob.type || 'video/webm' });
      const result = await bridge.importLocalMedia(file);
      if (result) {
        setNotice({ kind: 'ok', text: t('已保存到媒体池：{name}', { name: result.storedName }) });
      } else {
        setNotice({ kind: 'error', text: t('保存失败：桌面桥接未接受该文件。') });
      }
    } catch (reason) {
      setNotice({ kind: 'error', text: t('保存失败：{reason}', { reason: reason instanceof Error ? reason.message : String(reason) }) });
    }
  }, [stop, t]);

  const recording = recorder.phase === 'recording' || recorder.phase === 'saving';

  return (
    <section className="cc-record-panel">
      <header className="cc-record-header">
        <div>
          <strong>{t('屏幕录制')}</strong>
          <span>{phaseLabel(recorder.phase, t)}</span>
        </div>
        <div className="cc-record-clock">{formatElapsed(recorder.elapsedMs)}</div>
      </header>

      <label className="cc-record-mic">
        <input
          type="checkbox"
          checked={recorder.micEnabled}
          disabled={recording}
          onChange={(event) => recorder.setMicEnabled(event.target.checked)}
        />
        <Icon name="mic" size={14} />
        {t('麦克风')}
      </label>

      <div className="cc-record-sources" role="listbox" aria-label={t('屏幕源')}>
        {recorder.sourcesLoading && <div className="cc-record-empty">{t('正在加载屏幕源…')}</div>}
        {!recorder.sourcesLoading && recorder.sources.length === 0 && (
          <div className="cc-record-empty">{t('未找到可录制的屏幕或窗口。')}</div>
        )}
        {recorder.sources.map((source) => {
          const selected = source.id === recorder.selectedSourceId;
          return (
            <button
              key={source.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={`cc-record-source${selected ? ' is-selected' : ''}`}
              disabled={recording}
              onClick={() => recorder.selectSource(source.id)}
            >
              <img src={source.thumbnailDataUrl} alt="" draggable={false} />
              <span className="cc-record-source-meta">
                <strong>{source.name}</strong>
                <em>{source.kind === 'screen' ? t('屏幕') : t('窗口')}</em>
              </span>
              {selected && <Icon name="check" size={14} />}
            </button>
          );
        })}
      </div>

      {recorder.error && <div className="cc-record-error" role="alert">{recorder.error}</div>}
      {notice && <div className={`cc-record-notice ${notice.kind}`} role="status">{notice.text}</div>}

      <footer className="cc-record-footer">
        <button
          type="button"
          className="cc-record-refresh"
          disabled={recording || recorder.sourcesLoading}
          onClick={() => void recorder.refreshSources()}
        >
          {t('刷新')}
        </button>
        {recorder.phase === 'recording' ? (
          <button type="button" className="cc-record-stop" onClick={() => void handleStop()}>
            <span className="cc-record-dot" />
            {t('停止')}
          </button>
        ) : (
          <button
            type="button"
            className="cc-record-start"
            disabled={!recorder.selectedSourceId || recorder.phase === 'saving'}
            onClick={handleStart}
          >
            <span className="cc-record-dot" />
            {t('开始录制')}
          </button>
        )}
      </footer>
    </section>
  );
}
