import { cloneDeep } from 'lodash-es';
import { Mp3Encoder, Mp3Object } from './Mp3Encoder';

type RecordingWorkletState = 'RECORDING' | 'PAUSED' | 'NOT_INITIATED' | 'STOPPED';

type IncomingMessages = {
  type: 'START' | 'PAUSE' | 'STOP';
  mediaConstraints?: MediaStreamConstraints;
  previewOnPause?: boolean;
} 

type OutgoingMessages = {
  state: RecordingWorkletState;
  audioRecord?: Mp3Object;
}

type AudioWorkletProcessorType = {
	readonly port: MessagePort;
	process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
};

declare const AudioWorkletProcessor: {
	prototype: AudioWorkletProcessorType;
	new(options?: AudioWorkletNodeOptions): AudioWorkletProcessorType;
};

declare const registerProcessor: (name: string, AudioWorkletProcessor: any) => void

const DEFAULT_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    noiseSuppression: true,
    channelCount: 1,
    sampleRate: 48000,
    sampleSize: 128
  },
}

class StreamRecorder extends AudioWorkletProcessor {

  mp3Encoder: Mp3Encoder | undefined;
  prevDataBuffer: any[] | undefined;
  state: RecordingWorkletState = 'NOT_INITIATED';
  audioRecord!: Mp3Object;
  constraints: MediaStreamConstraints = DEFAULT_CONSTRAINTS;

  constructor() {
    super();

    this.port.onmessage = (ev: MessageEvent<IncomingMessages>) => {
      switch(ev.data.type) {
        case 'START':
          this.startRecorder(ev.data.mediaConstraints);
          break;
        case 'PAUSE':
          const emitPreview = ev.data.previewOnPause || false;
          this.pauseRecording({ emitPreview });
          break;
        case 'STOP':
          this.stopRecording();
      }
    }
  }

  postMessage(msg: OutgoingMessages) {
    this.port.postMessage(msg);
  }

  setupRecording(constraints: MediaStreamConstraints) {
    try {
      this.mp3Encoder = new Mp3Encoder({
        bitRate: Number((constraints.audio as MediaTrackConstraints).sampleSize),
        sampleRate: Number((constraints.audio as MediaTrackConstraints).sampleRate),
        dataBuffer: this.prevDataBuffer,
      });

      this.state = 'RECORDING';
      this.postMessage({state: this.state});
    } catch {
      throw new Error('Error while creating new mp3Encoder');
    }
  }

  startRecorder(constraints?: MediaStreamConstraints) {
    if (constraints) this.constraints = constraints;

    this.setupRecording(constraints || this.constraints);
  }

  pauseRecording(opt?: { emitPreview: boolean }) {
    this.state = 'PAUSED';

    if (!this.mp3Encoder) throw new Error('Encoder not defined.');

    if (opt?.emitPreview) {
      this.prevDataBuffer = cloneDeep(this.mp3Encoder.dataBuffer);
      this.audioRecord = this.mp3Encoder.finish();
      
      this.postMessage({state: this.state, audioRecord: this.audioRecord});
    } else {
      this.postMessage({state: this.state});
    }
  }

  resumeRecording() {
    this.setupRecording(this.constraints);
  }

  stopRecording () {
    this.state = 'STOPPED';
    
    if (!this.mp3Encoder) throw new Error('Encoder not defined.');

    this.audioRecord = this.mp3Encoder.finish();
    
    this.mp3Encoder = undefined;
    this.prevDataBuffer = undefined;
    this.constraints = DEFAULT_CONSTRAINTS;
  }

  override process(inputs: any, outputs: any) {
    if (this.mp3Encoder && this.state === 'RECORDING') {
      console.log(inputs)
      this.mp3Encoder.encode(inputs[0][0]);
    }

    return true;
  }
}

registerProcessor('streamRecorder', StreamRecorder);