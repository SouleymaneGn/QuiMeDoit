-- Message de rappel WhatsApp personnalisable (Paramètres).
-- Variables remplacées côté application : {prenom}, {montant}, {commerce}.
-- null ou vide = message par défaut de l'application.
alter table public.profiles
  add column if not exists reminder_template text
  check (reminder_template is null or length(reminder_template) <= 500);
