import { Types, Document } from 'mongoose';

export type Category = 'C' | 'Python' | 'DSA' | 'Web';
export type ProblemStatus = 'Acquired' | 'Testing' | 'Verified';

export interface IWonProblem {
    problemId: Types.ObjectId;
    category: Category;
    status: ProblemStatus;
    claimedBy: string | null; // Socket ID of the member
    codeSubmitted: string;
    timeTaken: number;
}

export interface ITeam extends Document {
    teamId: string;
    teamName: string;
    credits: number;
    wonProblems: IWonProblem[];
    antiCheatStrikes: number;
    isEliminated: boolean;
    vaultTime: number;
    penalties: number;
    createdAt: Date;
    updatedAt: Date;
}