import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { AccueilComponent } from './pages/accueil/accueil.component';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { SignInComponent } from './pages/auth-pages/sign-in/sign-in.component';
import { SignUpComponent } from './pages/auth-pages/sign-up/sign-up.component';
import { CustomersComponent } from './pages/customers/customers.component';
import { CustomerDetailComponent } from './pages/customer-detail/customer-detail.component';
import { ParametresComponent } from './pages/parametres/parametres.component';
import { PaymentsComponent } from './pages/payments/payments.component';
import { SuppliersComponent } from './pages/suppliers/suppliers.component';
import { SupplierDetailComponent } from './pages/supplier-detail/supplier-detail.component';
import { DebtsComponent } from './pages/debts/debts.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { AbonnementComponent } from './pages/abonnement/abonnement.component';
import { MerciComponent } from './pages/merci/merci.component';
import { SharedStatementComponent } from './pages/shared-statement/shared-statement.component';
import { authGuard } from './guards/auth.guard';
import { subscriptionGuard } from './guards/subscription.guard';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
    pathMatch: 'full',
    title: 'QuiMeDoit — Le carnet de dettes simple pour commerçants',
  },
  {
    path:'app',
    component:AppLayoutComponent,
    canActivate: [authGuard],
    children:[
      {
        path: '',
        component: AccueilComponent,
        pathMatch: 'full',
        title: 'Accueil | QuiMeDoit',
        canActivate: [subscriptionGuard],
      },
      {
        // Page « Dettes » : onglets Clients / Fournisseurs, adresses inchangées.
        path: '',
        component: DebtsComponent,
        canActivate: [subscriptionGuard],
        children: [
          {
            path:'customers',
            component:CustomersComponent,
            title:'Dettes clients | QuiMeDoit',
          },
          {
            // Réservé aux abonnés : la page gère elle-même le mode présentation / lecture seule.
            path:'suppliers',
            component:SuppliersComponent,
            title:'Dettes fournisseurs | QuiMeDoit',
          },
        ]
      },
      {
        path:'customers/:id',
        component:CustomerDetailComponent,
        title:'Fiche client | QuiMeDoit',
        canActivate: [subscriptionGuard],
      },
      {
        path:'suppliers/:id',
        component:SupplierDetailComponent,
        title:'Fiche fournisseur | QuiMeDoit',
        canActivate: [subscriptionGuard],
      },
      {
        path:'payments',
        component:PaymentsComponent,
        title:'Paiements | QuiMeDoit',
        canActivate: [subscriptionGuard],
      },
      {
        // Pas d'entrée dans le menu : accessible depuis l'Accueil et la page Paiements.
        path:'reports',
        component:ReportsComponent,
        title:'Rapports | QuiMeDoit',
        canActivate: [subscriptionGuard],
      },
      {
        path:'profile',
        component:ProfileComponent,
        title:'Profil | QuiMeDoit',
        canActivate: [subscriptionGuard],
      },
      {
        path:'parametres',
        component:ParametresComponent,
        title:'Paramètres | QuiMeDoit',
        canActivate: [subscriptionGuard],
      },
      {
        path:'abonnement',
        component:AbonnementComponent,
        title:'Mon abonnement | QuiMeDoit'
      },
    ]
  },
  {
    path: 'merci',
    component: MerciComponent,
    title: 'Merci | QuiMeDoit'
  },
  // Relevé partagé avec le client : public, sans compte ni abonnement.
  {
    path: 'releve/:token',
    component: SharedStatementComponent,
    title: 'Relevé de compte | QuiMeDoit'
  },
  // auth pages
  {
    path:'signin',
    component:SignInComponent,
    title:'Connexion | QuiMeDoit'
  },
  {
    path:'signup',
    component:SignUpComponent,
    title:'Créer un compte | QuiMeDoit'
  },
  // error pages
  {
    path:'**',
    component:NotFoundComponent,
    title:'Angular NotFound Dashboard | TailAdmin - Angular Admin Dashboard Template'
  },
];
