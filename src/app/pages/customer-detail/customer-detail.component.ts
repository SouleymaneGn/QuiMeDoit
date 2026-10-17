import { DatePipe, NgClass } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { NewDebtModalComponent } from '../../shared/components/modals/new-debt-modal/new-debt-modal.component';
import { NewPaymentModalComponent } from '../../shared/components/modals/new-payment-modal/new-payment-modal.component';
import { EditCustomerModalComponent } from '../../shared/components/modals/edit-customer-modal/edit-customer-modal.component';
import { EditDebtModalComponent } from '../../shared/components/modals/edit-debt-modal/edit-debt-modal.component';
import { CancelOperationDialogComponent } from '../../shared/components/modals/cancel-operation-dialog/cancel-operation-dialog.component';
import { EditPaymentModalComponent } from '../../shared/components/modals/edit-payment-modal/edit-payment-modal.component';
import { CustomerService } from '../../core/services/customer.service';
import { TransactionService } from '../../core/services/transaction.service';
import { ProfileService } from '../../core/services/profile.service';
import { StatementPreviewModalComponent } from '../../shared/components/modals/statement-preview-modal/statement-preview-modal.component';
import { PhotoViewerModalComponent } from '../../shared/components/modals/photo-viewer-modal/photo-viewer-modal.component';
import { Transaction, TransactionType } from '../../core/models/transaction.model';
import { TRANSACTION_TYPE_LABELS, paymentMethodLabel } from '../../core/utils/operation.util';
import { PhotoProofPanelComponent, ProofOperation } from '../../shared/components/photo-proof-panel/photo-proof-panel.component';
import { proofMessage } from '../../core/utils/whatsapp.util';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';
import { hasCreditLimit, isOverCreditLimit } from '../../core/utils/credit-limit.util';
import { balanceLabel, isCancelled } from '../../core/utils/balance.util';

