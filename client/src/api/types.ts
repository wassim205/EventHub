export type UserRole = "admin" | "staff";
export type EventStatus = "draft" | "published" | "cancelled";
export type RegistrationStatus = "pending" | "confirmed" | "cancelled";

export type User = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

export type EventSummary = {
  id: string;
  title: string;
  description: string;
  location: string;
  eventDate: string;
  maxParticipants: number;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: Pick<User, "id" | "fullName" | "email">;
  registrationsCount: number;
  remainingSeats: number;
};

export type ParticipantSummary = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  createdAt: string;
  registrationsCount: number;
};

export type Registration = {
  id: string;
  eventId: string;
  participantId: string;
  status: RegistrationStatus;
  createdAt: string;
  event: Pick<EventSummary, "id" | "title" | "eventDate" | "status" | "location">;
  participant: Pick<ParticipantSummary, "id" | "fullName" | "email" | "phone">;
};

export type EventDetail = EventSummary & {
  registrations: Array<
    Omit<Registration, "event"> & { participant: Registration["participant"] }
  >;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type DashboardStats = {
  totals: {
    events: number;
    publishedEvents: number;
    cancelledEvents: number;
    draftEvents: number;
    registrationsToday: number;
    participants: number;
  };
  topEvents: Array<{
    id: string;
    title: string;
    location: string;
    eventDate: string;
    maxParticipants: number;
    registrationsCount: number;
    fillRate: number;
  }>;
};