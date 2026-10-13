import { EventStatus, Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

type TopEventRow = {
  id: string;
  title: string;
  location: string;
  event_date: Date;
  max_participants: number;
  registrations_count: number;
};

export async function getDashboardStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalEvents, publishedEvents, cancelledEvents, todayRegistrations, totalParticipants] =
    await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { status: EventStatus.published } }),
      prisma.event.count({ where: { status: EventStatus.cancelled } }),
      prisma.registration.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.participant.count(),
    ]);

  const topEvents = await prisma.$queryRaw<TopEventRow[]>(Prisma.sql`
    SELECT e.id,
           e.title,
           e.location,
           e.event_date,
           e.max_participants,
           COUNT(r.id)::int AS registrations_count
    FROM events e
    LEFT JOIN registrations r ON r.event_id = e.id AND r.status <> 'cancelled'
    WHERE e.status <> 'cancelled'
    GROUP BY e.id
    ORDER BY registrations_count DESC, e.event_date ASC
    LIMIT 5
  `);

  return {
    totals: {
      events: totalEvents,
      publishedEvents,
      cancelledEvents,
      draftEvents: totalEvents - publishedEvents - cancelledEvents,
      registrationsToday: todayRegistrations,
      participants: totalParticipants,
    },
    topEvents: topEvents.map((event) => {
      const fillRate =
        event.max_participants > 0
          ? Math.round((event.registrations_count / event.max_participants) * 100)
          : 0;
      return {
        id: event.id,
        title: event.title,
        location: event.location,
        eventDate: event.event_date,
        maxParticipants: event.max_participants,
        registrationsCount: event.registrations_count,
        fillRate,
      };
    }),
  };
}