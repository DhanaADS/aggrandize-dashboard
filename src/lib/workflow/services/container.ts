// Service Container for Workflow Execution
import { HttpService, AIService, DatabaseService, SEOService } from '../types';
import { HttpServiceImpl } from './http-service';
import { AIServiceImpl } from './ai-service';
import { DatabaseServiceImpl } from './database-service';
import { SEOServiceImpl } from './seo-service';

export interface ServiceContainer {
  http: HttpService;
  ai: AIService;
  database: DatabaseService;
  seo: SEOService;
}

export function createServiceContainer(): ServiceContainer {
  return {
    http: new HttpServiceImpl(),
    ai: new AIServiceImpl(),
    database: new DatabaseServiceImpl(),
    seo: new SEOServiceImpl()
  };
}