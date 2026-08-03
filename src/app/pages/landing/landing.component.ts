import { Component, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-landing',
  imports: [RouterModule, ButtonComponent],
  templateUrl: './landing.component.html'
})
export class LandingComponent {
  readonly currentYear = new Date().getFullYear();

  readonly faqItems: FaqItem[] = [
    {
      question: 'Mes données sont-elles en sécurité ?',
      answer:
        "Oui. Vos données sont hébergées de façon sécurisée et ne sont accessibles qu'à vous, depuis votre compte."
    },
    {
      question: 'Dois-je installer une application ?',
      answer:
        'Non. iziCarnet fonctionne directement dans votre navigateur, sur téléphone comme sur ordinateur.'
    },
    {
      question: 'Puis-je changer la devise affichée ?',
      answer: 'Oui, vous pouvez choisir votre devise à tout moment dans les Paramètres.'
    },
    {
      question: 'Puis-je utiliser iziCarnet sur plusieurs appareils ?',
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
