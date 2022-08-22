import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { cloneDeep } from 'lodash-es';
import { Mp3Encoder, Mp3Object } from './Mp3Encoder';

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

const DEFAULT_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    noiseSuppression: true,
    channelCount: 1,
    sampleRate: 48000,
    sampleSize: 128
  },
}

@Injectable()
export class AudioRecorderService {
  // SERVICE RELATED PROPERTIES
  private _recorderStatus$ = new BehaviorSubject<RecorderStatus>('IDLE');
  private _audioUrl$ = new BehaviorSubject<string>('');
  private _currentTime$ = new BehaviorSubject<number>(0.0);
  private duration: number = 0;
  private _duration: number = 0;

  // ENCODER RELATED PROPERTIES
  private mp3Encoder: Mp3Encoder | undefined;
  private prevDataBuffer: any[] | undefined;
  private _recording: Mp3Object | undefined;
  
  // AUDIO CONTEXT RELATED PROPERTIES
  private context: AudioContext | undefined;
  private input: MediaStreamAudioSourceNode | undefined;
  private processor: ScriptProcessorNode | undefined;
  
  // MEDIA STREAM RELATED PROPERTIES
  private stream: MediaStream | undefined;
  private constraints: MediaStreamConstraints = DEFAULT_CONSTRAINTS;

  startRecording(constraints?: MediaStreamConstraints) {
    if (constraints) this.constraints = constraints;

    this.setStreamUp(constraints || this.constraints)
  }

  resumeRecording() {
    this.setStreamUp(this.constraints);
  }
  
  private setStreamUp(constraints: MediaStreamConstraints) {
    this._recorderStatus$.next('INITIALIZING');

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(this.micCaptured)
      .catch(this.micError);

    this.mp3Encoder = new Mp3Encoder({
      bitRate: Number((constraints.audio as MediaTrackConstraints).sampleSize),
      sampleRate: Number((constraints.audio as MediaTrackConstraints).sampleRate),
      dataBuffer: this.prevDataBuffer,
    });
  }

  async pauseRecording(emitPreview?: boolean) {
    this._recorderStatus$.next('PAUSING');

    await this.stopStream();

    if (!this.mp3Encoder) throw new Error('MP3 encoder not defined');

    // Sets the internal (calculation aimed), duration to previous recording's public duration in order to resume the counting
    this._duration = this.duration;

    // Saves current recoding's dataBuffer to resume it later
    this.prevDataBuffer = cloneDeep(this.mp3Encoder.dataBuffer);

    if (emitPreview) {
      this._recording = this.mp3Encoder.finish();
  
      this.nextAudioUrl(this._recording.url);
    }

    this._recorderStatus$.next('PAUSED');
  }

  async stopRecording() {
    this._recorderStatus$.next('STOPPING');

    await this.stopStream();

    if (!this.mp3Encoder) throw new Error('MP3 encoder not defined');

    this._recording = this.mp3Encoder.finish();

    this.nextAudioUrl(this._recording.url);

    this._recorderStatus$.next('STOPPED');
    this.clear({ keepRecording: true, keepState: true });
  }

  private async stopStream() {
    if (!this.stream || !this.input || !this.processor || !this.context) {
      throw new Error('Tried to stop the stream but it was not set up');
    }

    this.stream.getTracks().forEach((track) => track.stop());
    this.input.disconnect();
    this.processor.disconnect();
    await this.context.close();
  }

  clear(opt?: ClearServiceOptions) {
    if (!opt?.keepState) this._recorderStatus$.next('IDLE');
    this.duration, this._duration = 0;
    
    this.mp3Encoder = undefined;
    this.prevDataBuffer = undefined;
    
    if (!opt?.keepRecording) {
      this._currentTime$.next(0.0);
      this.nextAudioUrl('');
      this._recording = undefined;
    }

    this.context = undefined;
    this.input = undefined;
    this.processor = undefined;

    this.stream = undefined;
    this.constraints = DEFAULT_CONSTRAINTS;
  }

  private micCaptured = (stream: MediaStream) => {
    this._recorderStatus$.next('RECORDING');

    this.context?.state === 'suspended'
      ? this.context.resume()
      : (this.context = new window.AudioContext());

    this.duration = this._duration;
    this.input = this.context.createMediaStreamSource(stream);
    this.processor = this.context.createScriptProcessor(undefined, 1, 1);
    this.stream = stream;

    this.processor.onaudioprocess = (ev: AudioProcessingEvent) => {
      const sample = ev.inputBuffer.getChannelData(0);

      this.mp3Encoder && this.mp3Encoder.encode(sample);

      this.duration =
        parseFloat(String(this._duration)) +
        parseFloat(this.context ? this.context.currentTime.toFixed(2) : '0');
      this._currentTime$.next(this.duration);
    };

    this.input.connect(this.processor);
    this.processor.connect(this.context.destination);
  }

  private micError = (error: any) => {
    console.error(error);
  }

  private nextAudioUrl(url: string) {
    const prevUrl = this._audioUrl$.getValue();

    this._audioUrl$.next(url);

    setTimeout(() => {
      URL.revokeObjectURL(prevUrl as string);
    }, 1000);
  }

  get audioUrl(): Observable<string> {
    return this._audioUrl$.asObservable();
  }

  get recorderStatus$(): Observable<RecorderStatus> {
    return this._recorderStatus$.asObservable();
  }

  get currentTime$(): Observable<number> {
    return this._currentTime$.asObservable();
  }

  get recording(): Mp3Object | undefined {
    return this._recording;
  }
}
