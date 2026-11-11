import { ipcMain } from 'electron';
import { assertTrustedDesktopSenderUrl } from './page-origin.ts';
import {
  DESKTOP_TTS_CHANNELS,
  isDesktopTtsRequestId,
  isDesktopTtsResult,
  parseTtsRequest,
  type TtsCapabilities,
  type TtsResult,
} from '../shared/desktop-tts.ts';
import { cancelTts, runTts, ttsCapabilities } from '../server/tts-runner.ts';

export interface InstalledDesktopTts {
  dispose(): void;
}

export function installDesktopTtsIpc(trustedOrigin: string): InstalledDesktopTts {
  ipcMain.handle(DESKTOP_TTS_CHANNELS.capabilities, (event): TtsCapabilities => {
    assertTrustedDesktopSenderUrl(event.senderFrame?.url ?? '', trustedOrigin);
    return ttsCapabilities();
  });

  ipcMain.handle(
    DESKTOP_TTS_CHANNELS.run,
    async (event, value: unknown): Promise<TtsResult> => {
      assertTrustedDesktopSenderUrl(event.senderFrame?.url ?? '', trustedOrigin);
      const request = parseTtsRequest(value);
      const result = await runTts(request);
      if (!isDesktopTtsResult(result)) throw new Error('本地配音返回了无效结果');
      return result;
    },
  );

  ipcMain.handle(DESKTOP_TTS_CHANNELS.cancel, (event, requestId: unknown): void => {
    assertTrustedDesktopSenderUrl(event.senderFrame?.url ?? '', trustedOrigin);
    if (isDesktopTtsRequestId(requestId)) cancelTts(requestId);
  });

  return {
    dispose: () => {
      for (const channel of Object.values(DESKTOP_TTS_CHANNELS)) {
        ipcMain.removeHandler(channel);
      }
    },
  };
}
