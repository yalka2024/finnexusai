/**
 * Enhanced Role-Based Access Control (RBAC) System
 * Implements granular permissions, role hierarchies, and resource-based access control
 */

class RBACSystem {
  constructor() {
    // Define role hierarchy (higher number = more permissions)
    this.roleHierarchy = {
      'guest': 0,
      'user': 1,
      'trader': 2,
      'analyst': 3,
      'admin': 4,
      'superadmin': 5
    };

    // Define permissions for each role
    this.rolePermissions = {
      'guest': ['read:public'],
      'user': [
        'read:public',
        'read:own_portfolio',
        'read:own_trades',
        'write:own_profile',
        'read:market_data'
      ],
      'trader': [
        'read:public',
        'read:own_portfolio',
        'read:own_trades',
        'write:own_profile',
        'read:market_data',
        'write:trades',
        'read:analytics'
      ],
      'analyst': [
        'read:public',
        'read:own_portfolio',
        'read:own_trades',
        'write:own_profile',
        'read:market_data',
        'write:trades',
        'read:analytics',
        'write:analytics',
        'read:all_portfolios',
        'read:all_trades'
      ],
      'admin': [
        'read:public',
        'read:own_portfolio',
        'read:own_trades',
        'write:own_profile',
        'read:market_data',
        'write:trades',
        'read:analytics',
        'write:analytics',
        'read:all_portfolios',
        'read:all_trades',
        'write:users',
        'read:system_logs',
        'write:system_config'
      ],
      'superadmin': [
        'read:*',
        'write:*',
        'delete:*',
        'admin:*'
      ]
    };

    // Define resource ownership rules
    this.resourceOwnership = {
      'portfolio': (user, resource) => user.userId === resource.userId,
      'trade': (user, resource) => user.userId === resource.userId,
      'profile': (user, resource) => user.userId === resource.userId,
      'analytics': (user, resource) => {
        // Analytics can be accessed by analysts and above
        return this.hasRoleLevel(user.role, 'analyst') || user.userId === resource.userId;
      }
    };
  }

  /**
   * Check if user has required role level
   */
  hasRoleLevel(userRole, requiredRole) {
    const userLevel = this.roleHierarchy[userRole] || 0;
    const requiredLevel = this.roleHierarchy[requiredRole] || 0;
    return userLevel >= requiredLevel;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(userRole, permission) {
    const permissions = this.rolePermissions[userRole] || [];

    // Check for exact permission
    if (permissions.includes(permission)) {
      return true;
    }

    // Check for wildcard permissions
    if (permissions.includes('*')) {
      return true;
    }

    // Check for resource wildcard (e.g., 'read:*' matches 'read:portfolio')
    const [action, resource] = permission.split(':');
    if (permissions.includes(`${action}:*`)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can access specific resource
   */
  canAccessResource(user, resourceType, resource) {
    // Superadmin can access everything
    if (this.hasRoleLevel(user.role, 'superadmin')) {
      return true;
    }

    // Check ownership rules
    const ownershipRule = this.resourceOwnership[resourceType];
    if (ownershipRule && ownershipRule(user, resource)) {
      return true;
    }

    return false;
  }

  /**
   * Main RBAC middleware factory
   */
  rbac(requiredRole, permission = null, resourceType = null) {
    return (req, res, next) => {
      try {
        const user = req.user;

        if (!user) {
          return res.status(401).json({
            error: 'Authentication required',
            code: 'RBAC_NO_USER'
          });
        }

        // Check role level
        if (!this.hasRoleLevel(user.role, requiredRole)) {
          return res.status(403).json({
            error: 'Insufficient role',
            message: `Required role: ${requiredRole}, Current role: ${user.role}`,
            code: 'RBAC_INSUFFICIENT_ROLE'
          });
        }

        // Check specific permission if provided
        if (permission && !this.hasPermission(user.role, permission)) {
          return res.status(403).json({
            error: 'Insufficient permission',
            message: `Required permission: ${permission}`,
            code: 'RBAC_INSUFFICIENT_PERMISSION'
          });
        }

        // Check resource access if resource type is provided
        if (resourceType) {
          const resource = req.params || req.body || {};
          if (!this.canAccessResource(user, resourceType, resource)) {
            return res.status(403).json({
              error: 'Resource access denied',
              message: `Cannot access ${resourceType}`,
              code: 'RBAC_RESOURCE_DENIED'
            });
          }
        }

        // Add user context to request
        req.userContext = {
          userId: user.userId,
          role: user.role,
          permissions: this.rolePermissions[user.role] || [],
          canAccess: (permission) => this.hasPermission(user.role, permission),
          canAccessResource: (resourceType, resource) => this.canAccessResource(user, resourceType, resource)
        };

        next();
      } catch (error) {
        logger.error('RBAC middleware error:', error);
        return res.status(500).json({
          error: 'Authorization check failed',
          code: 'RBAC_INTERNAL_ERROR'
        });
      }
    };
  }

  /**
   * Permission-based middleware
   */
  requirePermission(permission) {
    return (req, res, next) => {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'RBAC_NO_USER'
        });
      }

      if (!this.hasPermission(user.role, permission)) {
        return res.status(403).json({
          error: 'Insufficient permission',
          message: `Required permission: ${permission}`,
          code: 'RBAC_INSUFFICIENT_PERMISSION'
        });
      }

      next();
    };
  }

