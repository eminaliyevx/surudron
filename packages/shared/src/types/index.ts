export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type Nullish<T> = T | null | undefined;

export type KeyOf<T> = keyof T;

export type ValueOf<T> = T[KeyOf<T>];
