import * as vscode from 'vscode';

export enum Action {
  init = 'init',
  addMarker = 'addMarker',
  removeMarker = 'removeMarker',
  activateMarker = 'activateMarker',
  requestOpenDocument = 'requestOpenDocument',
  requestRemoveMaker = 'requestRemoveMaker',
  requestActivateMaker = 'requestActivateMaker',
}

export interface MessagePayload {
  action: Action;
  data: any;
}

export const WORKSPACE_STORAGE_KEY = 'markIt:markers';

export interface MarkerData {
  id: string;
  parent?: string;
  children?: string[];
  content: string;
  start: vscode.Position;
  end: vscode.Position;
  fileName: string;
  first?: boolean;
}

export interface MarkerSize {
  width: number;
  height: number;
}

export const DEFAULT_MARKER_SIZE = {
  width: 120,
  height: 46,
};

export interface MarkerPosition {
  x: number;
  y: number;
}