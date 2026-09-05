-- Abonnement SaaSPay — cf. abonement.md, section "Mise à jour — vraie
-- documentation SaaSPay". La vraie API SaaSPay n'a pas de notion de client
-- persistant (contrairement à l'hypothèse initiale de la Phase 0/1) : une
-- session de checkout se crée directement avec l'email/nom du client, sans
-- identifiant client à conserver. On garde donc seulement l'id de la
-- dernière session de checkout créée, utile pour la corrélation webhook.
--
-- Les deux colonnes renommées/supprimées ici étaient encore vides pour tous
-- les comptes existants (aucun paiement SaaSPay n'a encore eu lieu) : cette
-- migration ne perd aucune donnée réelle.

alter table public.subscriptions
  rename column saaspay_customer_id to saaspay_checkout_session_id;

alter table public.subscriptions
  drop column saaspay_subscription_id;
