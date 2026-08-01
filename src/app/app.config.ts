import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { CustomerRepository } from './core/repositories/customer.repository';
import { JsonCustomerRepository } from './core/repositories/json/json-customer.repository';
import { TransactionRepository } from './core/repositories/transaction.repository';
import { JsonTransactionRepository } from './core/repositories/json/json-transaction.repository';
import { ProfileRepository } from './core/repositories/profile.repository';
import { JsonProfileRepository } from './core/repositories/json/json-profile.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    { provide: CustomerRepository, useClass: JsonCustomerRepository },
    { provide: TransactionRepository, useClass: JsonTransactionRepository },
    { provide: ProfileRepository, useClass: JsonProfileRepository }
  ]
};
