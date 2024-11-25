export interface Holiday {
    date: string;
}

export interface RestDays {
    employeeName: string;
    days: number[];  // [0-6] pour lundi-dimanche
}

export interface LeavePeriod {
    employeeName: string;
    startDate: string;
    endDate: string;
}

export interface AnalysisParams {
    holidays: Holiday[];
    restDays: RestDays[];
    leavePeriods: LeavePeriod[];
}