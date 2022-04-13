# Orion Protocol SDK

## Install

Before install SDK you need create Personal Access Token.

1. Create PAT [here](https://github.com/settings/tokens):
   1. type any name (for example `READ_PACKAGES`)
   2. select scope `read:packages`)
2. At your machine go to `~` (your home directory, **not project!**)
3. Create or modify `.npmrc` file with content:

```
//npm.pkg.github.com/:_authToken=YOUR_PAT
@orionprotocol:registry=https://npm.pkg.github.com/
```

4. Save `.npmrc` file
5. Now you can install `@orionprotocol/sdk` as dependency in your package

## Entities

```ts
import {
  SupportedChainId,
  config,
  OrionUnit,
  contracts,
  utils,
  exchange,
  INTERNAL_ORION_PRECISION, // 8
  NATIVE_CURRENCY_PRECISION, // 18
} from "@orionprotocol/sdk";
```
