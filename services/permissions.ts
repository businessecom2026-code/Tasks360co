import { UserRole } from './types';

export interface Permissions {
  canEdit: boolean;
  canDelete: boolean;
  viewFinance: boolean;
  canComment: boolean;
}

export const getPermissions = (role: UserRole | string): Permissions => {
  // Normaliza o role para lidar com variações (ex: 'Cliente', 'CLIENT', 'CLIENTE')
  const normalizedRole = role.toUpperCase();

  if (normalizedRole === 'CLIENT' || normalizedRole === 'CLIENTE') {
    return {
      canEdit: false,
      canDelete: false,
      viewFinance: false,
      canComment: true,
    };
  }

  if (normalizedRole === 'GESTOR' || normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN') {
    return {
      canEdit: true,
      canDelete: true,
      viewFinance: true,
      canComment: true,
    };
  }

  if (normalizedRole === 'COLABORADOR' || normalizedRole === 'COLLABORATOR') {
    return {
      canEdit: true,
      canDelete: false,
      viewFinance: false,
      canComment: true,
    };
  }

  // Default fallback (restrito)
  return {
    canEdit: false,
    canDelete: false,
    viewFinance: false,
    canComment: false,
  };
};

export const checkPermission = (
  hasPermission: boolean,
  actionName: string = 'realizar esta ação'
): { allowed: boolean; message?: string } => {
  if (hasPermission) {
    return { allowed: true };
  }

  return {
    allowed: false,
    message: `Desculpe, apenas gestores podem ${actionName}.`,
  };
};
