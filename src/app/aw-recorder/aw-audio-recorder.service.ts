import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WorkerUrl } from 'worker-url';

export type RecorderStatus =
  | 'IDLE'
  | 'INITIALIZING'
  | 'RECORDING'
  | 'PAUSING'
  | 'PAUSED'
  | 'STOPPING'
  | 'STOPPED'
  | 'STOPPED';

export type ClearServiceOptions = {
  keepRecording?: boolean;
  keepState?: boolean;
};

type RecordingWorkletStatus =
  | 'RECORDING'
  | 'PAUSED'
  | 'NOT_INITIATED'
  | 'STOPPED';

type RecorderWorkletMessage = {
  status: RecordingWorkletStatus;
  audioBuffer?: Int8Array[];
  unflushedBuffer?: Int8Array[];
};

type RecorderWorkletCommand = {
  type: 'START' | 'PAUSE' | 'STOP';
  mediaConstraints?: MediaStreamConstraints;
  previewOnPause?: boolean;
  previousBuffer?: Int8Array[];
};

const DEFAULT_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    noiseSuppression: true,
    channelCount: 1,
    sampleRate: 48000,
    sampleSize: 128
  }
};

@Injectable()
export class AWAudioRecorderService {
  //#region SERVICE PRIVATE ATTRIBUTES

  // SERVICE RELATED PROPERTIES
  private _recorderStatus$ = new BehaviorSubject<RecorderStatus>('IDLE');
  private _audioUrl$ = new BehaviorSubject<string>('');
  private _currentTime$ = new BehaviorSubject<number>(0.0);
  private intervalSetter: ReturnType<typeof setInterval> | undefined;
  private previousTime = 0.0;
  private _errors: Error[] = [];

  // AUDIO WORKLET RELATED PROPERTIES
  private _audioBlob: Blob | undefined;
  private unflushedBuffer: Int8Array[] | undefined;
  private recorderNode: AudioWorkletNode | undefined;

  // AUDIO CONTEXT RELATED PROPERTIES
  private context: AudioContext | undefined;
  private streamNode: MediaStreamAudioSourceNode | undefined;

  // MEDIA STREAM RELATED PROPERTIES
  private stream: MediaStream | undefined;
  private constraints: MediaStreamConstraints = DEFAULT_CONSTRAINTS;

  //#endregion

  //#region RECORDER PUBLIC CONTROL METHODS

  async startRecording(constraints?: MediaStreamConstraints) {
    if (constraints) this.constraints = constraints;

    await this.setStreamUp(constraints || this.constraints);

    this.sendWorkletCommand({
      type: 'START',
      mediaConstraints: constraints || this.constraints
    });
  }

  async resumeRecording() {
    await this.setStreamUp(this.constraints);

    this.sendWorkletCommand({
      type: 'START',
      previousBuffer: this.unflushedBuffer
    });
  }

  async pauseRecording(opt?: { emitPreview: boolean }) {
    this._recorderStatus$.next('PAUSING');

    this.sendWorkletCommand({
      type: 'PAUSE',
      previewOnPause: opt?.emitPreview
    });
  }

  async stopRecording() {
    this._recorderStatus$.next('STOPPING');

    this.sendWorkletCommand({ type: 'STOP' });
  }

  clear(opt?: ClearServiceOptions) {
    if (!opt?.keepState) this._recorderStatus$.next('IDLE');

    if (!opt?.keepRecording) {
      this._currentTime$.next(0.0);
      this.nextAudioUrl('');
      this._audioBlob = undefined;
    }

    this.unflushedBuffer = undefined;
    this.context = undefined;
    this.streamNode = undefined;
    this.recorderNode = undefined;
    this.stream = undefined;
    this.constraints = DEFAULT_CONSTRAINTS;
    this._errors = [];
  }

  //#endregion

  //#region AUDIO STREAM AND RECORDER SETUP

