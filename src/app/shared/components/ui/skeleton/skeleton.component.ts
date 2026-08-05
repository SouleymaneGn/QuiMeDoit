import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  imports: [NgClass],
  template: `<div class="animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" [ngClass]="className"></div>`
})
export class SkeletonComponent {
  @Input() className = 'h-4 w-full';
}
