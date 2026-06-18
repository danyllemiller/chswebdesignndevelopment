---
name: project-db-credentials
description: Production server DB credentials — host, user, pass, database name
metadata:
  type: project
---

Production server DB config (used in api/db_config.php and api/setup-db.php):

- host: localhost
- user: root
- password: chs_password
- database: chs_gradebook

**Why:** Server is a VPS/local server, not the old cPanel host. Old credentials (digartcl_danylle / digartcl_students) no longer apply.

**How to apply:** Any new PHP file that defines DB constants directly (like setup-db.php) or any new db_config.php change must use these values.
