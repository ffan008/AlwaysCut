// Recording feature-line barrel: the renderer-side minimum viable slice.
//
//   useScreenRecorder — capture lifecycle (listSources → getUserMedia → MediaRecorder → blob).
//   RecordPanel       — UI to select a source, record, and import the result into the media pool.
//
// Not yet mounted into the Editor shell; import from here once the "编录一体" surface is wired up.

export { useScreenRecorder } from './useScreenRecorder';
export type { ScreenRecorderState, ScreenRecordingPhase } from './useScreenRecorder';
export { RecordPanel } from './RecordPanel';