@Component({
  selector: 'app-customer-detail',
  imports: [
    NgClass,
    DatePipe,
    RouterLink,
    PageBreadcrumbComponent,
    ButtonComponent,
    AlertComponent,
    NewDebtModalComponent,
    NewPaymentModalComponent,
    EditCustomerModalComponent,
    EditDebtModalComponent,
    CancelOperationDialogComponent,
    EditPaymentModalComponent,
    StatementPreviewModalComponent,
    PhotoViewerModalComponent,
    PhotoProofPanelComponent
  ],
  templateUrl: './customer-detail.component.html'
})
export class CustomerDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly customerService = inject(CustomerService);
  private readonly transactionService = inject(TransactionService);
  private readonly profileService = inject(ProfileService);

  readonly showNewDebtModal = signal(false);
  readonly showNewPaymentModal = signal(false);
  readonly showEditModal = signal(false);

  readonly showEditDebtModal = signal(false);
  readonly editingDebt = signal<Transaction | null>(null);

  readonly showEditPaymentModal = signal(false);
  readonly editingPayment = signal<Transaction | null>(null);

  readonly cancellingOperation = signal<Transaction | null>(null);
  readonly cancelling = signal(false);
  readonly cancelError = signal('');
  readonly cancelSummary = computed(() => {
    const op = this.cancellingOperation();
    return op ? `${this.typeLabel(op.type)} · ${op.label} · ${this.formatAmount(op.amount)}` : '';
  });

  readonly showStatementModal = signal(false);

  /** Opération dont on affiche la photo en grand. */
  readonly viewingPhoto = signal<Transaction | null>(null);

  private readonly proofPanel = viewChild<ElementRef<HTMLElement>>('proofPanel');
  private readonly selectedId = signal<string | null>(null);

  readonly customerId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' }
  );

  readonly customer = computed(() => this.customerService.getById(this.customerId()));
  readonly balance = computed(() => this.transactionService.balanceForCustomer(this.customerId()));
  readonly balanceDisplay = computed(() => balanceLabel(this.balance()));
  /** Historique complet : les opérations annulées restent visibles, barrées. */
  readonly history = computed(() => this.transactionService.historyForCustomer(this.customerId()));
  readonly hasActiveOperations = computed(() => this.history().some(t => !isCancelled(t)));

  /** Opérations avec photo justificative, parcourues par les flèches du panneau. */
  readonly photoOperations = computed(() => this.history().filter(t => !!t.photoPath));
  /** Opération affichée dans le panneau : par défaut la plus récente avec photo. */
  readonly selectedOperation = computed<Transaction | null>(() => {
    const history = this.history();
    const id = this.selectedId();
    return history.find(t => t.id === id) ?? this.photoOperations()[0] ?? history[0] ?? null;
  });
  private readonly selectedPhotoIndex = computed(() =>
    this.photoOperations().findIndex(t => t.id === this.selectedOperation()?.id)
  );
  readonly selectedProof = computed<ProofOperation | null>(() => {
    const op = this.selectedOperation();
    if (!op) return null;
    const details = [op.label];
    if (op.type === 'PAYMENT') details.push(paymentMethodLabel(op.paymentMethod));
    if (op.paidBy) details.push(`payé par ${op.paidBy}`);
    return {
      id: op.id,
      typeLabel: this.typeLabel(op.type),
      createdAt: op.createdAt,
      amount: op.amount,
      increasesBalance: op.type === 'DEBT',
      details: details.join(' · '),
      photoPath: op.photoPath ?? null,
      cancelled: isCancelled(op)
    };
  });
  readonly previousPhotoOperation = computed(() => this.photoAt(-1));
  readonly nextPhotoOperation = computed(() => this.photoAt(1));

  readonly creditLimit = computed(() => {
    const limit = this.customer()?.creditLimit;
    return hasCreditLimit(limit) ? limit : null;
  });
  readonly overCreditLimit = computed(() => isOverCreditLimit(this.balance(), this.creditLimit()));
  readonly availableCredit = computed(() => (this.creditLimit() ?? 0) - Math.max(0, this.balance()));
  readonly overCreditLimitMessage = computed(() => {
    const limit = this.creditLimit() ?? 0;
    return (
      `Ce client doit ${this.formatAmount(this.balance() - limit)} de plus que son plafond de ` +
      `${this.formatAmount(limit)}. Pensez à encaisser avant de lui accorder une nouvelle dette.`
    );
  });

  formatAmount(amount: number): string {
    return this.profileService.formatAmount(amount);
  }

  typeLabel(type: TransactionType): string {
    return TRANSACTION_TYPE_LABELS[type];
  }

  readonly proofShareMessage = (link?: string): string => {
    const op = this.selectedOperation();
    if (!op) return '';
    return proofMessage(
      this.customer()?.name ?? '',
      this.typeLabel(op.type),
      op.createdAt,
      this.formatAmount(op.amount),
      this.profileService.profile()?.businessName ?? '',
      link
    );
  };

  readonly saveProofPhoto = (operationId: string, photoPath: string | null) =>
    this.transactionService.update(operationId, { photoPath });

  methodLabel(method: string): string {
    return paymentMethodLabel(method);
  }

  /** Sur mobile, le panneau est sous la liste : on y descend après une sélection. */
  selectOperation(item: Transaction, scroll = true): void {
    this.selectedId.set(item.id);
    if (scroll && window.matchMedia('(max-width: 1023px)').matches) {
      this.proofPanel()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Photo voisine dans l'ordre de la liste ; si l'opération sélectionnée n'a pas de photo,
   * « suivant » mène à la première photo.
   */
  private photoAt(offset: 1 | -1): Transaction | null {
    const photos = this.photoOperations();
    const index = this.selectedPhotoIndex();
    if (index === -1) {
      return offset === 1 ? photos[0] ?? null : null;
    }
    return photos[index + offset] ?? null;
  }

  isCancelled(item: Transaction): boolean {
    return isCancelled(item);
  }

  /** Chaque type a sa fenêtre de modification. */
  openEdit(item: Transaction): void {
    if (item.type === 'DEBT') {
      this.editingDebt.set(item);
      this.showEditDebtModal.set(true);
    } else {
      this.editingPayment.set(item);
      this.showEditPaymentModal.set(true);
    }
  }

  openCancel(item: Transaction): void {
    this.cancelError.set('');
    this.cancellingOperation.set(item);
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
    this.transactionService.cancel(operation.id, reason).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.cancellingOperation.set(null);
      },
      error: err => {
        this.cancelling.set(false);
        this.cancelError.set("L'annulation a échoué. Réessayez.");
        console.error("Échec de l'annulation de l'opération", err);
      }
    });
  }
}
