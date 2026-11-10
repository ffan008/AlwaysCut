import { desktopCapturer, ipcMain } from 'electron';
import { assertTrustedDesktopSenderUrl } from './page-origin.ts';
import {
  DESKTOP_RECORDING_CHANNELS,
  type DesktopRecordingSourceInfo,
} from '../shared/desktop-recording.ts';

export interface InstalledDesktopRecording {
  dispose(): void;
}

// Main-process half of the recording contract. The renderer drives
// getUserMedia + MediaRecorder and reuses the local-media import bridge to land
// the finished file in the media pool; the main process only enumerates
// capturable sources here.
export function installDesktopRecordingIpc(trustedOrigin: string): InstalledDesktopRecording {
  ipcMain.handle(
    DESKTOP_RECORDING_CHANNELS.listSources,
    async (event): Promise<DesktopRecordingSourceInfo[]> => {
      assertTrustedDesktopSenderUrl(event.senderFrame?.url ?? '', trustedOrigin);
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 320, height: 180 },
        fetchWindowIcons: false,
      });
      return sources.map((source) => ({
        id: source.id,
        kind: source.id.startsWith('screen:') ? 'screen' : 'window',
        name: source.name,
        thumbnailDataUrl: source.thumbnail.toDataURL(),
      }));
    },
  );

  return {
    dispose: () => {
      ipcMain.removeHandler(DESKTOP_RECORDING_CHANNELS.listSources);
    },
  };
}
