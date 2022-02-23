# Orion Protocol SDK

## Install

Before install SDK you need create Personal Assess Token.

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

```
import { SupportedChainId } from '@orionprotocol/sdk';
import { config } from '@orionprotocol/sdk';
import { services } from '@orionprotocol/sdk';
import { OrionUnit } from '@orionprotocol/sdk';
import { contracts } from '@orionprotocol/sdk';
import {
    INTERNAL_ORION_PRECISION, // 8
    NATIVE_CURRENCY_PRECISION // 18
 } from '@orionprotocol/sdk';

import { utils } from '@orionprotocol/sdk';
import { exchange } from '@orionprotocol/sdk';

```
