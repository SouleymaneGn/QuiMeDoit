import { DatePipe, NgClass } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';
import { EditSupplierModalComponent } from '../../shared/components/modals/edit-supplier-modal/edit-supplier-modal.component';
import { SupplierOperationModalComponent } from '../../shared/components/modals/supplier-operation-modal/supplier-operation-modal.component';
import { CancelOperationDialogComponent } from '../../shared/components/modals/cancel-operation-dialog/cancel-operation-dialog.component';
import { PhotoViewerModalComponent } from '../../shared/components/modals/photo-viewer-modal/photo-viewer-modal.component';
import { PhotoProofPanelComponent, ProofOperation } from '../../shared/components/photo-proof-panel/photo-proof-panel.component';
import { SupplierService } from '../../core/services/supplier.service';
import { SupplierTransactionService } from '../../core/services/supplier-transaction.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ProfileService } from '../../core/services/profile.service';
import { SupplierTransaction, SupplierTransactionType } from '../../core/models/supplier-transaction.model';
import { isCancelled } from '../../core/utils/balance.util';
import { supplierProofMessage } from '../../core/utils/whatsapp.util';

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
    AlertComponent,
    SkeletonComponent,
    EditSupplierModalComponent,
    SupplierOperationModalComponent,
    CancelOperationDialogComponent,
    PhotoViewerModalComponent,
    PhotoProofPanelComponent
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

  /** Opération dont on affiche la photo en grand. */
  readonly viewingPhoto = signal<SupplierTransaction | null>(null);

  private readonly proofPanel = viewChild<ElementRef<HTMLElement>>('proofPanel');
  private readonly selectedId = signal<string | null>(null);

  readonly cancellingOperation = signal<SupplierTransaction | null>(null);
  readonly cancelling = signal(false);
  readonly cancelError = signal('');
  readonly cancelSummary = computed(() => {
    const op = this.cancellingOperation();
    if (!op) return '';
    return `${this.typeLabel(op)} · ${op.label} · ${this.formatAmount(op.amount)}`;
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

  /** Opérations avec photo justificative, parcourues par les flèches du panneau. */
  readonly photoOperations = computed(() => this.history().filter(t => !!t.photoPath));
  /** Opération affichée dans le panneau : par défaut la plus récente avec photo. */
  readonly selectedOperation = computed<SupplierTransaction | null>(() => {
    const history = this.history();
    const id = this.selectedId();
    return history.find(t => t.id === id) ?? this.photoOperations()[0] ?? history[0] ?? null;
  });
  readonly selectedProof = computed<ProofOperation | null>(() => {
    const op = this.selectedOperation();
    if (!op) return null;
    const details = [op.label];
    if (op.type === 'PAYMENT') details.push(this.paymentMethodLabel(op.paymentMethod));
    return {
      id: op.id,
      typeLabel: this.typeLabel(op),
      createdAt: op.createdAt,
      amount: op.amount,
      increasesBalance: op.type === 'PURCHASE',
      details: details.join(' · '),
      photoPath: op.photoPath ?? null,
      cancelled: isCancelled(op)
    };
  });
  private readonly selectedPhotoIndex = computed(() =>
    this.photoOperations().findIndex(t => t.id === this.selectedOperation()?.id)
  );
  readonly previousPhotoOperation = computed(() => this.photoAt(-1));
  readonly nextPhotoOperation = computed(() => this.photoAt(1));

  readonly proofShareMessage = (link?: string): string => {
    const op = this.selectedOperation();
    if (!op) return '';
    return supplierProofMessage(
      this.supplier()?.name ?? '',
      this.typeLabel(op),
      op.createdAt,
      this.formatAmount(op.amount),
      this.profileService.profile()?.businessName ?? '',
      link
    );
  };

  readonly saveProofPhoto = (operationId: string, photoPath: string | null) =>
    this.supplierTransactionService.update(operationId, { photoPath });

  /** Écriture réservée aux abonnés ; sinon la fiche reste consultable. */
  readonly canWrite = computed(() => this.subscriptionService.hasPaidAccess());

  readonly balanceLabel = computed(() => (this.balance() < 0 ? 'Avance chez le fournisseur' : 'Reste à payer'));

  formatAmount(amount: number): string {
    return this.profileService.formatAmount(amount);
  }

  paymentMethodLabel(method: string): string {
    return PAYMENT_METHOD_LABELS[method] ?? method;
  }

  typeLabel(item: SupplierTransaction): string {
    return item.type === 'PURCHASE' ? 'Achat' : 'Règlement';
  }

  /** Sur mobile, le panneau est sous la liste : on y descend après une sélection. */
  selectOperation(item: SupplierTransaction, scroll = true): void {
    this.selectedId.set(item.id);
    if (scroll && window.matchMedia('(max-width: 1023px)').matches) {
      this.proofPanel()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Photo voisine dans l'ordre de la liste ; si l'opération sélectionnée n'a pas de photo,
   * « suivant » mène à la première photo.
   */
  private photoAt(offset: 1 | -1): SupplierTransaction | null {
    const photos = this.photoOperations();
    const index = this.selectedPhotoIndex();
    if (index === -1) {
      return offset === 1 ? photos[0] ?? null : null;
    }
    return photos[index + offset] ?? null;
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
