import { Action, MarkerData, MessagePayload } from "./definition";
import { Canvas } from "./webview/canvas";
import { WebviewEvent } from "./webview/definition";
import { on } from "./webview/event";

declare function acquireVsCodeApi(): any;

const vscode = acquireVsCodeApi();

const $app = document.querySelector('#app') as HTMLDivElement;

const send = (action: Action, data?: any) => {
  vscode.postMessage({
    action,
    data,
  });
};

const canvas = new Canvas();
$app.appendChild(canvas.el);

const handleInit = (data: { markers: MarkerData[]; activeMarkerId: string | null}) => {
  if (data) {
    canvas.init(data);
  }
};

const handleAddMarker = (newMarker: MarkerData) => {
  canvas.addMarker(newMarker);
};

const handleRemoveMarker = (markerId: string) => {
  canvas.removeMarker(markerId);
};

const handleActivateMarker = (markerId: string) => {
  canvas.activateMarker(markerId);
};

const handleMessage = (e: MessageEvent<MessagePayload>) => {
  switch (e.data.action) {
    case Action.init:
      return handleInit(e.data.data);
    case Action.addMarker:
      return handleAddMarker(e.data.data);
    case Action.removeMarker:
      return handleRemoveMarker(e.data.data);
    case Action.activateMarker:
      return handleActivateMarker(e.data.data);
  }
};

const handleRequestRemoveMarker = (markerData: MarkerData) => {
  send(Action.requestRemoveMaker, markerData.id);
};

const handleRequestActivateMarker = (markerData: MarkerData) => {
  send(Action.requestActivateMaker, markerData.id);
};


window.addEventListener('message', handleMessage);
on(WebviewEvent.requestRemoveMaker, handleRequestRemoveMarker);
on(WebviewEvent.requestActivateMaker, handleRequestActivateMarker);
send(Action.init);
