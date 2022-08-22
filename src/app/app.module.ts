import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { RecorderModule } from './recorder/recorder.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    RecorderModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
