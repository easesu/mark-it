import { Action, MarkerData, MessagePayload } from "./definition";
import { Canvas } from "./webview/canvas";
import { WebviewEvent } from "./webview/definition";
import { on } from "./webview/event";
import { vscode } from "./webview/global";

const sendDataToWebview = (action: Action, data?: any) => {
  vscode.postMessage({
    action,
    data,
  });
};

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
  sendDataToWebview(Action.requestRemoveMaker, markerData.id);
};

const handleRequestActivateMarker = (markerData: MarkerData) => {
  sendDataToWebview(Action.requestActivateMaker, markerData.id);
};

const previousMousePosition = {
  x: 0,
  y: 0,
};
let isWillDragging = false;
let isDragging = false;
const handleMouseDown = (e: MouseEvent) => {
  previousMousePosition.x = e.clientX;
  previousMousePosition.y = e.clientY;
  isWillDragging = true;
}
const handleMouseMove = (e: MouseEvent) => {
  if (!isWillDragging && !isDragging) {
    return;
  }
  if (isWillDragging) {
    const isDraggingGesture = Math.abs(e.clientX - previousMousePosition.x) > 4 || Math.abs(e.clientY - previousMousePosition.y) > 4;
    if (isDraggingGesture) {
      isWillDragging = false;
      isDragging = true;
    }
  }
  canvas.moveBy(e.clientX - previousMousePosition.x, e.clientY - previousMousePosition.y);
  previousMousePosition.x = e.clientX;
  previousMousePosition.y = e.clientY;
};
const handleMouseUp = (e: MouseEvent) => {
  isWillDragging = false;
  isDragging = false;
  previousMousePosition.x = 0;
  previousMousePosition.y = 0;
};

const $app = document.querySelector('#app') as HTMLDivElement;
const canvas = new Canvas();
$app.appendChild(canvas.el);

document.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseup', handleMouseUp);

window.addEventListener('message', handleMessage);
on(WebviewEvent.requestRemoveMaker, handleRequestRemoveMarker);
on(WebviewEvent.requestActivateMaker, handleRequestActivateMarker);
sendDataToWebview(Action.init);
