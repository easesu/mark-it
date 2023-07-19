import * as vscode from 'vscode';

export enum Action {
  init = 'init',
  addMarker = 'addMarker',
  removeMarker = 'removeMarker',
  requestOpenDocument = 'requestOpenDocument',
}


export interface MessagePayload {
  action: Action;
  data: any;
}

export const WORKSPACE_STORAGE_KEY = 'markIt:markers';

export interface Marker {
  id: string;
  content: string;
  start: vscode.Position;
  end: vscode.Position;
  fileName: string;
}