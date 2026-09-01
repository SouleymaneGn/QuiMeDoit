import { Component, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { AppLogoComponent } from '../../shared/components/common/app-logo/app-logo.component';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-landing',
  imports: [RouterModule, ButtonComponent, AppLogoComponent],
  templateUrl: './landing.component.html'
})
export class LandingComponent {
  readonly currentYear = new Date().getFullYear();

  readonly faqItems: FaqItem[] = [
    {
      question: 'Combien de temps faut-il pour noter une dette ?',
      answer:
        "Moins de 10 secondes : recherchez ou créez le client, indiquez le libellé et le montant, puis enregistrez."
    },
    {
      question: "Où retrouver l'historique d'un client ?",
      answer:
        "Directement sur sa fiche : nom, téléphone, dette actuelle et historique complet des dettes et paiements au même endroit."
    },
    {
      question: 'Mes données sont-elles en sécurité ?',
      answer:
        "Oui. Vos données sont hébergées de façon sécurisée et ne sont accessibles qu'à vous, depuis votre compte."
    },
    {
      question: 'Dois-je installer une application ?',
      answer:
        'Non. QuiMeDoit fonctionne directement dans votre navigateur, sur téléphone comme sur ordinateur.'
    },
    {
      question: 'Puis-je changer la devise affichée ?',
      answer: 'Oui, la devise CFA est utilisée par défaut mais reste modifiable à tout moment dans les Paramètres.'
    },
    {
      question: 'Les numéros de téléphone internationaux sont-ils pris en charge ?',
      answer:
        "Oui, plus de 190 indicatifs de pays sont disponibles avec recherche par nom ou indicatif lors de l'ajout d'un client."
    },
    {
      question: 'Puis-je utiliser QuiMeDoit sur plusieurs appareils ?',
      answer:
        'Oui. Connectez-vous simplement avec vos identifiants depuis n\'importe quel appareil pour retrouver vos données.'
    }
  ];

  readonly openFaqIndex = signal<number | null>(null);

  constructor(private readonly router: Router) {}

  goTo(path: string): void {
    this.router.navigate([path]);
  }

  toggleFaq(index: number): void {
    this.openFaqIndex.update(current => (current === index ? null : index));
  }
}
