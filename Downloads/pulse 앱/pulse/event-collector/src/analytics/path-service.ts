import { EventRepository } from "../repositories/event-repository.js";
import { PathQuery, PathReportRow } from "../types.js";

export interface PathServiceOptions {
  repository: EventRepository;
}

export class PathService {
  constructor(private readonly options: PathServiceOptions) {}

  async queryTopPaths(query: PathQuery): Promise<PathReportRow[]> {
    return this.options.repository.queryTopPaths(query);
  }
}
