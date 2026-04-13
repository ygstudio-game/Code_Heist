
export interface Team {
  id: string;
  name: string;
  accessKey?: string;
  credits: number;
  strikes: number;
  isEliminated: boolean;
  role: 'TEAM' | 'ADMIN';
  members?: string[];
  submissions?: Submission[];
  vaultTime?: number;
  lifelinesUsed?: number;
  lockPenalties?: number;
  auctionWins?: {
    id: string;
    winningBid: number;
    snippet: {
      id: string;
      title: string;
      category: string;
    }
  }[];
  _count?: {
    submissions: number;
    bids: number;
  };
  error?: string;
}

export interface Snippet {
  id: string;
  title: string;
  category: string;
  buggyCode: string;
  expected?: string;
  hiddenInput?: string;
  reward?: number;
  auctionWinAmount?: number;
  submissionStatus?: string;
  claimant?: string;
  auctionRounds?: { id: string; status: string; winnerId: string | null }[];
}

export interface Submission {
  id: string;
  teamId: string;
  snippetId: string;
  code: string;
  status: 'ACQUIRED' | 'SUBMITTED' | 'TESTING' | 'VERIFIED' | 'FAILED';
  stdout?: string;
  stderr?: string;
  solverName: string;
  solverRole: string;
  createdAt: string;
  team: {
    name: string;
  };
  snippet: {
    title: string;
  };
}

export interface AuctionBid {
  id: string;
  teamId: string;
  amount: number;
  teamName: string;
  createdAt: string;
  team: {
    name: string;
  };
}

export interface GameState {
  teams: Team[];
  totalSnippets: number;
  activeAuction: { 
    id: string; 
    status: string;
    snippet: { title: string; category: string }; 
    endTime: string;
    highestBid?: AuctionBid | null;
    totalBids?: number;
    timeLeft?: number;
  } | null;
  submissions: Submission[];
  completedAuctions: number;
}
