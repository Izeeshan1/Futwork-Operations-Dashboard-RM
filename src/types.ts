export interface MetricEntry {
  id: string;
  date: string;
  leadsInflow: number;
  activeCallers: number;
  minutesSpoken: number;
  timePerCaller: number;
  uniqueLeadsDialed: number;
  connectedLeads: number;
  speakerDeliveryConfirmed: number;
  processCompleted: number;
  cancelSpeakerDelivery: number;
  winningOutcome: number;
  connectivityPercent: number;
  speakerAlreadyDelivered: number;
}
