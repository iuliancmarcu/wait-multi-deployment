export type PromiseValue<T> = T extends Promise<infer U> ? U : T;

export type ArrayItem<T> = T extends Array<infer U> ? U : T;
