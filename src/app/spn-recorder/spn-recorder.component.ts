import { ChangeDetectorRef, Component, Input, OnInit } from "@angular/core";
import { distinctUntilChanged, map } from 'rxjs';
import { SPNAudioRecorderService, RecorderStatus } from "./spn-audio-recorder.service";


@Component({
  selector: 'spn-recorder',
  templateUrl: './spn-recorder.component.html',
  styleUrls: ['./spn-recorder.component.scss']
})
export class SPNRecorderComponent implements OnInit {

  recorderStatus: RecorderStatus = 'IDLE';
  currentTimeSeconds: number = 0;
  currentTime: string = '00:00';

  constructor(private recorder: SPNAudioRecorderService, private changeDetectorRef: ChangeDetectorRef) { }
  
  ngOnInit(): void {
    this.recorder.recorderStatus$.subscribe(status => this.recorderStatus = status);
  
    this.recorder.currentTime$
      .pipe(
        map(seconds => SPNRecorderComponent.formatTime(seconds)),
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

  get recorderHeading(): string {
    switch(this.recorderStatus) {
      case 'INITIALIZING': return 'Starting...';
      case 'PAUSED': return 'Paused';
      case 'PAUSING': return 'Pausing...';
      case 'RECORDING': return 'Recording...';
      case 'STOPPED': return 'Stopped';
      case 'STOPPING': return 'Stopping...';
      default: return 'ScriptProcessorNode Recorder';
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