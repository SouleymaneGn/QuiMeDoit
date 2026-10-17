import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { CustomerRepository } from './core/repositories/customer.repository';
import { SupabaseCustomerRepository } from './core/repositories/supabase/supabase-customer.repository';
import { TransactionRepository } from './core/repositories/transaction.repository';
import { SupabaseTransactionRepository } from './core/repositories/supabase/supabase-transaction.repository';
import { ProfileRepository } from './core/repositories/profile.repository';
import { SupabaseProfileRepository } from './core/repositories/supabase/supabase-profile.repository';
import { SubscriptionRepository } from './core/repositories/subscription.repository';
import { SupabaseSubscriptionRepository } from './core/repositories/supabase/supabase-subscription.repository';
import { StatementShareRepository } from './core/repositories/statement-share.repository';
import { SupabaseStatementShareRepository } from './core/repositories/supabase/supabase-statement-share.repository';
import { SupplierRepository } from './core/repositories/supplier.repository';
import { SupabaseSupplierRepository } from './core/repositories/supabase/supabase-supplier.repository';
import { SupplierTransactionRepository } from './core/repositories/supplier-transaction.repository';
import { SupabaseSupplierTransactionRepository } from './core/repositories/supabase/supabase-supplier-transaction.repository';
import { DebtPhotoRepository } from './core/repositories/debt-photo.repository';
import { SupabaseDebtPhotoRepository } from './core/repositories/supabase/supabase-debt-photo.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    { provide: CustomerRepository, useClass: SupabaseCustomerRepository },
    { provide: TransactionRepository, useClass: SupabaseTransactionRepository },
    { provide: ProfileRepository, useClass: SupabaseProfileRepository },
    { provide: SubscriptionRepository, useClass: SupabaseSubscriptionRepository },
    { provide: StatementShareRepository, useClass: SupabaseStatementShareRepository },
    { provide: SupplierRepository, useClass: SupabaseSupplierRepository },
    { provide: SupplierTransactionRepository, useClass: SupabaseSupplierTransactionRepository },
    { provide: DebtPhotoRepository, useClass: SupabaseDebtPhotoRepository }
  ]
};
