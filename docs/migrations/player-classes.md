# Migration: player classes

Run this after the previous auth/state schema is installed:

```sql
SOURCE sql/upgrade_player_classes.sql;
```

For a fresh install, `sql/schema.sql` and `sql/seed.sql` already contain the player class table and default rows.

## Notes

- Existing players start with `class_id = NULL`.
- They can choose a class from the player profile modal.
- The admin can edit classes from `admin/classes.php`.
