import { DBDataViewDataCollection } from './backend/NewDataViewInput';

export interface DataViewModel {
  dataViewID: string;
  author: string;
  name: string;
  valid?: boolean;
  created: number;
  updated?: number;
  status: string;
  description: string;
  dataViewType: 'collection' | 'file' | 'database';
  data: DBDataViewDataCollection;
  lastPull: '';
  pulledBy: '';
  reportingYear?: string;
}

export interface DBDataView {
  dataViewID: string;
  author: string;
  name: string;
  valid?: boolean;
  created: number;
  status: string;
  updated?: number;
  description: string;
  id: string;
  dataViewType: 'collection' | 'file' | 'database';
  type: string;
  data: DBDataViewDataCollection;
  lastPull: '';
  pulledBy: '';
}

export enum DATA_VIEW_STATUS {
  REQUESTED = 'REQUESTED',
  PROCESSING = 'PROCESSING',
  MISSING_DATA = 'MISSING DATA',
  AVAILABLE = 'AVAILABLE',
  FAILED = 'FAILED'
}
