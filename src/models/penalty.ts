export const DIRECTIONS_STRIKER = [
  "TOP_LEFT",
  "TOP_RIGHT",
  "BOTTOM_LEFT",
  "BOTTOM_RIGHT",
  "CENTER",
] as const;

export const DIRECTIONS_KEEPER = ["LEFT", "RIGHT", "CENTER"] as const;

export type StrikerDirection = (typeof DIRECTIONS_STRIKER)[number];
export type KeeperDirection = (typeof DIRECTIONS_KEEPER)[number];

export interface PenaltyShot {
  roundNum: number;
  takerId: string;
  takerName: string;
  keeperId: string;
  keeperName: string;
  strikerChoice: StrikerDirection;
  keeperChoice: KeeperDirection;
  isGoal: boolean;
  commentary: string;
}

export class PenaltyShootoutState {
  homeId: string;
  homeName: string;
  awayId: string;
  awayName: string;
  wager: number;
  isBot: boolean;
  maxRounds: number;
  currentRound: number;
  currentTurn: "HOME" | "AWAY";
  homeShots: boolean[];
  awayShots: boolean[];
  history: PenaltyShot[];
  winnerId: string | null;
  isFinished: boolean;

  constructor(
    homeId: string,
    homeName: string,
    awayId: string,
    awayName: string,
    wager = 0,
    isBot = false
  ) {
    this.homeId = homeId;
    this.homeName = homeName;
    this.awayId = awayId;
    this.awayName = awayName;
    this.wager = wager;
    this.isBot = isBot;
    this.maxRounds = 5;
    this.currentRound = 1;
    this.currentTurn = "HOME";
    this.homeShots = [];
    this.awayShots = [];
    this.history = [];
    this.winnerId = null;
    this.isFinished = false;
  }

  getScoreStr(): string {
    const formatShots = (shots: boolean[], total: number): string => {
      const icons: string[] = [];
      for (const s of shots) {
        icons.push(s ? "🟢" : "🔴");
      }
      while (icons.length < Math.max(5, total)) {
        icons.push("⚪");
      }
      return icons.join(" ");
    };

    const maxLen = Math.max(this.homeShots.length, this.awayShots.length, 5);
    const homeGoals = this.homeShots.filter(Boolean).length;
    const awayGoals = this.awayShots.filter(Boolean).length;

    return (
      `**${this.homeName}**: ${formatShots(this.homeShots, maxLen)} (${homeGoals})\n` +
      `**${this.awayName}**: ${formatShots(this.awayShots, maxLen)} (${awayGoals})`
    );
  }

  processShot(strikerChoice: StrikerDirection, keeperChoice: KeeperDirection): PenaltyShot {
    const isHomeShooting = this.currentTurn === "HOME";
    const takerId = isHomeShooting ? this.homeId : this.awayId;
    const takerName = isHomeShooting ? this.homeName : this.awayName;
    const keeperId = isHomeShooting ? this.awayId : this.homeId;
    const keeperName = isHomeShooting ? this.awayName : this.homeName;

    const matchedSide =
      (strikerChoice.includes("LEFT") && keeperChoice === "LEFT") ||
      (strikerChoice.includes("RIGHT") && keeperChoice === "RIGHT") ||
      (strikerChoice === "CENTER" && keeperChoice === "CENTER");

    const roll = Math.random();
    let isGoal = false;
    let commentary = "";

    if (matchedSide) {
      if (strikerChoice === "CENTER") {
        isGoal = roll < 0.2; // 80% saved
        commentary = !isGoal
          ? "🧤 **SAVED!** The keeper stood tall in the center and blocked the chip!"
          : "⚽ **GOAL!** Powerful strike through the keeper's hands!";
      } else if (strikerChoice.includes("TOP")) {
        isGoal = roll < 0.45;
        commentary = isGoal
          ? "⚽ **TOP BINS!** Placed right into the top postage stamp — unstoppable!"
          : "🧤 **WHAT A SAVE!** Fingertip stop pushing it around the post!";
      } else {
        isGoal = roll < 0.35;
        commentary = !isGoal
          ? "🧤 **DENIED!** The keeper read the shot perfectly and caught it low!"
          : "⚽ **GOAL!** Squeaked right under the diving keeper!";
      }
    } else {
      // Keeper went the wrong way
      if (roll < 0.08) {
        isGoal = false;
        commentary = "🪵 **OFF THE POST!** Sent the keeper the wrong way but hit the woodwork!";
      } else {
        isGoal = true;
        commentary = `⚽ **GOAL!** Sent **${keeperName}** diving the complete wrong way!`;
      }
    }

    const shot: PenaltyShot = {
      roundNum: this.currentRound,
      takerId,
      takerName,
      keeperId,
      keeperName,
      strikerChoice,
      keeperChoice,
      isGoal,
      commentary,
    };
    this.history.push(shot);

    if (isHomeShooting) {
      this.homeShots.push(isGoal);
      this.currentTurn = "AWAY";
    } else {
      this.awayShots.push(isGoal);
      this.currentTurn = "HOME";
      this.currentRound += 1;
    }

    this.checkGameOver();
    return shot;
  }

  private checkGameOver(): void {
    const hScore = this.homeShots.filter(Boolean).length;
    const aScore = this.awayShots.filter(Boolean).length;
    const hTaken = this.homeShots.length;
    const aTaken = this.awayShots.length;

    if (hTaken <= 5 && aTaken <= 5) {
      const hRemaining = 5 - hTaken;
      const aRemaining = 5 - aTaken;

      if (hScore > aScore + aRemaining) {
        this.isFinished = true;
        this.winnerId = this.homeId;
        return;
      }
      if (aScore > hScore + hRemaining) {
        this.isFinished = true;
        this.winnerId = this.awayId;
        return;
      }

      if (hTaken === 5 && aTaken === 5) {
        if (hScore > aScore) {
          this.isFinished = true;
          this.winnerId = this.homeId;
        } else if (aScore > hScore) {
          this.isFinished = true;
          this.winnerId = this.awayId;
        }
        // Sudden death continues in round 6+
      }
    } else {
      // Sudden death: both teams take equal shots in each round
      if (hTaken === aTaken) {
        if (hScore > aScore) {
          this.isFinished = true;
          this.winnerId = this.homeId;
        } else if (aScore > hScore) {
          this.isFinished = true;
          this.winnerId = this.awayId;
        }
      }
    }
  }
}
