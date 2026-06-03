/**
 * Granular Permissions Configuration
 * Defines all available permissions in the system
 */

const PERMISSIONS = {
  // Stock Management
  STOCK_VIEW: 'stock.view',
  STOCK_CREATE: 'stock.create',
  STOCK_EDIT: 'stock.edit',
  STOCK_DELETE: 'stock.delete',
  STOCK_EXPORT: 'stock.export',
  STOCK_IMPORT: 'stock.import',
  
  // Product Management
  PRODUCT_VIEW: 'product.view',
  PRODUCT_CREATE: 'product.create',
  PRODUCT_EDIT: 'product.edit',
  PRODUCT_DELETE: 'product.delete',
  PRODUCT_EXPORT: 'product.export',
  
  // Order/Commande Management
  COMMANDE_VIEW: 'commande.view',
  COMMANDE_CREATE: 'commande.create',
  COMMANDE_EDIT: 'commande.edit',
  COMMANDE_DELETE: 'commande.delete',
  COMMANDE_VALIDATE: 'commande.validate',
  COMMANDE_EXPORT: 'commande.export',
  
  // Client Management
  CLIENT_VIEW: 'client.view',
  CLIENT_CREATE: 'client.create',
  CLIENT_EDIT: 'client.edit',
  CLIENT_DELETE: 'client.delete',
  CLIENT_EXPORT: 'client.export',
  
  // User Management
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_EDIT: 'user.edit',
  USER_DELETE: 'user.delete',
  USER_BLOCK: 'user.block',
  USER_UNBLOCK: 'user.unblock',
  
  // Role & Permission Management
  ROLE_VIEW: 'role.view',
  ROLE_CREATE: 'role.create',
  ROLE_EDIT: 'role.edit',
  ROLE_DELETE: 'role.delete',
  PERMISSION_ASSIGN: 'permission.assign',
  
  // Reports & Analytics
  REPORT_VIEW: 'report.view',
  REPORT_EXPORT: 'report.export',
  ANALYTICS_VIEW: 'analytics.view',
  DASHBOARD_VIEW: 'dashboard.view',
  
  // System Administration
  SYSTEM_CONFIG: 'system.config',
  SYSTEM_LOGS: 'system.logs',
  SYSTEM_BACKUP: 'system.backup',
  SYSTEM_CACHE: 'system.cache',
  
  // Audit Trail
  AUDIT_VIEW: 'audit.view',
  AUDIT_EXPORT: 'audit.export',
  
  // Security
  SECURITY_2FA: 'security.2fa',
  SECURITY_PASSWORD_POLICY: 'security.password_policy',
  SECURITY_SESSION_MANAGEMENT: 'security.session_management',
};

// Role-based permission mappings
const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS), // Admin has all permissions
  
  directeur: [
    PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.COMMANDE_VIEW,
    PERMISSIONS.COMMANDE_VALIDATE,
    PERMISSIONS.CLIENT_VIEW,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.AUDIT_EXPORT,
  ],
  
  commerciale: [
    PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.COMMANDE_VIEW,
    PERMISSIONS.COMMANDE_CREATE,
    PERMISSIONS.COMMANDE_EDIT,
    PERMISSIONS.COMMANDE_EXPORT,
    PERMISSIONS.CLIENT_VIEW,
    PERMISSIONS.CLIENT_CREATE,
    PERMISSIONS.CLIENT_EDIT,
    PERMISSIONS.CLIENT_EXPORT,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
  ],
  
  stock: [
    PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.STOCK_CREATE,
    PERMISSIONS.STOCK_EDIT,
    PERMISSIONS.STOCK_EXPORT,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.PRODUCT_EDIT,
    PERMISSIONS.PRODUCT_EXPORT,
    PERMISSIONS.COMMANDE_VIEW,
    PERMISSIONS.REPORT_VIEW,
  ],
};

// Permission categories for UI organization
const PERMISSION_CATEGORIES = {
  stock: {
    label: 'Gestion de Stock',
    permissions: [
      PERMISSIONS.STOCK_VIEW,
      PERMISSIONS.STOCK_CREATE,
      PERMISSIONS.STOCK_EDIT,
      PERMISSIONS.STOCK_DELETE,
      PERMISSIONS.STOCK_EXPORT,
      PERMISSIONS.STOCK_IMPORT,
    ],
  },
  product: {
    label: 'Gestion des Produits',
    permissions: [
      PERMISSIONS.PRODUCT_VIEW,
      PERMISSIONS.PRODUCT_CREATE,
      PERMISSIONS.PRODUCT_EDIT,
      PERMISSIONS.PRODUCT_DELETE,
      PERMISSIONS.PRODUCT_EXPORT,
    ],
  },
  commande: {
    label: 'Gestion des Commandes',
    permissions: [
      PERMISSIONS.COMMANDE_VIEW,
      PERMISSIONS.COMMANDE_CREATE,
      PERMISSIONS.COMMANDE_EDIT,
      PERMISSIONS.COMMANDE_DELETE,
      PERMISSIONS.COMMANDE_VALIDATE,
      PERMISSIONS.COMMANDE_EXPORT,
    ],
  },
  client: {
    label: 'Gestion des Clients',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.CLIENT_CREATE,
      PERMISSIONS.CLIENT_EDIT,
      PERMISSIONS.CLIENT_DELETE,
      PERMISSIONS.CLIENT_EXPORT,
    ],
  },
  user: {
    label: 'Gestion des Utilisateurs',
    permissions: [
      PERMISSIONS.USER_VIEW,
      PERMISSIONS.USER_CREATE,
      PERMISSIONS.USER_EDIT,
      PERMISSIONS.USER_DELETE,
      PERMISSIONS.USER_BLOCK,
      PERMISSIONS.USER_UNBLOCK,
    ],
  },
  role: {
    label: 'Gestion des Rôles',
    permissions: [
      PERMISSIONS.ROLE_VIEW,
      PERMISSIONS.ROLE_CREATE,
      PERMISSIONS.ROLE_EDIT,
      PERMISSIONS.ROLE_DELETE,
      PERMISSIONS.PERMISSION_ASSIGN,
    ],
  },
  report: {
    label: 'Rapports & Analyses',
    permissions: [
      PERMISSIONS.REPORT_VIEW,
      PERMISSIONS.REPORT_EXPORT,
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.DASHBOARD_VIEW,
    ],
  },
  system: {
    label: 'Administration Système',
    permissions: [
      PERMISSIONS.SYSTEM_CONFIG,
      PERMISSIONS.SYSTEM_LOGS,
      PERMISSIONS.SYSTEM_BACKUP,
      PERMISSIONS.SYSTEM_CACHE,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.AUDIT_EXPORT,
    ],
  },
  security: {
    label: 'Sécurité',
    permissions: [
      PERMISSIONS.SECURITY_2FA,
      PERMISSIONS.SECURITY_PASSWORD_POLICY,
      PERMISSIONS.SECURITY_SESSION_MANAGEMENT,
    ],
  },
};

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  PERMISSION_CATEGORIES,
};
