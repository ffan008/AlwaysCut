import { ipcMain } from 'electron';
import { assertTrustedDesktopSenderUrl } from './page-origin.ts';
import {
  DESKTOP_ENHANCE_CHANNELS,
  parseEnhanceRequest,
  type EnhanceCapabilities,
  type EnhanceResult,
} from '../shared/desktop-enhance.ts';
import { runDenoise } from '../server/enhance-runner.ts';

export interface InstalledDesktopEnhance {
  dispose(): void;
}

// Main-process half of the enhance contract. This skeleton registers the wire
// surface and validates requests; the actual FFmpeg denoise / ONNX upscale work
// lands on the feat/enhance branch (see TODO markers below).
export function installDesktopEnhanceIpc(trustedOrigin: string): InstalledDesktopEnhance {
  ipcMain.handle(DESKTOP_ENHANCE_CHANNELS.capabilities, (event): EnhanceCapabilities => {
    assertTrustedDesktopSenderUrl(event.senderFrame?.url ?? '', trustedOrigin);
    return {
      denoise: { available: true },
      upscale: { available: false, reason: 'not implemented yet' },
    };
  });

  ipcMain.handle(
    DESKTOP_ENHANCE_CHANNELS.run,
    async (event, value: unknown): Promise<EnhanceResult> => {
      assertTrustedDesktopSenderUrl(event.senderFrame?.url ?? '', trustedOrigin);
      const request = parseEnhanceRequest(value);
      if (request.operation === 'denoise') return runDenoise(request);
      // TODO(feat/enhance): run ONNX super-resolution for the upscale op on the
      // native-inference worker path. capabilities already reports it as
      // unavailable; reaching here means the renderer bypassed that gate.
      throw new Error(`enhance operation not implemented: ${request.operation}`);
    },
  );

  ipcMain.handle(DESKTOP_ENHANCE_CHANNELS.cancel, (event, requestId: unknown): void => {
    assertTrustedDesktopSenderUrl(event.senderFrame?.url ?? '', trustedOrigin);
    // TODO(feat/enhance): cancel an in-flight job keyed by requestId.
    void requestId;
  });

  return {
    dispose: () => {
      for (const channel of Object.values(DESKTOP_ENHANCE_CHANNELS)) {
        if (channel !== DESKTOP_ENHANCE_CHANNELS.progress) ipcMain.removeHandler(channel);
      }
    },
  };
}
