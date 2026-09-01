import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-logo',
  templateUrl: './app-logo.component.html'
})
export class AppLogoComponent {
  /** Taille du badge en pixels. */
  @Input() size = 32;
}
