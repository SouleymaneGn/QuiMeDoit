import { Observable } from 'rxjs';
import { SharedStatementData, StatementShare } from '../models/statement-share.model';

export abstract class StatementShareRepository {
  /** Lien encore valide (non expiré, non désactivé) le plus récent du client, s'il existe. */
  abstract getActiveForCustomer(customerId: string): Observable<StatementShare | undefined>;
  abstract create(customerId: string): Observable<StatementShare>;
  /** Désactive tous les liens actifs du client. */
  abstract revokeForCustomer(customerId: string): Observable<void>;
  /** Lecture publique (sans compte) ; undefined si le jeton est inconnu, expiré ou désactivé. */
  abstract getPublic(token: string): Observable<SharedStatementData | undefined>;
}
