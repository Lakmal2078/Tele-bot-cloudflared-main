# i18n locales

Unicode translation strings are being migrated out of `src/i18n.ts` into
language-specific JSON files under this directory.

## Current status

| File | Contents |
|------|----------|
| `payment_methods.json` | Payment method display names (si / en / ta) |

## Target layout

```
src/locales/
  si.json   # Sinhala static strings
  en.json   # English
  ta.json   # Tamil
  payment_methods.json
```

`src/i18n.ts` remains the runtime API (`t(lang)`, function interpolations).
Static string tables should be imported from JSON so translators can edit
without touching TypeScript.

## Import example

```ts
import paymentMethods from "./locales/payment_methods.json";
```

Workers bundle JSON via the TypeScript `resolveJsonModule` setting in `tsconfig.json`.