  private async setStreamUp(constraints: MediaStreamConstraints) {
    this._recorderStatus$.next('INITIALIZING');

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      await this.setRecorderUp(this.stream);
    } catch {
      const error = new Error(
        'User media: failed to get user media and initialize recorder'
      );
      this.pushError(error);
      throw error;
    }
  }

  private async setRecorderUp(stream: MediaStream) {
    try {
      this.context = new AudioContext();

      this.streamNode = this.context.createMediaStreamSource(stream);

      this.recorderNode = await this.setAudioWorkletUp(this.context);

      this.addMessageListener(this.recorderNode);

      this.streamNode.connect(this.recorderNode);

      this.context.resume();
    } catch {
      const error = new Error(
        'AudioContext: Failed to set AudioContext up for recording'
      );
      this.pushError(error);
      throw error;
    }
  }

  private async setAudioWorkletUp(
    context: AudioContext
  ): Promise<AudioWorkletNode> {
    try {
      const recorderWorkletUrl = new WorkerUrl(
        new URL('./recorder.worklet.ts', import.meta.url),
        { name: 'recorder.worklet' }
      );

      await context.audioWorklet.addModule(recorderWorkletUrl);

      return new AudioWorkletNode(context, 'recorderWorklet');
    } catch {
      const msg = 'AudioWorklet setup: failed to add module to worklet';
      this.pushError(new Error(msg));
      return Promise.reject(msg);
    }
  }

  //#endregion

  //#region WORKLET MESSAGE LISTENER AND POSTER

  private addMessageListener(node: AudioWorkletNode) {
    node.port.onmessage = (msg: MessageEvent<RecorderWorkletMessage>) => {
      switch (msg.data.status) {
        case 'RECORDING':
          this.onRecording();
          break;
        case 'PAUSED':
          this.onPaused(msg.data);
          break;
        case 'STOPPED':
          this.onStopped(msg.data);
          break;
        default:
          const error = new Error('Invalid message recieved from AudioWorkletProcessor');
          this.pushError(error);
          throw error;
      }
    };
  }

  private onRecording() {
    this._recorderStatus$.next('RECORDING');

    this.setCurrentTimeInterval();
  }

  private onPaused(data: RecorderWorkletMessage) {
    this._recorderStatus$.next('PAUSED');

    this.clearCurrentTimeInterval({ keepCurrTime: true });

    this.unflushedBuffer = data.unflushedBuffer;
    this.generateAudio(data.audioBuffer);

    this.stopStream();
  }

  private onStopped(data: RecorderWorkletMessage) {
    this._recorderStatus$.next('STOPPED');

    this.clearCurrentTimeInterval();

    this.generateAudio(data.audioBuffer);

    this.stopStream();
    this.clear({ keepRecording: true, keepState: true });
  }

  private sendWorkletCommand(command: RecorderWorkletCommand) {
    if (!this.recorderNode) {
      const error = new Error(
        'Audio worklet node: cannot send message because node is undefined.'
      );
      this.pushError(error);
      throw error;
    }

    this.recorderNode.port.postMessage(command);
  }

  //#endregion

  //#region OBSERVABLE RELATED METHODS

  private nextAudioUrl(url: string) {
    const prevUrl = this._audioUrl$.getValue();

    this._audioUrl$.next(url);

    setTimeout(() => {
      URL.revokeObjectURL(prevUrl as string);
    }, 1000);
  }

  private setCurrentTimeInterval() {
    this.intervalSetter = setInterval(() => {
      const time = (this.context?.currentTime || 0.0) + this.previousTime;

      this._currentTime$.next(time);
    }, 250);
  }

  private clearCurrentTimeInterval(opt?: { keepCurrTime: boolean }) {
    if (opt?.keepCurrTime) this.previousTime = this._currentTime$.getValue();

    clearInterval(this.intervalSetter);
  }

  //#endregion

  //#region OTHER METHODS

  private async stopStream() {
    if (!this.stream || !this.context) {
      const error = new Error('Tried to stop the stream but it was not set up');
      this.pushError(error);
      throw error;
    }

    this.stream.getTracks().forEach((track) => track.stop());

    await this.context.close();
  }

  private generateAudio(audioBuffer: Int8Array[] | undefined) {
    if (!audioBuffer) {
      const error = new Error(
        'Error generating audio blob: audio buffer is undefined.'
      );
      this.pushError(error);
      throw error;
    }

    this._audioBlob = new Blob(audioBuffer, { type: 'audio/mp3' });

    this.nextAudioUrl(URL.createObjectURL(this._audioBlob));
  }

  private pushError(e: Error) {
    if (this._errors.find(error => error.message === e.message)) return;
    this._errors.push(e);
  }

  //#endregion

  //#region GETTER METHODS

  get audioUrl$(): Observable<string> {
    return this._audioUrl$.asObservable();
  }

  get recorderStatus$(): Observable<RecorderStatus> {
    return this._recorderStatus$.asObservable();
  }

  get currentTime$(): Observable<number> {
    return this._currentTime$.asObservable();
  }

  get recording(): Blob | undefined {
    return this._audioBlob;
  }

  get errors(): Error[] {
    return this._errors;
  }

  //#endregion
}