  /**
   * Resource ownership middleware
   */
  requireOwnership(resourceType) {
    return (req, res, next) => {
      const user = req.user;
      const resource = { ...req.params, ...req.body };

      if (!user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'RBAC_NO_USER'
        });
      }

      if (!this.canAccessResource(user, resourceType, resource)) {
        return res.status(403).json({
          error: 'Resource access denied',
          message: `Cannot access ${resourceType}`,
          code: 'RBAC_RESOURCE_DENIED'
        });
      }

      next();
    };
  }

  /**
   * Multi-role middleware (user must have any of the specified roles)
   */
  anyRole(...roles) {
    return (req, res, next) => {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'RBAC_NO_USER'
        });
      }

      const hasAnyRole = roles.some(role => this.hasRoleLevel(user.role, role));

      if (!hasAnyRole) {
        return res.status(403).json({
          error: 'Insufficient role',
          message: `Required one of: ${roles.join(', ')}, Current role: ${user.role}`,
          code: 'RBAC_INSUFFICIENT_ROLE'
        });
      }

      next();
    };
  }

  /**
   * Get user permissions
   */
  getUserPermissions(userRole) {
    return this.rolePermissions[userRole] || [];
  }

  /**
   * Check if permission exists in system
   */
  isValidPermission(permission) {
    const allPermissions = Object.values(this.rolePermissions).flat();
    return allPermissions.includes(permission) || permission.includes('*');
  }

  /**
   * Add custom permission to role
   */
  addPermissionToRole(role, permission) {
    if (!this.rolePermissions[role]) {
      this.rolePermissions[role] = [];
    }

    if (!this.rolePermissions[role].includes(permission)) {
      this.rolePermissions[role].push(permission);
    }
  }

  /**
   * Remove permission from role
   */
  removePermissionFromRole(role, permission) {
    if (this.rolePermissions[role]) {
      this.rolePermissions[role] = this.rolePermissions[role].filter(p => p !== permission);
    }
  }
}

// Create singleton instance
const rbacSystem = new RBACSystem();

// Export convenience functions for backward compatibility
const rbac = (requiredRole, permission = null, resourceType = null) =>
  rbacSystem.rbac(requiredRole, permission, resourceType);

const requirePermission = (permission) =>
  rbacSystem.requirePermission(permission);

const requireOwnership = (resourceType) =>
  rbacSystem.requireOwnership(resourceType);

const anyRole = (...roles) =>
  rbacSystem.anyRole(...roles);

module.exports = {
  rbac,
  requirePermission,
  requireOwnership,
  anyRole,
  rbacSystem
};
