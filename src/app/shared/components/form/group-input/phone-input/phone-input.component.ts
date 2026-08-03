import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { DropdownComponent } from '../../../ui/dropdown/dropdown.component';
import { PHONE_COUNTRIES, PhoneCountry } from './phone-countries';

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

@Component({
  selector: 'app-phone-input',
  imports: [DropdownComponent],
  templateUrl: './phone-input.component.html'
})
export class PhoneInputComponent {
  @Input() id?: string;
  @Input() placeholder = '622 12 34 56';
  @Input() disabled = false;

  @Input()
  set value(val: string | undefined) {
    this.applyExternalValue(val ?? '');
  }

  @Output() valueChange = new EventEmitter<string>();

  readonly countries = PHONE_COUNTRIES;
  readonly selectedCountry = signal<PhoneCountry>(PHONE_COUNTRIES[0]);
  readonly localNumber = signal('');
  readonly dropdownOpen = signal(false);
  readonly search = signal('');

  readonly filteredCountries = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return this.countries;
    }
    return this.countries.filter(
      c => c.name.toLowerCase().includes(term) || c.dialCode.includes(term)
    );
  });

  private lastEmitted = '';

  private applyExternalValue(raw: string): void {
    const trimmed = raw.trim();
    if (trimmed === this.lastEmitted) {
      // Écho de notre propre dernière émission : ne pas réinitialiser la saisie en cours.
      return;
    }
    if (!trimmed) {
      this.localNumber.set('');
      return;
    }
    if (trimmed.startsWith('+')) {
      const match = this.countries.find(c => trimmed.startsWith(c.dialCode));
      if (match) {
        this.selectedCountry.set(match);
        this.localNumber.set(trimmed.slice(match.dialCode.length).trim());
        return;
      }
    }
    this.localNumber.set(trimmed);
  }

  toggleDropdown(): void {
    if (this.disabled) {
      return;
    }
    this.dropdownOpen.update(v => !v);
    this.search.set('');
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  selectCountry(country: PhoneCountry): void {
    this.selectedCountry.set(country);
    this.dropdownOpen.set(false);
    this.emit();
  }

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  onLocalNumberInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const trimmed = raw.trim();

    // Saisie/collage d'un numéro complet avec indicatif : on détecte le pays automatiquement.
    if (trimmed.startsWith('+')) {
      const match = this.countries.find(c => trimmed.startsWith(c.dialCode));
      if (match) {
        this.selectedCountry.set(match);
        this.localNumber.set(trimmed.slice(match.dialCode.length).trim());
        this.emit();
        return;
      }
    }

    this.localNumber.set(raw);
    this.emit();
  }

  private emit(): void {
    const digits = digitsOnly(this.localNumber());
    const composed = digits ? `${this.selectedCountry().dialCode}${digits}` : '';
    this.lastEmitted = composed;
    this.valueChange.emit(composed);
  }
}
