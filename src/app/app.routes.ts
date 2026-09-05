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
import { ProfileComponent } from './pages/profile/profile.component';
import { AbonnementComponent } from './pages/abonnement/abonnement.component';
import { MerciComponent } from './pages/merci/merci.component';
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
        path:'customers',
        component:CustomersComponent,
        title:'Clients | QuiMeDoit',
        canActivate: [subscriptionGuard],
      },
      {
        path:'customers/:id',
        component:CustomerDetailComponent,
        title:'Fiche client | QuiMeDoit',
        canActivate: [subscriptionGuard],
      },
      {
        path:'payments',
        component:PaymentsComponent,
        title:'Paiements | QuiMeDoit',
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
