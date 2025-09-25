/**
 * FinAI Nexus - Role-Based Access Control Service
 *
 * Advanced RBAC system featuring:
 * - Hierarchical role management
 * - Permission-based access control
 * - Dynamic role assignment
 * - Context-aware permissions
 * - Audit trail for access control
 */

const databaseManager = require('../../config/database');
const logger = require('../../utils/logger');

class RBACService {
  constructor() {
    this.db = databaseManager;
    this.roles = new Map();
    this.permissions = new Map();
    this.userRoles = new Map();
    this.roleHierarchy = new Map();
    this.permissionCache = new Map();

    // Default roles and permissions
    this.defaultRoles = {
      'super_admin': {
        name: 'Super Administrator',
        description: 'Full system access with all permissions',
        permissions: ['*'],
        level: 100
      },
      'admin': {
        name: 'Administrator',
        description: 'Administrative access to most system features',
        permissions: ['user.manage', 'system.configure', 'analytics.view', 'reports.generate'],
        level: 90
      },
      'compliance_officer': {
        name: 'Compliance Officer',
        description: 'Compliance and regulatory oversight',
        permissions: ['compliance.monitor', 'audit.view', 'reports.generate', 'alerts.manage'],
        level: 80
      },
      'trader': {
        name: 'Trader',
        description: 'Trading and portfolio management',
        permissions: ['trade.execute', 'portfolio.manage', 'analytics.view', 'market.data'],
        level: 70
      },
      'advisor': {
        name: 'Financial Advisor',
        description: 'Client advisory and portfolio management',
        permissions: ['client.manage', 'portfolio.view', 'reports.generate', 'advice.provide'],
        level: 60
      },
      'analyst': {
        name: 'Financial Analyst',
        description: 'Market analysis and research',
        permissions: ['analytics.view', 'research.conduct', 'reports.generate', 'market.data'],
        level: 50
      },
      'user': {
        name: 'Regular User',
        description: 'Basic user access to personal features',
        permissions: ['profile.manage', 'portfolio.view', 'trade.execute', 'support.contact'],
        level: 10
      },
      'guest': {
        name: 'Guest User',
        description: 'Limited access for unregistered users',
        permissions: ['public.view', 'demo.access'],
        level: 1
      }
    };

    this.defaultPermissions = {
      // User management
      'user.create': { name: 'Create Users', category: 'user', description: 'Create new user accounts' },
      'user.read': { name: 'View Users', category: 'user', description: 'View user information' },
      'user.update': { name: 'Update Users', category: 'user', description: 'Modify user information' },
      'user.delete': { name: 'Delete Users', category: 'user', description: 'Remove user accounts' },
      'user.manage': { name: 'Manage Users', category: 'user', description: 'Full user management access' },

      // Trading
      'trade.execute': { name: 'Execute Trades', category: 'trading', description: 'Execute buy/sell orders' },
      'trade.view': { name: 'View Trades', category: 'trading', description: 'View trade history' },
      'trade.cancel': { name: 'Cancel Trades', category: 'trading', description: 'Cancel pending trades' },

      // Portfolio
      'portfolio.view': { name: 'View Portfolio', category: 'portfolio', description: 'View portfolio data' },
      'portfolio.manage': { name: 'Manage Portfolio', category: 'portfolio', description: 'Modify portfolio allocations' },
      'portfolio.rebalance': { name: 'Rebalance Portfolio', category: 'portfolio', description: 'Execute portfolio rebalancing' },

      // Analytics
      'analytics.view': { name: 'View Analytics', category: 'analytics', description: 'Access analytical dashboards' },
      'analytics.export': { name: 'Export Analytics', category: 'analytics', description: 'Export analytical data' },

      // Compliance
      'compliance.monitor': { name: 'Monitor Compliance', category: 'compliance', description: 'Monitor regulatory compliance' },
      'audit.view': { name: 'View Audits', category: 'compliance', description: 'View audit logs and reports' },

      // System
      'system.configure': { name: 'Configure System', category: 'system', description: 'Modify system configuration' },
      'system.monitor': { name: 'Monitor System', category: 'system', description: 'Monitor system performance' },

      // Reports
      'reports.generate': { name: 'Generate Reports', category: 'reports', description: 'Create and generate reports' },
      'reports.view': { name: 'View Reports', category: 'reports', description: 'View existing reports' },

      // Profile
      'profile.manage': { name: 'Manage Profile', category: 'profile', description: 'Manage personal profile' },

      // Market data
      'market.data': { name: 'Access Market Data', category: 'market', description: 'Access real-time market data' },

      // Support
      'support.contact': { name: 'Contact Support', category: 'support', description: 'Access customer support' },

      // Public access
      'public.view': { name: 'Public View', category: 'public', description: 'View public information' },
      'demo.access': { name: 'Demo Access', category: 'demo', description: 'Access demo features' }
    };
  }

