import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';
import { EditSupplierModalComponent } from '../../shared/components/modals/edit-supplier-modal/edit-supplier-modal.component';
import { SupplierOperationModalComponent } from '../../shared/components/modals/supplier-operation-modal/supplier-operation-modal.component';
import { CancelOperationDialogComponent } from '../../shared/components/modals/cancel-operation-dialog/cancel-operation-dialog.component';
import { SupplierService } from '../../core/services/supplier.service';
import { SupplierTransactionService } from '../../core/services/supplier-transaction.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ProfileService } from '../../core/services/profile.service';
import { SupplierTransaction, SupplierTransactionType } from '../../core/models/supplier-transaction.model';
import { isCancelled } from '../../core/utils/balance.util';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MOBILE_MONEY: 'Mobile Money'
};

@Component({
  selector: 'app-supplier-detail',
  imports: [
    NgClass,
    DatePipe,
    RouterLink,
    PageBreadcrumbComponent,
    ButtonComponent,
    BadgeComponent,
    AlertComponent,
    SkeletonComponent,
    EditSupplierModalComponent,
    SupplierOperationModalComponent,
    CancelOperationDialogComponent
  ],
  templateUrl: './supplier-detail.component.html'
})
export class SupplierDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly supplierService = inject(SupplierService);
  private readonly supplierTransactionService = inject(SupplierTransactionService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly profileService = inject(ProfileService);

  readonly showEditModal = signal(false);

  readonly showOperationModal = signal(false);
  readonly operationType = signal<SupplierTransactionType>('PURCHASE');
  readonly editingOperation = signal<SupplierTransaction | null>(null);

  readonly cancellingOperation = signal<SupplierTransaction | null>(null);
  readonly cancelling = signal(false);
  readonly cancelError = signal('');
  readonly cancelSummary = computed(() => {
    const op = this.cancellingOperation();
    if (!op) return '';
    const type = op.type === 'PURCHASE' ? 'Achat' : 'Règlement';
    return `${type} · ${op.label} · ${this.formatAmount(op.amount)}`;
  });

  readonly supplierId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' }
  );

  readonly loaded = computed(() => this.supplierService.loaded() && this.supplierTransactionService.loaded());
  readonly supplier = computed(() => this.supplierService.getById(this.supplierId()));
  readonly balance = computed(() => this.supplierTransactionService.balanceForSupplier(this.supplierId()));
  /** Historique complet : les opérations annulées restent visibles, barrées. */
  readonly history = computed(() => this.supplierTransactionService.historyForSupplier(this.supplierId()));

  /** Écriture réservée aux abonnés ; sinon la fiche reste consultable. */
  readonly canWrite = computed(() => this.subscriptionService.hasPaidAccess());

  readonly balanceLabel = computed(() => (this.balance() < 0 ? 'Avance chez le fournisseur' : 'Reste à payer'));

  formatAmount(amount: number): string {
    return this.profileService.formatAmount(amount);
  }

  paymentMethodLabel(method: string): string {
    return PAYMENT_METHOD_LABELS[method] ?? method;
  }

  openNewOperation(type: SupplierTransactionType): void {
    this.editingOperation.set(null);
    this.operationType.set(type);
    this.showOperationModal.set(true);
  }

  openEditOperation(operation: SupplierTransaction): void {
    this.editingOperation.set(operation);
    this.showOperationModal.set(true);
  }

  closeOperationModal(): void {
    this.showOperationModal.set(false);
    this.editingOperation.set(null);
  }

  isCancelled(item: SupplierTransaction): boolean {
    return isCancelled(item);
  }

  openCancel(operation: SupplierTransaction): void {
    this.cancelError.set('');
    this.cancellingOperation.set(operation);
  }

  closeCancel(): void {
    this.cancellingOperation.set(null);
  }

  confirmCancel(reason: string): void {
    const operation = this.cancellingOperation();
    if (!operation || this.cancelling()) {
      return;
    }
    this.cancelling.set(true);
    this.cancelError.set('');
    this.supplierTransactionService.cancel(operation.id, reason).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.cancellingOperation.set(null);
      },
      error: err => {
        this.cancelling.set(false);
        this.cancelError.set("L'annulation a échoué. Réessayez.");
        console.error("Échec de l'annulation de l'opération fournisseur", err);
      }
    });
  }
}
