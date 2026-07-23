export type ServiceToken<T = unknown> = symbol & { readonly __type?: T };

export function createToken<T>(name: string): ServiceToken<T> {
  return Symbol.for(`ide.service.${name}`) as ServiceToken<T>;
}

export interface ServiceDescriptor<T = unknown> {
  readonly token: ServiceToken<T>;
  readonly factory: (container: ServiceContainer) => T;
  readonly singleton?: boolean;
}

export interface ServiceContainer {
  register<T>(descriptor: ServiceDescriptor<T>): void;
  registerInstance<T>(token: ServiceToken<T>, instance: T): void;
  resolve<T>(token: ServiceToken<T>): T;
  tryResolve<T>(token: ServiceToken<T>): T | undefined;
  has(token: ServiceToken): boolean;
  createScope(): ServiceContainer;
  dispose(): Promise<void>;
}
