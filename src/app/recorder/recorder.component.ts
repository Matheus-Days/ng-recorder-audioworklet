import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { distinctUntilChanged, map } from 'rxjs';
import { AudioRecorderService, RecorderStatus } from "./audio-recorder.service";


@Component({
  selector: 'recorder',
  templateUrl: './recorder.component.html',
  styleUrls: ['./recorder.component.scss']
})
export class RecorderComponent implements OnInit {

  recorderStatus: RecorderStatus = 'IDLE';
  currentTimeSeconds: number = 0;
  currentTime: string = '00:00';

  constructor(private recorder: AudioRecorderService, private changeDetectorRef: ChangeDetectorRef) { }
  
  ngOnInit(): void {
    this.recorder.recorderStatus$.subscribe(status => this.recorderStatus = status);
  
    this.recorder.currentTime$
      .pipe(
        map(seconds => RecorderComponent.formatTime(seconds)),
        distinctUntilChanged()
      ).subscribe(time => {
        this.currentTime = time;
        this.changeDetectorRef.detectChanges();
      });
  }

  startRecording() {
    this.recorder.startRecording();
  }

  pauseRecording() {
    this.recorder.pauseRecording(true);
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

  static formatTime(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    let minStr = String(min).length > 1 ? String(min) : '0' + String(min);
    let secStr = String(sec).length > 1 ? String(sec) : '0' + String(sec);
  
    return `${minStr}:${secStr}`;
  }

}