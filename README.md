# better-sqlcipher

[better-sqlite3](https://github.com/JoshuaWise/better-sqlite3) built with
[SQLCipher](https://www.zetetic.net/sqlcipher/).

This is the better-sqlite3 library patched to use SQLCipher instead.

## Changes

- Use SQLCipher instead of SQLite
- Disable some SQLite features that we don't use to reduce the attack surface
- Remove `prebuild` dependency and always build locally
- Remove `bindings` dependency
- Remove `sqlite`, `sqlite3` and `nodemark` dependencies (this breaks benchmarks)
- Add type declarations
- Add tests for the encryption functionality
