export type PromiseValue<T> = T extends Promise<infer U> ? U : T;
