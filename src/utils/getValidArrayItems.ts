import type { Schema, ZodTypeDef } from 'zod';
import { z } from 'zod'

export default function getValidArrayItemsSchema<DataOut, Def extends ZodTypeDef, DataIn> (
  elemSchema: Schema<DataOut, Def, DataIn>,
) {
  return z.array(z.unknown()).transform((items) => {
    const validItems: Array<z.infer<typeof elemSchema>> = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const parsedItem = elemSchema.safeParse(item);
      if (parsedItem.success) {
        validItems.push(parsedItem.data);
      } else {
        console.log(`Array item with index ${i} is invalid. Error: ${parsedItem.error.message}. Data: ${JSON.stringify(item)}.`)
      }
    }
    return validItems;
  })
}
