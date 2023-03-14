import { cloneDeep } from 'lodash-es';
import { Mp3Encoder } from './Mp3Encoder';

type RecordingWorkletStatus =
  | 'RECORDING'
  | 'PAUSED'
  | 'NOT_INITIATED'
  | 'STOPPED';

type IncomingMessages = {
  type: 'START' | 'PAUSE' | 'STOP';
  mediaConstraints?: MediaStreamConstraints;
  previewOnPause?: boolean;
  previousBuffer?: Int8Array[];
};

type OutgoingMessages = {
  status: RecordingWorkletStatus;
  audioBuffer?: Int8Array[];
  unflushedBuffer?: Int8Array[];
};

type AudioWorkletProcessorType = {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
};

declare const AudioWorkletProcessor: {
  prototype: AudioWorkletProcessorType;
  new (options?: AudioWorkletNodeOptions): AudioWorkletProcessorType;
};

declare const registerProcessor: (
  name: string,
  AudioWorkletProcessor: any
) => void;

const DEFAULT_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    noiseSuppression: true,
    channelCount: 1,
    sampleRate: 48000,
    sampleSize: 128
  }
};

class RecorderWorklet extends AudioWorkletProcessor {
  mp3Encoder: Mp3Encoder | undefined;
  previousBuffer: Int8Array[] | undefined;
  status: RecordingWorkletStatus = 'NOT_INITIATED';
  audioBuffer!: Int8Array[];
  constraints: MediaStreamConstraints = DEFAULT_CONSTRAINTS;

  constructor() {
    super();

    this.port.onmessage = (msg: MessageEvent<IncomingMessages>) => {
      switch (msg.data.type) {
        case 'START':
          this.previousBuffer = msg.data.previousBuffer;
          this.startRecorder(msg.data.mediaConstraints);
          break;
        case 'PAUSE':
          const emitPreview = msg.data.previewOnPause || false;
          this.pauseRecording({ emitPreview });
          break;
        case 'STOP':
          this.stopRecording();
      }
    };
  }

  postMessage(msg: OutgoingMessages) {
    this.port.postMessage(msg);
  }

  setupRecording(constraints: MediaStreamConstraints) {
    try {
      this.mp3Encoder = new Mp3Encoder({
        bitRate: Number(
          (constraints.audio as MediaTrackConstraints).sampleSize
        ),
        sampleRate: Number(
          (constraints.audio as MediaTrackConstraints).sampleRate
        ),
        dataBuffer: this.previousBuffer
      });

      this.status = 'RECORDING';
      this.postMessage({ status: this.status });
    } catch {
      throw new Error('Error while creating new mp3Encoder');
    }
  }

  startRecorder(constraints?: MediaStreamConstraints) {
    if (constraints) this.constraints = constraints;

    this.setupRecording(constraints || this.constraints);
  }

  pauseRecording(opt?: { emitPreview: boolean }) {
    this.status = 'PAUSED';

    if (!this.mp3Encoder) throw new Error('Encoder not defined.');

    if (opt?.emitPreview) {
      const unflushedBuffer = cloneDeep(this.mp3Encoder.dataBuffer);
      this.audioBuffer = this.mp3Encoder.finish();

      this.postMessage({
        status: this.status,
        audioBuffer: this.audioBuffer,
        unflushedBuffer: cloneDeep(this.mp3Encoder.dataBuffer)
      });
    } else {
      this.postMessage({ status: this.status });
    }
  }

  resumeRecording() {
    this.setupRecording(this.constraints);
  }

  stopRecording() {
    this.status = 'STOPPED';

    if (!this.mp3Encoder) throw new Error('Encoder not defined.');

    this.audioBuffer = this.mp3Encoder.finish();

    this.postMessage({
      status: this.status,
      audioBuffer: this.audioBuffer
    });

    this.mp3Encoder = undefined;
    this.previousBuffer = undefined;
    this.constraints = DEFAULT_CONSTRAINTS;
  }

  override process(inputs: Float32Array[][]) {
    if (this.mp3Encoder && this.status === 'RECORDING') {
      this.mp3Encoder.encode(inputs[0][0]);
    }

    return true;
  }
}

registerProcessor('recorderWorklet', RecorderWorklet);
