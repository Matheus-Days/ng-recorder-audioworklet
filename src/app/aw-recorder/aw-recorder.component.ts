import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { auditTime, distinctUntilChanged, map } from 'rxjs';
import {
  AWAudioRecorderService,
  RecorderStatus
} from './aw-audio-recorder.service';

@Component({
  selector: 'aw-recorder',
  templateUrl: './aw-recorder.component.html',
  styleUrls: ['./aw-recorder.component.scss']
})
export class AWRecorderComponent implements OnInit {
  recorderStatus: RecorderStatus = 'IDLE';
  currentTimeSeconds: number = 0;
  currentTime: string = '00:00';

  constructor(
    private recorder: AWAudioRecorderService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.recorder.recorderStatus$.pipe(auditTime(200)).subscribe((status) => {
      this.recorderStatus = status;
      this.changeDetectorRef.detectChanges();
    });

    this.recorder.currentTime$
      .pipe(
        map((seconds) => AWRecorderComponent.formatTime(seconds)),
        distinctUntilChanged()
      )
      .subscribe((time) => {
        this.currentTime = time;
        this.changeDetectorRef.detectChanges();
      });
  }

  startRecording() {
    this.recorder.startRecording();
  }

  pauseRecording() {
    this.recorder.pauseRecording({ emitPreview: true });
  }

  resumeRecording() {
    this.recorder.resumeRecording();
  }

  stopRecording() {
    this.recorder.stopRecording();
  }

  clearRecording() {
    this.recorder.clear();
  }

  get recorderHeading(): string {
    switch (this.recorderStatus) {
      case 'INITIALIZING':
        return 'Starting...';
      case 'PAUSED':
        return 'Paused';
      case 'PAUSING':
        return 'Pausing...';
      case 'RECORDING':
        return 'Recording...';
      case 'STOPPED':
        return 'Stopped';
      case 'STOPPING':
        return 'Stopping...';
      default:
        return 'AudioWorklet Recorder';
    }
  }

  static formatTime(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    let minStr = String(min).length > 1 ? String(min) : '0' + String(min);
    let secStr = String(sec).length > 1 ? String(sec) : '0' + String(sec);

    return `${minStr}:${secStr}`;
  }
}
