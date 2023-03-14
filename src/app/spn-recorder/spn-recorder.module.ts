import { CommonModule } from '@angular/common';
import { NgModule } from "@angular/core";
import { SPNAudioRecorderService } from "./spn-audio-recorder.service";
import { SPNRecorderComponent } from "./spn-recorder.component";


@NgModule({
  imports: [ CommonModule ],
  declarations: [ SPNRecorderComponent ],
  providers: [ SPNAudioRecorderService ],
  exports: [ SPNRecorderComponent ]
})
export class SPNRecorderModule {}