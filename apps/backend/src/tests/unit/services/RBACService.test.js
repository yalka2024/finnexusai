/**
 * RBAC Service Unit Tests
 */

const RBACService = require('../../../services/security/RBACService');

describe('RBACService', () => {
  let rbacService;

  beforeEach(() => {
    rbacService = new RBACService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('should return true for super admin', async() => {
      // Mock user roles to include super admin
      jest.spyOn(rbacService, 'getUserRoles').mockResolvedValue([
        { name: 'super_admin', assignedAt: new Date(), assignedBy: 'system' }
      ]);

      const hasPermission = await rbacService.hasPermission('user-123', 'any.permission');

      expect(hasPermission).toBe(true);
    });

    it('should return true for exact permission match', async() => {
      jest.spyOn(rbacService, 'getUserRoles').mockResolvedValue([
        { name: 'trader', assignedAt: new Date(), assignedBy: 'admin' }
      ]);

      const hasPermission = await rbacService.hasPermission('user-123', 'trade.execute');

      expect(hasPermission).toBe(true);
    });

    it('should return true for wildcard permission', async() => {
      jest.spyOn(rbacService, 'getUserRoles').mockResolvedValue([
        { name: 'admin', assignedAt: new Date(), assignedBy: 'system' }
      ]);

      const hasPermission = await rbacService.hasPermission('user-123', 'user.create');

      expect(hasPermission).toBe(true);
    });

    it('should return false for no permission', async() => {
      jest.spyOn(rbacService, 'getUserRoles').mockResolvedValue([
        { name: 'guest', assignedAt: new Date(), assignedBy: 'system' }
      ]);

      const hasPermission = await rbacService.hasPermission('user-123', 'admin.manage');

      expect(hasPermission).toBe(false);
    });

    it('should handle context-specific permissions', async() => {
      jest.spyOn(rbacService, 'getUserRoles').mockResolvedValue([
        { name: 'advisor', assignedAt: new Date(), assignedBy: 'admin' }
      ]);

      const hasPermission = await rbacService.hasPermission('user-123', 'portfolio.view', {
        resourceType: 'portfolio',
        resourceId: 'portfolio-123'
      });

      expect(hasPermission).toBe(true);
    });
  });

  describe('assignRole', () => {
    it('should assign role successfully', async() => {
      // Mock database operations
      jest.spyOn(rbacService.db, 'queryMongo').mockResolvedValue({ insertedId: 'assignment-123' });
      jest.spyOn(rbacService, 'logAccessEvent').mockResolvedValue();

      const result = await rbacService.assignRole('user-123', 'trader', 'admin-456');

      expect(result).toHaveProperty('userId', 'user-123');
      expect(result).toHaveProperty('roleName', 'trader');
      expect(result).toHaveProperty('assignedBy', 'admin-456');
      expect(result).toHaveProperty('assignedAt');
      expect(result).toHaveProperty('isActive', true);
    });

    it('should throw error for invalid role', async() => {
      await expect(rbacService.assignRole('user-123', 'invalid-role', 'admin-456'))
        .rejects.toThrow('Role invalid-role not found');
    });

    it('should handle database errors', async() => {
      jest.spyOn(rbacService.db, 'queryMongo').mockRejectedValue(new Error('Database error'));

      await expect(rbacService.assignRole('user-123', 'trader', 'admin-456'))
        .rejects.toThrow('Failed to assign role');
    });
  });

  describe('removeRole', () => {
    it('should remove role successfully', async() => {
      jest.spyOn(rbacService.db, 'queryMongo').mockResolvedValue({ modifiedCount: 1 });
      jest.spyOn(rbacService, 'logAccessEvent').mockResolvedValue();

      const result = await rbacService.removeRole('user-123', 'trader', 'admin-456', 'Role change');

      expect(result).toBe(true);
    });

    it('should return false if role not found', async() => {
      jest.spyOn(rbacService.db, 'queryMongo').mockResolvedValue({ modifiedCount: 0 });

      const result = await rbacService.removeRole('user-123', 'trader', 'admin-456');

      expect(result).toBe(false);
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles', async() => {
      const mockRoles = [
        { userId: 'user-123', roleName: 'trader', assignedAt: new Date(), assignedBy: 'admin' },
        { userId: 'user-123', roleName: 'analyst', assignedAt: new Date(), assignedBy: 'admin' }
      ];

      jest.spyOn(rbacService.db, 'queryMongo').mockResolvedValue(mockRoles);

      const roles = await rbacService.getUserRoles('user-123');

      expect(roles).toHaveLength(2);
      expect(roles[0]).toHaveProperty('name', 'trader');
      expect(roles[1]).toHaveProperty('name', 'analyst');
    });

    it('should return empty array for user with no roles', async() => {
      jest.spyOn(rbacService.db, 'queryMongo').mockResolvedValue([]);

      const roles = await rbacService.getUserRoles('user-456');

      expect(roles).toEqual([]);
    });

    it('should handle database errors', async() => {
      jest.spyOn(rbacService.db, 'queryMongo').mockRejectedValue(new Error('Database error'));

      const roles = await rbacService.getUserRoles('user-123');

      expect(roles).toEqual([]);
    });
  });

  describe('createRole', () => {
    it('should create role successfully', async() => {
      jest.spyOn(rbacService.db, 'queryMongo').mockResolvedValue({ insertedId: 'role-123' });
      jest.spyOn(rbacService, 'logAccessEvent').mockResolvedValue();

      const roleDefinition = {
        name: 'Custom Role',
        description: 'A custom role for testing',
        permissions: ['custom.permission'],
        level: 75
      };

      const result = await rbacService.createRole('custom_role', roleDefinition, 'admin-456');

      expect(result).toHaveProperty('name', 'custom_role');
      expect(result).toHaveProperty('displayName', 'Custom Role');
      expect(result).toHaveProperty('permissions', ['custom.permission']);
      expect(result).toHaveProperty('level', 75);
    });

    it('should throw error for duplicate role name', async() => {
      jest.spyOn(rbacService.db, 'queryMongo').mockRejectedValue(new Error('Duplicate key'));

      await expect(rbacService.createRole('trader', {}, 'admin-456'))
        .rejects.toThrow('Failed to create role');
    });
  });

  describe('updateRolePermissions', () => {
    it('should update role permissions successfully', async() => {
      jest.spyOn(rbacService.db, 'queryMongo').mockResolvedValue({ modifiedCount: 1 });
      jest.spyOn(rbacService, 'logAccessEvent').mockResolvedValue();

      const newPermissions = ['trade.execute', 'portfolio.view', 'analytics.view'];

      const result = await rbacService.updateRolePermissions('trader', newPermissions, 'admin-456');

      expect(result).toBe(true);
    });

    it('should throw error for non-existent role', async() => {
      await expect(rbacService.updateRolePermissions('invalid-role', [], 'admin-456'))
        .rejects.toThrow('Role invalid-role not found');
    });
  });

  describe('roleHasPermission', () => {
    it('should return true for wildcard permission', async() => {
      const role = { permissions: ['*'] };
      const result = await rbacService.roleHasPermission(role, 'any.permission');

      expect(result).toBe(true);
    });

    it('should return true for exact permission match', async() => {
      const role = { permissions: ['trade.execute', 'portfolio.view'] };
      const result = await rbacService.roleHasPermission(role, 'trade.execute');

      expect(result).toBe(true);
    });

    it('should return true for wildcard pattern match', async() => {
      const role = { permissions: ['user.*'] };
      const result = await rbacService.roleHasPermission(role, 'user.create');

      expect(result).toBe(true);
    });

    it('should return false for no match', async() => {
      const role = { permissions: ['trade.execute'] };
      const result = await rbacService.roleHasPermission(role, 'admin.manage');

      expect(result).toBe(false);
    });

    it('should handle context-specific permissions', async() => {
      const role = { permissions: ['portfolio.view:portfolio:123'] };
      const result = await rbacService.roleHasPermission(role, 'portfolio.view', {
        resourceType: 'portfolio',
        resourceId: '123'
      });

      expect(result).toBe(true);
    });
  });

  describe('getUserPermissionsSummary', () => {
    it('should return user permissions summary', async() => {
      jest.spyOn(rbacService, 'getUserRoles').mockResolvedValue([
        { name: 'trader', assignedAt: new Date(), assignedBy: 'admin' }
      ]);

      const summary = await rbacService.getUserPermissionsSummary('user-123');

      expect(summary).toHaveProperty('userId', 'user-123');
      expect(summary).toHaveProperty('roles');
      expect(summary).toHaveProperty('permissions');
      expect(summary).toHaveProperty('permissionCount');
      expect(summary.permissions).toContain('trade.execute');
    });

    it('should handle super admin permissions', async() => {
      jest.spyOn(rbacService, 'getUserRoles').mockResolvedValue([
        { name: 'super_admin', assignedAt: new Date(), assignedBy: 'system' }
      ]);

      const summary = await rbacService.getUserPermissionsSummary('user-123');

      expect(summary.permissionCount).toBeGreaterThan(10); // Should have many permissions
    });
  });

  describe('auditAccess', () => {
    it('should audit access successfully', async() => {
      jest.spyOn(rbacService.db, 'queryMongo').mockResolvedValue({ insertedId: 'audit-123' });

      const context = { ipAddress: '192.168.1.1', userAgent: 'Test Agent' };

      const result = await rbacService.auditAccess('user-123', 'portfolio', 'view', context);

      expect(result).toHaveProperty('userId', 'user-123');
      expect(result).toHaveProperty('resource', 'portfolio');
      expect(result).toHaveProperty('action', 'view');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('success', true);
    });
  });

  describe('getAllRoles', () => {
    it('should return all roles', async() => {
      const roles = await rbacService.getAllRoles();

      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThan(0);
      expect(roles[0]).toHaveProperty('name');
      expect(roles[0]).toHaveProperty('permissions');
    });
  });

  describe('getAllPermissions', () => {
    it('should return all permissions', async() => {
      const permissions = await rbacService.getAllPermissions();

      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions[0]).toHaveProperty('name');
      expect(permissions[0]).toHaveProperty('category');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async() => {
      const health = await rbacService.healthCheck();

      expect(health).toHaveProperty('status', 'healthy');
      expect(health).toHaveProperty('service', 'rbac');
      expect(health).toHaveProperty('stats');
      expect(health.stats).toHaveProperty('roles');
      expect(health.stats).toHaveProperty('permissions');
    });
  });
});
