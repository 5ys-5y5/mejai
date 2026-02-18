type InsertEvent = (
  context: any,
  sessionId: string,
  turnId: string | null,
  eventType: string,
  payload: Record<string, any>,
  botContext: Record<string, any>
) => Promise<unknown>;

export async function emitGuardedEvent(input: {
  insertEvent: InsertEvent;
  context: any;
  sessionId: string;
  turnId: string | null;
  baseEvent: string;
  payloadBefore: Record<string, any>;
  payloadAfter: Record<string, any>;
  botContext: Record<string, any>;
}) {
  const { insertEvent, context, sessionId, turnId, baseEvent, payloadBefore, payloadAfter, botContext } = input;
  await insertEvent(context, sessionId, turnId, `${baseEvent}_STARTED`, payloadBefore, botContext);
  await insertEvent(context, sessionId, turnId, `${baseEvent}_COMPLETED`, payloadAfter, botContext);
}
