/**
 * @see: https://github.com/microsoft/TypeScript/issues/13923#issuecomment-372258196
 */
type TPrimitive = string | number | boolean | undefined | null | unknown | never;

export type DeepReadonly<T, S = TPrimitive> = T extends S
  ? T
  : {
      readonly [K in keyof T]: T extends S
        ? T
        : T extends Array<infer U>
        ? ReadonlyArray<DeepReadonly<U>>
        : DeepReadonly<T[K]>;
    };

/**
 * @see: https://github.com/sindresorhus/type-fest/blob/main/source/writable.d.ts
 */
export type Mutable<T, S = TPrimitive> = T extends S
  ? T
  : {
      -readonly [K in keyof T]: T;
    };

/**
 * @see: https://github.com/sindresorhus/type-fest/blob/main/source/writable.d.ts
 */
export type DeepMutable<T, S = TPrimitive> = T extends S
  ? T
  : {
      -readonly [K in keyof T]: T extends S ? T : T extends Array<infer U> ? Array<DeepMutable<U>> : DeepMutable<T[K]>;
    };
