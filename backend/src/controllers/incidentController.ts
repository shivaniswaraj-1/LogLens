import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import {
  addIncidentNote,
  assignIncident,
  createIncident,
  getIncidentById,
  listIncidentEvents,
  listIncidents,
  updateIncident,
  updateIncidentStatus,
} from '../services/incidentService';
import {
  addNoteSchema,
  assignIncidentSchema,
  createIncidentSchema,
  incidentQuerySchema,
  updateIncidentSchema,
  updateStatusSchema,
} from '../validators/incidentValidators';

function requireUserId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.id;
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = createIncidentSchema.parse(req.body);
  const incident = await createIncident(input, requireUserId(req));
  res.status(201).json({ incident });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = incidentQuerySchema.parse(req.query);
  const result = await listIncidents(query);
  res.status(200).json(result);
});

export const detail = asyncHandler(async (req: Request, res: Response) => {
  const incident = await getIncidentById(req.params.id);
  res.status(200).json({ incident });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const input = updateIncidentSchema.parse(req.body);
  const incident = await updateIncident(req.params.id, input, requireUserId(req));
  res.status(200).json({ incident });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const input = updateStatusSchema.parse(req.body);
  const incident = await updateIncidentStatus(req.params.id, input, requireUserId(req));
  res.status(200).json({ incident });
});

export const assign = asyncHandler(async (req: Request, res: Response) => {
  const input = assignIncidentSchema.parse(req.body);
  const incident = await assignIncident(req.params.id, input, requireUserId(req));
  res.status(200).json({ incident });
});

export const addNote = asyncHandler(async (req: Request, res: Response) => {
  const input = addNoteSchema.parse(req.body);
  const incident = await addIncidentNote(req.params.id, input, requireUserId(req));
  res.status(200).json({ incident });
});

export const events = asyncHandler(async (req: Request, res: Response) => {
  const items = await listIncidentEvents(req.params.id);
  res.status(200).json({ items });
});
