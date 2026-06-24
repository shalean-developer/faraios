export type WorkflowTriggerType =
  | "booking_created"
  | "booking_confirmed"
  | "booking_completed"
  | "booking_cancelled"
  | "quote_accepted"
  | "invoice_paid"
  | "customer_created"
  | "review_submitted"
  | "lead_created";

export type WorkflowActionType =
  | "send_email"
  | "send_sms" // reserved — hidden from UI until messaging provider is configured
  | "send_whatsapp" // reserved — hidden from UI until messaging provider is configured
  | "create_task"
  | "assign_staff"
  | "change_status"
  | "add_customer_tag"
  | "schedule_followup";

export type WorkflowStep = {
  action: WorkflowActionType;
  config: Record<string, unknown>;
  delayDays?: number;
};

export type Workflow = {
  id: string;
  companyId: string;
  name: string;
  triggerType: WorkflowTriggerType;
  triggerConfig: Record<string, unknown>;
  steps: WorkflowStep[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CompanyTask = {
  id: string;
  companyId: string;
  title: string;
  description: string | null;
  assignedTo: string | null;
  status: "open" | "in_progress" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null;
  sourceType: string | null;
  sourceId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StaffProfile = {
  id: string;
  companyId: string;
  userId: string;
  displayName: string | null;
  phone: string | null;
  skills: string[];
  availability: Record<string, unknown>;
  bio: string | null;
};

export type CompanyNotification = {
  id: string;
  companyId: string;
  userId: string | null;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type CustomerSegment = {
  id: string;
  companyId: string;
  name: string;
  segmentType: "high_value" | "repeat" | "inactive" | "new" | "custom";
  criteria: Record<string, unknown>;
  customerCount?: number;
  description?: string;
};

export type BiMetrics = {
  revenue: {
    todayCents: number;
    weekCents: number;
    monthCents: number;
    yearCents: number;
    growthPercent: number;
  };
  bookings: {
    total: number;
    completed: number;
    cancelled: number;
    conversionRate: number;
  };
  customers: {
    new: number;
    returning: number;
    active: number;
    churnRisk: number;
  };
  marketing: {
    leads: number;
    conversionRate: number;
    topSources: { source: string; count: number }[];
    campaignPerformance: { name: string; sent: number; clicks: number }[];
  };
  operations: {
    staffUtilization: number;
    averageJobValueCents: number;
    averageResponseHours: number;
    completionRate: number;
  };
};

export type BusinessHealthScore = {
  score: number;
  factors: {
    revenueTrend: number;
    bookingGrowth: number;
    reviewActivity: number;
    customerRetention: number;
    leadConversion: number;
  };
  recommendations: string[];
};

export type AiInsight = {
  type: "insight" | "recommendation" | "search_result";
  title: string;
  body: string;
  priority?: "low" | "medium" | "high";
};

export type AdvancedReportSection = {
  title: string;
  rows: { label: string; value: string }[];
};
