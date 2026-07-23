export interface PackageInfo {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly dependencies: readonly string[];
  readonly path: string;
}

export interface PackageManagerService {
  registerLocal(packageInfo: PackageInfo): void;
  install(name: string, version?: string): Promise<PackageInfo>;
  uninstall(name: string): Promise<boolean>;
  update(name: string): Promise<PackageInfo>;
  list(): readonly PackageInfo[];
  resolve(name: string): PackageInfo | undefined;
}

export class DefaultPackageManagerService implements PackageManagerService {
  private readonly packages = new Map<string, PackageInfo>();

  registerLocal(packageInfo: PackageInfo): void {
    this.packages.set(packageInfo.name, packageInfo);
  }

  async install(name: string, version = 'latest'): Promise<PackageInfo> {
    const existing = this.packages.get(name);
    if (existing) return existing;
    const pkg: PackageInfo = {
      name,
      version,
      description: `Installed package ${name}`,
      author: 'unknown',
      dependencies: [],
      path: `packages/${name}`,
    };
    this.packages.set(name, pkg);
    return pkg;
  }

  async uninstall(name: string): Promise<boolean> {
    return this.packages.delete(name);
  }

  async update(name: string): Promise<PackageInfo> {
    const pkg = this.packages.get(name);
    if (!pkg) throw new Error(`Package not found: ${name}`);
    return pkg;
  }

  list(): readonly PackageInfo[] {
    return [...this.packages.values()];
  }

  resolve(name: string): PackageInfo | undefined {
    return this.packages.get(name);
  }
}
