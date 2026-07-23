import type { Permission, PermissionRequest, PermissionService } from './types.js';

export class DefaultPermissionService implements PermissionService {
  private readonly grants = new Map<string, Set<Permission>>();
  private readonly requests = new Map<string, PermissionRequest>();

  request(permissions: readonly Permission[], requester: string, reason: string): PermissionRequest {
    const missing = permissions.filter((p) => !this.hasPermission(requester, p));
    if (missing.length === 0) {
      return {
        id: crypto.randomUUID(),
        permissions,
        requester,
        reason,
        timestamp: Date.now(),
        status: 'approved',
      };
    }
    const request: PermissionRequest = {
      id: crypto.randomUUID(),
      permissions: missing,
      requester,
      reason,
      timestamp: Date.now(),
      status: 'pending',
    };
    this.requests.set(request.id, request);
    return request;
  }

  approve(requestId: string): void {
    const request = this.requests.get(requestId);
    if (!request) return;
    this.grant(request.requester, request.permissions);
    this.requests.set(requestId, { ...request, status: 'approved' });
  }

  deny(requestId: string): void {
    const request = this.requests.get(requestId);
    if (!request) return;
    this.requests.set(requestId, { ...request, status: 'denied' });
  }

  hasPermission(requester: string, permission: Permission): boolean {
    return this.grants.get(requester)?.has(permission) ?? false;
  }

  grant(requester: string, permissions: readonly Permission[]): void {
    const set = this.grants.get(requester) ?? new Set();
    for (const p of permissions) set.add(p);
    this.grants.set(requester, set);
  }

  revoke(requester: string, permissions: readonly Permission[]): void {
    const set = this.grants.get(requester);
    if (!set) return;
    for (const p of permissions) set.delete(p);
  }

  listPending(): readonly PermissionRequest[] {
    return [...this.requests.values()].filter((r) => r.status === 'pending');
  }
}
