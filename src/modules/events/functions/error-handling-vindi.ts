/* eslint-disable @typescript-eslint/ban-ts-ignore */
import '../../../common/lib/bootstrap';
import { EventBridgeEvent, EventBridgeHandler } from 'aws-lambda';
import ErrorHandlingService from '../services/ErrorHandlingService';
// @ts-ignore
export const handler: EventBridgeHandler = async (
  // @ts-ignore
  event: EventBridgeEvent
): Promise<void> => {
  const errors = new ErrorHandlingService();
  await errors.runVindi();
};
