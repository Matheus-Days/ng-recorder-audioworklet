import { CommonModule } from '@angular/common';
import { NgModule } from "@angular/core";
import { AWAudioRecorderService } from "./aw-audio-recorder.service";
import { AWRecorderComponent } from "./aw-recorder.component";


@NgModule({
  imports: [ CommonModule ],
  declarations: [ AWRecorderComponent ],
  providers: [ AWAudioRecorderService ],
  exports: [ AWRecorderComponent ]
})
export class AWRecorderModule {}