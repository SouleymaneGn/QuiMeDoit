import { NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  imports: [NgClass],
  templateUrl: './pagination.component.html'
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() totalItems = 0;
  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get startItem(): number {
    return this.totalItems === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goTo(n: number): void {
    if (n >= 1 && n <= this.totalPages && n !== this.page) {
      this.pageChange.emit(n);
    }
  }

  prev(): void {
    this.goTo(this.page - 1);
  }

  next(): void {
    this.goTo(this.page + 1);
  }
}
