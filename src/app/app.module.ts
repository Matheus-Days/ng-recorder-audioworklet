import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { AWRecorderModule } from './aw-recorder/aw-recorder.module';
// import { SPNRecorderModule } from './spn-recorder/spn-recorder.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AWRecorderModule
    // SPNRecorderModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
