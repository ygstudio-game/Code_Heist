import { Schema, model, Document, Types } from 'mongoose';

export interface IWonProblem {
    problemId: Types.ObjectId;
    category: 'C' | 'Python' | 'DSA' | 'Web';
    status: 'Acquired' | 'Testing' | 'Verified';
    claimedBy?: string;
    codeSubmitted?: string;
    timeTaken?: number;
}

export interface ITeam extends Document {
    teamId: string;
    password?: string;
    teamName: string;
    credits: number;
    wonProblems: IWonProblem[];
    antiCheatStrikes: number;
    isEliminated: boolean;
    codingStartTime?: Date;
    codingFinishTime?: Date;
    vaultTime: number;
    penalties: number;
}

const TeamSchema = new Schema<ITeam>({
    teamId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    teamName: { type: String, required: true },
    credits: { type: Number, default: 1000 },
    wonProblems: [{
        problemId: { type: Schema.Types.ObjectId, ref: 'Problem' },
        category: String,
        status: { type: String, enum: ['Acquired', 'Testing', 'Verified'], default: 'Acquired' },
        claimedBy: { type: String, default: null },
        codeSubmitted: { type: String, default: "" },
        timeTaken: { type: Number, default: 0 }
    }],
    antiCheatStrikes: { type: Number, default: 0 },
    isEliminated: { type: Boolean, default: false },
    vaultTime: { type: Number, default: 0 },
    penalties: { type: Number, default: 0 }
}, { timestamps: true });

export default model<ITeam>('Team', TeamSchema);