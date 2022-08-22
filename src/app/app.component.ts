import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { AudioRecorderService } from './recorder/audio-recorder.service';
import { WorkerUrl } from 'worker-url';
import { Mp3Object } from './recorder/Mp3Encoder';

type RecordingWorkletState =
  | 'RECORDING'
  | 'PAUSED'
  | 'NOT_INITIATED'
  | 'STOPPED';

type RecordingWorkletMessage = {
  state: RecordingWorkletState;
  audioRecord?: Mp3Object;
};

type MessageToRecordingWorklet = {
  type: 'START' | 'PAUSE' | 'STOP';
  mediaConstraints?: MediaStreamConstraints;
  previewOnPause?: boolean;
} 

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  @ViewChild('player') player!: ElementRef<HTMLAudioElement>;

  audioUrl: SafeUrl = '';
  audioContext!: AudioContext | null;
  processorNode!: AudioWorkletNode;
  samples: any[] = [];
  mediaStream: MediaStream | undefined;

  constructor(
    public recorderService: AudioRecorderService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.recorderService.audioUrl.subscribe(
      (url) =>
        (this.audioUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url))
    );
  }

  async start() {
    this.audioContext = new AudioContext();

    const constraints: MediaStreamConstraints = {
      audio: {
        noiseSuppression: true,
        channelCount: 1,
        sampleRate: 48000,
        sampleSize: 128
      }
    };
    this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

    const mediaStreamNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    const workletUrl = new WorkerUrl(
      new URL('./recorder/worklet.ts', import.meta.url),
      { name: 'worklet' }
    );

    await this.audioContext.audioWorklet.addModule(workletUrl);

    this.processorNode = new AudioWorkletNode(
      this.audioContext,
      'streamRecorder'
    );
    
    mediaStreamNode.connect(this.audioContext.destination);
    mediaStreamNode.connect(this.processorNode);
    // tentando conectar o mediaStreamNode ao processorNode sem feedback de som

    this.processorNode.port.onmessage = (
      ev: MessageEvent<RecordingWorkletMessage>
    ) => {
      if (ev.data.state === 'PAUSED' && ev.data.audioRecord) {
        this.audioUrl = this.sanitizer.bypassSecurityTrustResourceUrl(ev.data.audioRecord?.url);
      }
    };

    this.audioContext.resume();

    const message: MessageToRecordingWorklet = { type: 'START' };
    this.processorNode.port.postMessage(message);
  }

  stop() {
    if (!this.processorNode) throw new Error('Processor node not defined.');

    const message: MessageToRecordingWorklet = { type: 'PAUSE', previewOnPause: true };
    this.processorNode.port.postMessage(message);
    // this.audioContext?.suspend();
    // console.log(this.samples);
    // this.samples = [];
  }
}
