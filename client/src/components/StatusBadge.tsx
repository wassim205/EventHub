import type { EventStatus, RegistrationStatus } from "../api/types";

const eventTones: Record<EventStatus, string> = {
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
};

const registrationTones: Record<RegistrationStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
};

const badgeClass = "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset";

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const labels: Record<EventStatus, string> = {
    draft: "Brouillon",
    published: "Publié",
    cancelled: "Annulé",
  };
  return <span className={`${badgeClass} ${eventTones[status]}`}>{labels[status]}</span>;
}

export function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  const labels: Record<RegistrationStatus, string> = {
    pending: "En attente",
    confirmed: "Confirmée",
    cancelled: "Annulée",
  };
  return <span className={`${badgeClass} ${registrationTones[status]}`}>{labels[status]}</span>;
}