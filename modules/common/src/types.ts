export type Scorecard = {
    courseName: string;
    layoutName: string;
    date: Date;
    numberOfHoles?: number;
    layoutPar?: number;
    layoutDistance?: string;
    entries: Array<ScorecardRecord>;
};

export type ScorecardRecord = {
    total: number;
    players: Array<{
      name: string;
      username: string;
    }>;
};
