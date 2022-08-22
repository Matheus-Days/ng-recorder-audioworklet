import { CommonModule } from '@angular/common';
import { NgModule } from "@angular/core";
import { AudioRecorderService } from "./audio-recorder.service";
import { RecorderComponent } from "./recorder.component";


@NgModule({
  imports: [ CommonModule ],
  declarations: [ RecorderComponent ],
  providers: [ AudioRecorderService ],
  exports: [ RecorderComponent ]
})
export class RecorderModule {}