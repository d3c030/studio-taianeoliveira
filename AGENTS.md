# Architecture rules
- Keep Check de Grupos calendar and export rules in its browser-safe lib module so screens and rule tests share the same decisions.
- Keep group participant entry defaults and São Paulo day conversion in that same module so every registration path shares the tested policy.
- Close group rounds through a transactional database function and protect closed rounds with database triggers so partial saves and concurrent edits cannot overwrite finalized checks.
- Reuse the group list importer in the Participants dialog and Emojis tab so parsing, preview warnings and saving follow the same rules.
- Group reports refresh saved queries on tab mount and invalidate history on reopening rounds so closed-round statistics cannot remain cached after corrections.
- Render group participant profiles through PerfilLink with the browser-safe URL helper so normalization, encoding and isolated clicks stay consistent without changing plain-text exports.
- Adjust saved group checks only through staff-gated invoker RPCs with transaction-local trigger authorization; restore authorization immediately so later direct writes stay blocked.
- Persist every group print response server-side before completeness review; load round audits from the database and keep identity/conflict rules in the browser-safe group library so audit and registration share tested decisions.