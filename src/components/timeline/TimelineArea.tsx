import { useState, type ComponentProps } from 'react';
import { theme } from '../../theme';
import { useT } from '../../i18n/locale';
import { Icon } from '../icons';
import { Timeline } from './Timeline';
import { TimelineTabs } from './TimelineTabs';
import { TranscriptPanel } from '../../transcript/TranscriptPanel';

type TimelineView = 'timeline' | 'script';

const VIEWS: Array<{ id: TimelineView; icon: 'film' | 'text' }> = [
  { id: 'timeline', icon: 'film' },
  { id: 'script', icon: 'text' },
];

interface TimelineAreaProps {
  timelineTabs: ComponentProps<typeof TimelineTabs>;
  timeline: ComponentProps<typeof Timeline>;
  transcriptPanel: ComponentProps<typeof TranscriptPanel>;
}

/** Bottom area: a 「时间链 / 文字稿」 dual-view tab. The script (transcript)
 * panel lives here next to the timeline instead of inside the library. */
export function TimelineArea({ timelineTabs, timeline, transcriptPanel }: TimelineAreaProps) {
  const t = useT();
  const [view, setView] = useState<TimelineView>('timeline');
  const tabLabel: Record<TimelineView, string> = { timeline: '时间链', script: '文字稿' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div className="cc-timeline-view-tabs">
        {VIEWS.map(({ id, icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`cc-timeline-view-tab${active ? ' selected' : ''}`}
              title={t(tabLabel[id])}
            >
              <Icon name={icon} size={13} />
              <span>{t(tabLabel[id])}</span>
            </button>
          );
        })}
      </div>
      {view === 'timeline' ? (
        <>
          <TimelineTabs {...timelineTabs} />
          <Timeline {...timeline} />
        </>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: theme.bg }}>
          <TranscriptPanel {...transcriptPanel} />
        </div>
      )}
    </div>
  );
}
