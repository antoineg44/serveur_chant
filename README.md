<h1 align="center">
  GitHub Serveur de chants :rocket:
</h1>

<p align="center">
  <a href="https://partitions.ovh">
    <img src="favicon.ico">Serveur de partitions
  </a>
</p>

## Getting Started :airplane:

- La branche "test" est automatiquement déployé l'adresse <a href="https://test.partitions.ovh">https://test.partitions.ovh</a>.
- La branche "main" correspond à <a href="https://partitions.ovh">https://partitions.ovh</a>.
- La branche "app" est celle de test pour l'application smartphone <a href="https://app.partitions.ovh">https://app.partitions.ovh</a>.

## Authentification WebApp

- La connexion utilise le SSO via `webapp/connexion.php` et `sso/callback.php`.
- Le serveur doit disposer de `/var/www/compte/config/database.php` et de `/var/www/compte/config/services.php` pour verifier le droit au service `partitions`.
- Les API utilisent le controle commun `webapp/auth.php`. `webapp/api/session.php` expose uniquement une verification de session en GET, sans connexion ni gestion de comptes locaux.
- L'historique des suppressions est reserve au role SSO `admin`. Les lectures GET `data.php?action=stats` et `programme.php?action=list` restent publiques.
- La deconnexion passe uniquement par un POST vers `webapp/deconnexion.php`, avec le jeton CSRF de la session.