  /**
   * Initialize RBAC service
   */
  async initialize() {
    try {
      await this.loadDefaultRoles();
      await this.loadDefaultPermissions();
      await this.setupRoleHierarchy();
      logger.info('RBAC service initialized');
    } catch (error) {
      logger.error('Error initializing RBAC service:', error);
    }
  }

  /**
   * Check if user has permission
   */
  async hasPermission(userId, permission, context = {}) {
    try {
      // Check cache first
      const cacheKey = `${userId}:${permission}:${JSON.stringify(context)}`;
      if (this.permissionCache.has(cacheKey)) {
        return this.permissionCache.get(cacheKey);
      }

      // Get user roles
      const userRoles = await this.getUserRoles(userId);

      // Check if user has super admin role
      if (userRoles.some(role => role.name === 'super_admin')) {
        this.permissionCache.set(cacheKey, true);
        return true;
      }

      // Check permissions for each role
      for (const role of userRoles) {
        if (await this.roleHasPermission(role, permission, context)) {
          this.permissionCache.set(cacheKey, true);
          return true;
        }
      }

      this.permissionCache.set(cacheKey, false);
      return false;
    } catch (error) {
      logger.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(userId, roleName, assignedBy, context = {}) {
    try {
      const role = this.roles.get(roleName);
      if (!role) {
        throw new Error(`Role ${roleName} not found`);
      }

      const assignment = {
        userId: userId,
        roleName: roleName,
        assignedBy: assignedBy,
        assignedAt: new Date(),
        context: context,
        isActive: true
      };

      // Store role assignment
      await this.db.queryMongo('user_roles', 'insertOne', assignment);

      // Update cache
      const cacheKey = `user_roles:${userId}`;
      this.userRoles.delete(cacheKey);
      this.clearPermissionCache(userId);

      // Log assignment
      await this.logAccessEvent('role_assigned', {
        userId: userId,
        roleName: roleName,
        assignedBy: assignedBy,
        context: context
      });

      return assignment;
    } catch (error) {
      logger.error('Error assigning role:', error);
      throw new Error('Failed to assign role');
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(userId, roleName, removedBy, reason = '') {
    try {
      const result = await this.db.queryMongo('user_roles', 'updateOne',
        { userId: userId, roleName: roleName, isActive: true },
        {
          $set: {
            isActive: false,
            removedAt: new Date(),
            removedBy: removedBy,
            reason: reason
          }
        }
      );

      if (result.modifiedCount > 0) {
        // Update cache
        const cacheKey = `user_roles:${userId}`;
        this.userRoles.delete(cacheKey);
        this.clearPermissionCache(userId);

        // Log removal
        await this.logAccessEvent('role_removed', {
          userId: userId,
          roleName: roleName,
          removedBy: removedBy,
          reason: reason
        });

        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error removing role:', error);
      throw new Error('Failed to remove role');
    }
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId) {
    try {
      const cacheKey = `user_roles:${userId}`;

      if (this.userRoles.has(cacheKey)) {
        return this.userRoles.get(cacheKey);
      }

      const roleAssignments = await this.db.queryMongo('user_roles', 'find', {
        userId: userId,
        isActive: true
      });

      const roles = roleAssignments.map(assignment => ({
        name: assignment.roleName,
        assignedAt: assignment.assignedAt,
        assignedBy: assignment.assignedBy,
        context: assignment.context
      }));

      this.userRoles.set(cacheKey, roles);
      return roles;
    } catch (error) {
      logger.error('Error getting user roles:', error);
      return [];
    }
  }

  /**
   * Create new role
   */
  async createRole(roleName, roleDefinition, createdBy) {
    try {
      const role = {
        name: roleName,
        displayName: roleDefinition.name,
        description: roleDefinition.description,
        permissions: roleDefinition.permissions || [],
        level: roleDefinition.level || 50,
        createdBy: createdBy,
        createdAt: new Date(),
        isActive: true
      };

      // Store role
      await this.db.queryMongo('roles', 'insertOne', role);
      this.roles.set(roleName, role);

      // Log creation
      await this.logAccessEvent('role_created', {
        roleName: roleName,
        createdBy: createdBy,
        roleDefinition: roleDefinition
      });

      return role;
    } catch (error) {
      logger.error('Error creating role:', error);
      throw new Error('Failed to create role');
    }
  }

  /**
   * Update role permissions
   */
  async updateRolePermissions(roleName, permissions, updatedBy) {
    try {
      const role = this.roles.get(roleName);
      if (!role) {
        throw new Error(`Role ${roleName} not found`);
      }

      const result = await this.db.queryMongo('roles', 'updateOne',
        { name: roleName },
        {
          $set: {
            permissions: permissions,
            updatedAt: new Date(),
            updatedBy: updatedBy
          }
        }
      );

      if (result.modifiedCount > 0) {
        // Update cache
        role.permissions = permissions;
        this.roles.set(roleName, role);
        this.clearPermissionCache();

        // Log update
        await this.logAccessEvent('role_updated', {
          roleName: roleName,
          updatedBy: updatedBy,
          newPermissions: permissions
        });

        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error updating role permissions:', error);
      throw new Error('Failed to update role permissions');
    }
  }

  /**
   * Check if role has permission
   */
  async roleHasPermission(role, permission, context = {}) {
    try {
      // Check if role has wildcard permission
      if (role.permissions.includes('*')) {
        return true;
      }

      // Check exact permission match
      if (role.permissions.includes(permission)) {
        return true;
      }

      // Check wildcard permissions (e.g., 'user.*' matches 'user.create')
      for (const rolePermission of role.permissions) {
        if (rolePermission.endsWith('.*')) {
          const prefix = rolePermission.slice(0, -2);
          if (permission.startsWith(`${prefix  }.`)) {
            return true;
          }
        }
      }

      // Check context-specific permissions
      if (context.resourceId && context.resourceType) {
        const contextualPermission = `${permission}:${context.resourceType}:${context.resourceId}`;
        if (role.permissions.includes(contextualPermission)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error checking role permission:', error);
      return false;
    }
  }

  /**
   * Get all roles
   */
  async getAllRoles() {
    try {
      return Array.from(this.roles.values());
    } catch (error) {
      logger.error('Error getting all roles:', error);
      return [];
    }
  }

  /**
   * Get all permissions
   */
  async getAllPermissions() {
    try {
      return Array.from(this.permissions.values());
    } catch (error) {
      logger.error('Error getting all permissions:', error);
      return [];
    }
  }

  /**
   * Get user permissions summary
   */
  async getUserPermissionsSummary(userId) {
    try {
      const userRoles = await this.getUserRoles(userId);
      const permissions = new Set();

      for (const role of userRoles) {
        const roleObj = this.roles.get(role.name);
        if (roleObj) {
          roleObj.permissions.forEach(permission => {
            if (permission === '*') {
              // Add all permissions for super admin
              Object.keys(this.defaultPermissions).forEach(perm => permissions.add(perm));
            } else {
              permissions.add(permission);
            }
          });
        }
      }

      return {
        userId: userId,
        roles: userRoles,
        permissions: Array.from(permissions),
        permissionCount: permissions.size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting user permissions summary:', error);
      return {
        userId: userId,
        roles: [],
        permissions: [],
        permissionCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Audit access attempts
   */
  async auditAccess(userId, resource, action, context = {}) {
    try {
      const auditEntry = {
        userId: userId,
        resource: resource,
        action: action,
        context: context,
        timestamp: new Date(),
        ipAddress: context.ipAddress || 'unknown',
        userAgent: context.userAgent || 'unknown',
        success: context.success !== undefined ? context.success : true
      };

      await this.db.queryMongo('access_audit', 'insertOne', auditEntry);

      return auditEntry;
    } catch (error) {
      logger.error('Error auditing access:', error);
    }
  }

  /**
   * Load default roles
   */
  async loadDefaultRoles() {
    try {
      for (const [roleName, roleDef] of Object.entries(this.defaultRoles)) {
        this.roles.set(roleName, {
          name: roleName,
          displayName: roleDef.name,
          description: roleDef.description,
          permissions: roleDef.permissions,
          level: roleDef.level,
          isDefault: true
        });
      }
    } catch (error) {
      logger.error('Error loading default roles:', error);
    }
  }

  /**
   * Load default permissions
   */
  async loadDefaultPermissions() {
    try {
      for (const [permName, permDef] of Object.entries(this.defaultPermissions)) {
        this.permissions.set(permName, permDef);
      }
    } catch (error) {
      logger.error('Error loading default permissions:', error);
    }
  }

  /**
   * Setup role hierarchy
   */
  async setupRoleHierarchy() {
    try {
      // Define role hierarchy (higher level can do what lower level can do)
      this.roleHierarchy.set('super_admin', ['admin', 'compliance_officer', 'trader', 'advisor', 'analyst', 'user', 'guest']);
      this.roleHierarchy.set('admin', ['trader', 'advisor', 'analyst', 'user', 'guest']);
      this.roleHierarchy.set('compliance_officer', ['analyst', 'user', 'guest']);
      this.roleHierarchy.set('trader', ['user', 'guest']);
      this.roleHierarchy.set('advisor', ['user', 'guest']);
      this.roleHierarchy.set('analyst', ['user', 'guest']);
      this.roleHierarchy.set('user', ['guest']);
    } catch (error) {
      logger.error('Error setting up role hierarchy:', error);
    }
  }

  /**
   * Clear permission cache
   */
  clearPermissionCache(userId = null) {
    try {
      if (userId) {
        // Clear cache for specific user
        const keysToDelete = [];
        for (const key of this.permissionCache.keys()) {
          if (key.startsWith(`${userId}:`)) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => this.permissionCache.delete(key));
      } else {
        // Clear entire cache
        this.permissionCache.clear();
      }
    } catch (error) {
      logger.error('Error clearing permission cache:', error);
    }
  }

  /**
   * Log access event
   */
  async logAccessEvent(eventType, details) {
    try {
      const logEntry = {
        eventType: eventType,
        details: details,
        timestamp: new Date(),
        userId: details.userId || details.assignedBy || details.createdBy || 'system'
      };

      await this.db.queryMongo('rbac_audit_log', 'insertOne', logEntry);
    } catch (error) {
      logger.error('Error logging access event:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const roleCount = this.roles.size;
      const permissionCount = this.permissions.size;
      const cacheSize = this.permissionCache.size;

      return {
        status: 'healthy',
        service: 'rbac',
        stats: {
          roles: roleCount,
          permissions: permissionCount,
          cacheSize: cacheSize
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'rbac',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = RBACService;
