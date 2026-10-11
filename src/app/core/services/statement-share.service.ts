import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CustomerStatement } from '../models/customer-statement.model';
import { SharedStatementData, StatementShare } from '../models/statement-share.model';
import { StatementShareRepository } from '../repositories/statement-share.repository';
import { buildStatement } from '../utils/statement.util';

/** Lien public prêt à partager. */
export interface StatementLink {
  url: string;
  expiresAt: string;
}

/** Relevé consulté via un lien public. */
export interface PublicStatement {
  businessName: string;
  expiresAt: string;
  statement: CustomerStatement;
}

@Injectable({ providedIn: 'root' })
export class StatementShareService {
  private readonly repository = inject(StatementShareRepository);

  /** Lien actif du client, s'il en existe un. */
  async getActiveLink(customerId: string): Promise<StatementLink | null> {
    const share = await firstValueFrom(this.repository.getActiveForCustomer(customerId));
    return share ? toLink(share) : null;
  }

  /** Réutilise le lien actif du client, ou en crée un nouveau (valable 30 jours). */
  async getOrCreateLink(customerId: string): Promise<StatementLink> {
    const existing = await firstValueFrom(this.repository.getActiveForCustomer(customerId));
    const share = existing ?? (await firstValueFrom(this.repository.create(customerId)));
    return toLink(share);
  }

  /** Désactive les liens du client : ils afficheront « lien invalide ou expiré ». */
  async revoke(customerId: string): Promise<void> {
    await firstValueFrom(this.repository.revokeForCustomer(customerId));
  }

  /** Relevé complet (tout l'historique, solde à jour) d'un lien public ; null si le lien n'est plus valide. */
  async loadPublic(token: string): Promise<PublicStatement | null> {
    const data = await firstValueFrom(this.repository.getPublic(token));
    return data ? toPublicStatement(data) : null;
  }
}

function toLink(share: StatementShare): StatementLink {
  return {
    url: new URL(`releve/${share.token}`, document.baseURI).toString(),
    expiresAt: share.expiresAt
  };
}

function toPublicStatement(data: SharedStatementData): PublicStatement {
  return {
    businessName: data.businessName,
    expiresAt: data.expiresAt,
    statement: buildStatement(
      { name: data.customerName, phone: data.customerPhone },
      data.transactions,
      data.currency
    )
  };
}
