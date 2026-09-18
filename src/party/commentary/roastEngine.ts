/**
 * Context-aware sarcastic roast and commentary engine for Bidding Bad Party Auction.
 */

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const PartyRoastEngine = {
  /**
   * Commentary when a player is outbid in real time.
   */
  getOutbidCommentary(
    outbidName: string,
    outbidAmount: number,
    newBidderName: string,
    newBidAmount: number
  ): string {
    const lines = [
      `💀 **OUTBID**\n**${outbidName}** offered ${outbidAmount} BB.\n**${newBidderName}** said ${newBidAmount}.\n${outbidName} has left the building.`,
      `📉 **EMOTIONAL DAMAGE**\n**${newBidderName}** just snatched that away from **${outbidName}** for ${newBidAmount} BB!`,
      `🐍 **SNAKE MANEUVER**\n**${newBidderName}** dropped ${newBidAmount} BB on **${outbidName}**'s head without blinking.`,
      `💨 **DISRESPECTFUL**\n**${newBidderName}** didn't even hesitate. Outbid **${outbidName}** instantly with ${newBidAmount} BB.`,
    ];
    return pickRandom(lines);
  },

  /**
   * Commentary when an item is sold.
   */
  getSaleCommentary(
    buyerName: string,
    itemName: string,
    price: number,
    remainingPurse: number,
    itemsOwned: number,
    totalSlots: number
  ): string {
    // Case 1: Overpay / Financial Crime (> 18 BB)
    if (price >= 18) {
      const crimes = [
        `🚨 **FINANCIAL CRIME DETECTED**\n**${buyerName}** just dropped **${price} BB** on **${itemName}**!\nRemaining purse: **${remainingPurse} BB**.\nThe tax authorities have opened an investigation.`,
        `💸 **DOWN TREMENDOUS**\n**${buyerName}** paid **${price} BB** for **${itemName}**.\nWall Street is downgrading this club to junk bond status.`,
        `🤯 **IRRESPONSIBLE SPENDING**\n**${buyerName}** just emptied their retirement fund for **${itemName}** (${price} BB).\nRemaining: **${remainingPurse} BB**. Good luck filling the rest!`,
      ];
      return pickRandom(crimes);
    }

    // Case 2: Steal / Absolute Robbery (price <= 2 on iconic items)
    if (price <= 2) {
      const steals = [
        `🛒 **HIGHWAY ROBBERY**\n**${buyerName}** just stole **${itemName}** for only **${price} BB**!\nDid the other players fall asleep at the keyboard?`,
        `👀 **DAYLIGHT THEFT**\nNobody contested **${itemName}**? **${buyerName}** takes it for **${price} BB** and laughs to the bank.`,
      ];
      return pickRandom(steals);
    }

    // Case 3: Questionable mid-high purchase (10-17 BB with dwindling funds)
    if (price >= 10 && remainingPurse <= (totalSlots - itemsOwned) * 2) {
      const questionable = [
        `🗿 **QUESTIONABLE BUSINESS DECISION**\n**${buyerName}** just bought **${itemName}** for **${price} BB**.\nNobody knows why.\nNot even ${buyerName}.`,
        `🤨 **HIGH RISK, ZERO PLAN**\n**${buyerName}** bought **${itemName}** for **${price} BB** with only **${remainingPurse} BB** left.\nBold strategy. Let's see if it pays off.`,
      ];
      return pickRandom(questionable);
    }

    // Standard cheeky sale
    const regulars = [
      `🔨 **SOLD!**\n**${itemName}** joins **${buyerName}**'s squad for **${price} BB**.\nRemaining purse: **${remainingPurse} BB**.`,
      `💼 **DEAL SEALED**\n**${buyerName}** secures **${itemName}** at **${price} BB**.\nSquad progress: **${itemsOwned}/${totalSlots}**.`,
    ];
    return pickRandom(regulars);
  },

  /**
   * Triggered when a player has very low funds and multiple slots left.
   */
  getBankruptcyWatch(
    playerName: string,
    remainingPurse: number,
    itemsOwned: number,
    totalSlots: number
  ): string | null {
    const slotsRemaining = totalSlots - itemsOwned;
    if (slotsRemaining > 1 && remainingPurse <= slotsRemaining + 2) {
      return `🚨 **BANKRUPTCY WATCH**\n**${playerName}**\n💰 **${remainingPurse} BB remaining**\n👥 **${itemsOwned}/${totalSlots} items**\nThings are getting uncomfortably serious.`;
    }
    return null;
  },

  /**
   * Commentary on funny award presentations.
   */
  getAwardCommentary(awardId: string, winnerName: string): string {
    switch (awardId) {
      case "the_cook":
        return `👨‍🍳 **${winnerName}** took the ingredients and cooked a Michelin star meal. The community has spoken!`;
      case "moneyball":
        return `📊 **${winnerName}** proved that spreadsheets and stinginess beat reckless spending every single time.`;
      case "5d_chess":
        return `🧠 **${winnerName}** was playing 5D chess with multiverse time travel while everyone else was playing checkers.`;
      case "aura_farmer":
        return `🔥 **${winnerName}** didn't come to win logically; they came to harvest pure, unadulterated aesthetic aura.`;
      case "snake":
        return `🐍 **${winnerName}** has officially been declared the most treacherous sniper in Discord auction history.`;
      case "npc_purchase":
        return `🗿 A monument has been erected in honor of **${winnerName}**'s utterly baffling financial judgement.`;
      case "the_fraud":
        return `💀 **${winnerName}** talked a massive game in the lobby, but the voter jury was completely merciless.`;
      default:
        return `🎉 Congratulations **${winnerName}**!`;
    }
  },
};
