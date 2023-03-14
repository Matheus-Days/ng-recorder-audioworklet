import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
// import { WorkerUrl } from 'worker-url';
import { AWAudioRecorderService } from './aw-recorder/aw-audio-recorder.service';

// type RecordingWorkletState =
//   | 'RECORDING'
//   | 'PAUSED'
//   | 'NOT_INITIATED'
//   | 'STOPPED';

// type RecordingWorkletMessage = {
//   state: RecordingWorkletState;
//   audioBuffer?: Int8Array[];
// }

// type MessageToRecordingWorklet = {
//   type: 'START' | 'PAUSE' | 'STOP';
//   mediaConstraints?: MediaStreamConstraints;
//   previewOnPause?: boolean;
// }

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  @ViewChild('player') player!: ElementRef<HTMLAudioElement>;

  audioUrl: SafeUrl = '';

  constructor(
    public recorderService: AWAudioRecorderService,
    private sanitizer: DomSanitizer,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.recorderService.audioUrl$.subscribe((url) => {
      this.audioUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      this.changeDetectorRef.detectChanges();
    });
  }

  // async start() {
  //   this.audioContext = new AudioContext();

  //   const constraints: MediaStreamConstraints = {
  //     audio: {
  //       noiseSuppression: true,
  //       channelCount: 1,
  //       sampleRate: 48000,
  //       sampleSize: 128
  //     }
  //   };
  //   this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

  //   const mediaStreamNode = this.audioContext.createMediaStreamSource(this.mediaStream);

  //   const workletUrl = new WorkerUrl(
  //     new URL('./aw-recorder/recorder.worklet.ts', import.meta.url),
  //     { name: 'worklet' }
  //   );

  //   await this.audioContext.audioWorklet.addModule(workletUrl);

  //   this.processorNode = new AudioWorkletNode(
  //     this.audioContext,
  //     'streamRecorder'
  //   );

  //   mediaStreamNode.connect(this.processorNode);

  //   this.processorNode.port.onmessage = (
  //     ev: MessageEvent<RecordingWorkletMessage>
  //   ) => {
  //     if (ev.data.state === 'PAUSED' && ev.data.audioBuffer) {
  //       const audioBlob = new Blob(ev.data.audioBuffer, { type: "audio/mp3" });
  //       this.audioUrl = this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(audioBlob));
  //       console.log(this.audioUrl)
  //       this.changeDetectorRef.detectChanges();
  //     }
  //   };

  //   this.audioContext.resume();

  //   const message: MessageToRecordingWorklet = { type: 'START' };
  //   this.processorNode.port.postMessage(message);
  // }

  // stop() {
  //   if (!this.processorNode) throw new Error('Processor node not defined.');

  //   const message: MessageToRecordingWorklet = { type: 'PAUSE', previewOnPause: true };
  //   this.processorNode.port.postMessage(message);
  //   // this.audioContext?.suspend();
  //   // console.log(this.samples);
  //   // this.samples = [];
  // }
}
