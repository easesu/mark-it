import { DEFAULT_MARKER_SIZE, MarkerData, MarkerPosition, MarkerSize } from "../definition";
import { WebviewEvent } from "./definition";
import { emit } from "./event";

export class Marker {
  private _data: MarkerData;
  private _el: HTMLDivElement | undefined = undefined;
  private _parent: Marker | null = null;
  private _children: Marker[] = [];
  private _size: MarkerSize = { ...DEFAULT_MARKER_SIZE };
  private _position: MarkerPosition = {x: 0, y: 0};

  constructor(data: MarkerData) {
    this._data = data;
  }

  get el() {
    return this._el;
  }

  get width() {
    return this._size.width;
  }

  get height() {
    return this._size.height;
  }

  get data() {
    return this._data;
  }

  get parent() {
    return this._parent;
  }

  get children() {
    return this._children;
  }

  setParent(parent: Marker) {
    this._parent = parent;
  }

  unsetParent() {
    this._parent = null;
  }

  addChild(child: Marker) {
    this._children.push(child);
  }

  removeChild(child: Marker) {
    const idx = this._children.indexOf(child);
    if (idx !== -1) {
      this._children.splice(idx, 1);
    }
  }

  setPosition(x: number, y: number) {
    this._position.x = x;
    this._position.y = y;
  }

  render() {
    const el = document.createElement('div');
    el.classList.add('marker-item');
    el.title = this._data.fileName;
    el.innerHTML = `
      <div class="marker-item-remove" data-role="remove"></div>
      <div class="marker-item-content">${this._data.content}</div>
      <div class="marker-item-filename">${this._data.fileName}</div>
    `;
    this._el = el;
    this.initEvent();
    return el;
  }

  updateView() {
    if (this._el) {
      Object.assign(this._el.style, {
        width: `${this._size.width}px`,
        height: `${this._size.height}px`,
        left: `${this._position.x}px`,
        top: `${this._position.y}px`,
      });
    }
  }

  initEvent() {
    if (!this._el) {
      return;
    }
    this._el.addEventListener('click', (e: MouseEvent) => {
      const role = (e.target as HTMLElement).dataset.role;
      switch (role) {
        case 'remove':
          return emit(WebviewEvent.requestRemoveMaker, this._data);
        default:
          return emit(WebviewEvent.requestActivateMaker, this._data);
      }
    }, false);
  }
}