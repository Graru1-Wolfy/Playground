import type { ServiceContainer, ServiceDescriptor, ServiceToken } from './types.js';

interface Registration<T = unknown> {
  descriptor: ServiceDescriptor<T>;
  instance?: T;
}

export class DefaultServiceContainer implements ServiceContainer {
  private readonly registrations = new Map<symbol, Registration>();
  private readonly parent?: DefaultServiceContainer;
  private disposed = false;

  constructor(parent?: DefaultServiceContainer) {
    this.parent = parent;
  }

  register<T>(descriptor: ServiceDescriptor<T>): void {
    this.assertActive();
    if (this.registrations.has(descriptor.token)) {
      throw new Error(`Service already registered: ${String(descriptor.token)}`);
    }
    this.registrations.set(descriptor.token, { descriptor });
  }

  registerInstance<T>(token: ServiceToken<T>, instance: T): void {
    this.assertActive();
    this.registrations.set(token, {
      descriptor: {
        token,
        factory: () => instance,
        singleton: true,
      },
      instance,
    });
  }

  resolve<T>(token: ServiceToken<T>): T {
    const value = this.tryResolve(token);
    if (value === undefined) {
      throw new Error(`Service not registered: ${String(token)}`);
    }
    return value;
  }

  tryResolve<T>(token: ServiceToken<T>): T | undefined {
    this.assertActive();
    const local = this.registrations.get(token);
    if (local) {
      if (local.descriptor.singleton !== false) {
        if (local.instance === undefined) {
          local.instance = local.descriptor.factory(this);
        }
        return local.instance as T;
      }
      return local.descriptor.factory(this) as T;
    }
    return this.parent?.tryResolve(token);
  }

  has(token: ServiceToken): boolean {
    return this.registrations.has(token) || (this.parent?.has(token) ?? false);
  }

  createScope(): ServiceContainer {
    this.assertActive();
    return new DefaultServiceContainer(this);
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    for (const registration of this.registrations.values()) {
      const instance = registration.instance as { dispose?: () => Promise<void> | void } | undefined;
      if (instance?.dispose) {
        await instance.dispose();
      }
    }
    this.registrations.clear();
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error('Service container has been disposed');
    }
  }
}
