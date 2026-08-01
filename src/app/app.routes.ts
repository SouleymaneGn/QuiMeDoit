import { Routes } from '@angular/router';
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

export const routes: Routes = [
  {
    path:'',
    component:AppLayoutComponent,
    children:[
      {
        path: '',
        component: AccueilComponent,
        pathMatch: 'full',
        title: 'Accueil | iziCarnet',
      },
      {
        path:'customers',
        component:CustomersComponent,
        title:'Clients | iziCarnet'
      },
      {
        path:'customers/:id',
        component:CustomerDetailComponent,
        title:'Fiche client | iziCarnet'
      },
      {
        path:'payments',
        component:PaymentsComponent,
        title:'Paiements | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path:'profile',
        component:ProfileComponent,
        title:'Angular Profile Dashboard | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path:'parametres',
        component:ParametresComponent,
        title:'Paramètres | iziCarnet'
      },
    ]
  },
  // auth pages
  {
    path:'signin',
    component:SignInComponent,
    title:'Angular Sign In Dashboard | TailAdmin - Angular Admin Dashboard Template'
  },
  {
    path:'signup',
    component:SignUpComponent,
    title:'Angular Sign Up Dashboard | TailAdmin - Angular Admin Dashboard Template'
  },
  // error pages
  {
    path:'**',
    component:NotFoundComponent,
    title:'Angular NotFound Dashboard | TailAdmin - Angular Admin Dashboard Template'
  },
];
