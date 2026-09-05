export interface TradeProposal {
  id: string;
  senderId: string;
  senderName: string;
  senderCardId: string;
  senderCardName: string;
  receiverId: string;
  receiverName: string;
  receiverCardId: string;
  receiverCardName: string;
  createdAt: number;
}

export class TradeService {
  private proposals: Map<string, TradeProposal> = new Map();

  createProposal(proposal: Omit<TradeProposal, "id" | "createdAt">): TradeProposal {
    const id = Math.random().toString(36).substring(2, 10);
    const fullProposal: TradeProposal = {
      ...proposal,
      id,
      createdAt: Date.now(),
    };
    this.proposals.set(id, fullProposal);

    // Auto-expire after 10 minutes
    setTimeout(() => {
      this.proposals.delete(id);
    }, 10 * 60 * 1000);

    return fullProposal;
  }

  getProposal(id: string): TradeProposal | undefined {
    return this.proposals.get(id);
  }

  deleteProposal(id: string): void {
    this.proposals.delete(id);
  }
}

export const tradeService = new TradeService();
