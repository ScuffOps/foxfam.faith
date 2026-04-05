import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CONNECTOR_ID = "69d2b6bfc53ce38433398132"; // Foxfam Calendar

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, event } = await req.json();
    // action: 'create' | 'update' | 'delete'
    // event: the app Event object

    const accessToken = await base44.connectors.connectAppUser
      ? await base44.asServiceRole.connectors.getCurrentAppUserAccessToken(CONNECTOR_ID)
      : null;

    if (!accessToken) {
      return Response.json({ skipped: true, reason: 'no_token' });
    }

    const authHeader = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const startDate = new Date(event.start_date);
    const endDate = event.end_date ? new Date(event.end_date) : new Date(startDate.getTime() + 60 * 60 * 1000);

    const gEventBody = {
      summary: event.title,
      description: event.description || '',
      location: event.location || '',
      start: event.all_day
        ? { date: startDate.toISOString().slice(0, 10) }
        : { dateTime: startDate.toISOString() },
      end: event.all_day
        ? { date: endDate.toISOString().slice(0, 10) }
        : { dateTime: endDate.toISOString() },
    };

    let gEventId = event.google_event_id;
    let response;

    if (action === 'delete' && gEventId) {
      response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${gEventId}`,
        { method: 'DELETE', headers: authHeader }
      );
      return Response.json({ status: 'deleted' });
    }

    if (action === 'update' && gEventId) {
      response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${gEventId}`,
        { method: 'PUT', headers: authHeader, body: JSON.stringify(gEventBody) }
      );
    } else {
      // Create new
      response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        { method: 'POST', headers: authHeader, body: JSON.stringify(gEventBody) }
      );
    }

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: errText }, { status: response.status });
    }

    const created = await response.json();

    // Return the google_event_id so the frontend can persist it
    return Response.json({ status: 'ok', google_event_id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});