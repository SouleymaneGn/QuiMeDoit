import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { AppLogoComponent } from '../../shared/components/common/app-logo/app-logo.component';

@Component({
  selector: 'app-merci',
  imports: [RouterModule, ButtonComponent, AppLogoComponent],
  templateUrl: './merci.component.html'
})
export class MerciComponent {}
