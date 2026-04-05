import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CONNECTOR_ID = "69d2b6bfc53ce38433398132"; // Foxfam Calendar

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const state = body?.data?._provider_meta?.['x-goog-resource-state'];
    if (state === 'sync') {
      return Response.json({ status: 'sync_ack' });
    }

    const accessToken = await base44.asServiceRole.connectors.getCurrentAppUserAccessToken(CONNECTOR_ID);
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Load sync token
    const existing = await base44.asServiceRole.entities.SyncState.filter({ key: 'gcal_sync' });
    const syncRecord = existing.length > 0 ? existing[0] : null;

    let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100';
    if (syncRecord?.sync_token) {
      url += `&syncToken=${encodeURIComponent(syncRecord.sync_token)}`;
    } else {
      url += '&timeMin=' + new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    let res = await fetch(url, { headers: authHeader });

    // syncToken expired — full re-sync
    if (res.status === 410) {
      url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100&timeMin='
        + new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      res = await fetch(url, { headers: authHeader });
    }

    if (!res.ok) {
      return Response.json({ status: 'api_error', code: res.status });
    }

    // Drain all pages
    const allItems = [];
    let pageData = await res.json();
    let newSyncToken = null;

    while (true) {
      allItems.push(...(pageData.items || []));
      if (pageData.nextSyncToken) newSyncToken = pageData.nextSyncToken;
      if (!pageData.nextPageToken) break;
      const nextRes = await fetch(url + `&pageToken=${pageData.nextPageToken}`, { headers: authHeader });
      if (!nextRes.ok) break;
      pageData = await nextRes.json();
    }

    // Process each changed event
    for (const gEvent of allItems) {
      if (!gEvent.start) continue; // skip non-events

      // Find existing app event by google_event_id
      const existing = await base44.asServiceRole.entities.Event.filter({ google_event_id: gEvent.id });

      if (gEvent.status === 'cancelled') {
        if (existing.length > 0) {
          await base44.asServiceRole.entities.Event.update(existing[0].id, { status: 'cancelled' });
        }
        continue;
      }

      const startDate = gEvent.start.dateTime || gEvent.start.date;
      const endDate = gEvent.end?.dateTime || gEvent.end?.date;
      const isAllDay = !gEvent.start.dateTime;

      const eventData = {
        title: gEvent.summary || '(No title)',
        description: gEvent.description || '',
        start_date: new Date(startDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : new Date(startDate).toISOString(),
        all_day: isAllDay,
        location: gEvent.location || '',
        google_event_id: gEvent.id,
        category: 'personal',
        status: 'active',
      };

      if (existing.length > 0) {
        await base44.asServiceRole.entities.Event.update(existing[0].id, eventData);
      } else {
        await base44.asServiceRole.entities.Event.create(eventData);
      }
    }

    // Persist new sync token
    if (newSyncToken) {
      if (syncRecord) {
        await base44.asServiceRole.entities.SyncState.update(syncRecord.id, { sync_token: newSyncToken });
      } else {
        await base44.asServiceRole.entities.SyncState.create({ key: 'gcal_sync', sync_token: newSyncToken });
      }
    }

    return Response.json({ status: 'ok', processed: allItems.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});