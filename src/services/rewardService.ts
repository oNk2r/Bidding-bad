import { economyService } from "./economyService.js";

export class RewardService {
  async awardDailyReward(userId: string, userName?: string) {
    return economyService.claimDailyReward(userId, userName);
  }

  async awardDrop(userId: string, userName?: string) {
    return economyService.claimDrop(userId, userName);
  }

  async awardSpin(userId: string, userName?: string) {
    return economyService.claimSpinWheel(userId, userName);
  }
}

export const rewardService = new RewardService();
