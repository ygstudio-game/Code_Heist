export interface BidPayload {
    teamId: string;
    amount: number;
    problemId: string;
}

export interface AuctionState {
    currentProblemId: string;
    highestBid: number;
    highestBidder: string; // Team Name
    timeLeft: number; // Seconds remaining
    isPaused: boolean;
}

// Define the events for better IntelliSense
export interface ServerToClientEvents {
    auctionUpdate: (state: AuctionState) => void;
    bidAccepted: (payload: { amount: number; teamName: string }) => void;
    auctionEnded: (winner: string) => void;
    securityAlert: (message: string) => void;
}