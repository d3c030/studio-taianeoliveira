# Architecture rules
- Keep Check de Grupos calendar and export rules in its browser-safe lib module so screens and rule tests share the same decisions.
- Keep group participant entry defaults and São Paulo day conversion in that same module so every registration path shares the tested policy.
- Close group rounds through a transactional database function and protect closed rounds with database triggers so partial saves and concurrent edits cannot overwrite finalized checks.