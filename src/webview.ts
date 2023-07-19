import { Action, Marker, MessagePayload } from "./definition";

declare function acquireVsCodeApi(): any;

const vscode = acquireVsCodeApi();

const $app = document.querySelector('#app') as HTMLDivElement;

const send = (action: Action, data?: any) => {
  vscode.postMessage({
    action,
    data,
  });
};

class MarkerList {
  private items: MarkerItem[] = [];
  private $el: HTMLDivElement;

  constructor() {
    this.$el = document.createElement('div');
    $app.appendChild(this.$el);
  }

  addMarker(marker: Marker) {
    const markerItem = new MarkerItem(this, marker, this.items.length);
    this.items.push(markerItem);
    this.$el.appendChild(markerItem.render());
  }
  addMarkers(markers: Marker[] | Marker) {
    if (Array.isArray(markers)) {
      markers.forEach(marker => this.addMarker(marker));
    } else if (markers) {
      this.addMarker(markers);
    }
  }

  removeMarker(marker: MarkerItem) {
    const idx = this.items.indexOf(marker);
    if (idx === -1) {
      return;
    }
    this.items.splice(idx, 1);
    if (marker.el) {
      this.$el.removeChild(marker.el);
    }
    send(Action.removeMarker, marker.data);
    marker.destroy();
  }
}

class MarkerItem {
  private markerList: MarkerList;
  private _data: Marker;
  private $el: HTMLDivElement | undefined = undefined;
  private idx: number = 0;

  constructor(markerList: MarkerList, data: Marker, idx: number) {
    this.markerList = markerList;
    this._data = data;
    this.idx = idx;
  }

  get el() {
    return this.$el;
  }

  get data() {
    return this._data;
  }

  render() {
    const $el = document.createElement('div');
    $el.classList.add('marker-item');
    $el.title = this._data.fileName;
    $el.innerHTML = `
      <div class="marker-item-idx">${this.idx + 1}</div>
      <div class="marker-item-remove" data-role="remove"></div>
      <div class="marker-item-content">${this._data.content}</div>
      <div class="marker-item-filename">${this._data.fileName}</div>
    `;
    this.$el = $el;
    this.initEvent();
    return $el;
  }

  initEvent() {
    if (!this.$el) {
      return;
    }
    this.$el.addEventListener('click', (e: MouseEvent) => {
      const role = (e.target as HTMLElement).dataset.role;

      switch (role) {
        case 'remove':
          this.markerList.removeMarker(this);
        default:
          return send(Action.requestOpenDocument, this.data);
      }
    }, false);
  }

  destroy() {
    this.$el = undefined;
  }
}

const currentMarkerList = new MarkerList();

const handleInit = (markers: Marker[]) => {
  if (markers) {
    currentMarkerList.addMarkers(markers);
  }
};

const handleAddMarker = (newMarker: Marker) => {
  currentMarkerList.addMarker(newMarker);
};


const handleMessage = (e: MessageEvent<MessagePayload>) => {
  switch (e.data.action) {
    case Action.init:
      return handleInit(e.data.data);
    case Action.addMarker:
      return handleAddMarker(e.data.data);
  }
};


window.addEventListener('message', handleMessage);
send(Action.init);
