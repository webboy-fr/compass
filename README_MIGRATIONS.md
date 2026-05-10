# Database migrations

## First install

```bash
cp config.example.php config.php
vim config.php
php tools/migrate.php
```

The script reads `config.php`, creates `pcw_migrations`, then runs every file in `sql/migrations/` that has not already been applied.

## After a pull

```bash
git pull
php tools/migrate.php
```

## Rules

- Do not commit `config.php`.
- Add new changes as numbered files in `sql/migrations/`.
- Do not edit an already-applied migration on the server. Create a new one instead.
