export type Permission =
  | 'filesystem'
  | 'network'
  | 'clipboard'
  | 'database'
  | 'processes'
  | 'terminal'
  | 'project-modification';

export interface PermissionRequest {
  readonly id: string;
  readonly permissions: readonly Permission[];
  readonly requester: string;
  readonly reason: string;
  readonly timestamp: number;
  readonly status: 'pending' | 'approved' | 'denied';
}

export interface PermissionService {
  request(permissions: readonly Permission[], requester: string, reason: string): PermissionRequest;
  approve(requestId: string): void;
  deny(requestId: string): void;
  hasPermission(requester: string, permission: Permission): boolean;
  grant(requester: string, permissions: readonly Permission[]): void;
  revoke(requester: string, permissions: readonly Permission[]): void;
  listPending(): readonly PermissionRequest[];
}
