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

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    { provide: CustomerRepository, useClass: SupabaseCustomerRepository },
    { provide: TransactionRepository, useClass: SupabaseTransactionRepository },
    { provide: ProfileRepository, useClass: SupabaseProfileRepository }
  ]
};
