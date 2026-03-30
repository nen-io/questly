import { zodResolver } from '@hookform/resolvers/zod'
import type { FieldValues, Resolver } from 'react-hook-form'
import type { z } from 'zod/v4'

export function makeZodResolver<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
): Resolver<z.input<TSchema> & FieldValues, any, z.output<TSchema>> {
  return zodResolver(schema as never) as unknown as Resolver<z.input<TSchema> & FieldValues, any, z.output<TSchema>>
}
