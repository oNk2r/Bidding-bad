import { determineManagerRoles, type ManagerStatsData } from "../models/manager.js";

export class ManagerRoleService {
  getRolesForUser(stats?: ManagerStatsData | null): string[] {
    return determineManagerRoles(stats);
  }
}

export const managerRoleService = new ManagerRoleService();
