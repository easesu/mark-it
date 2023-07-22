import { DEFAULT_MARKER_SIZE, MarkerData, MarkerPosition, MarkerSize } from "../definition";
import { WebviewEvent } from "./definition";
import { Edge } from "./edge";
import { emit } from "./event";

export class Marker {
  private _data: MarkerData;
  private _el: HTMLDivElement | undefined = undefined;
  private _parent: Marker | null = null;
  private _children: Marker[] = [];
  private _size: MarkerSize = { ...DEFAULT_MARKER_SIZE };
  private _position: MarkerPosition = {x: 0, y: 0};
  private _inEdges: Edge[] = [];
  private _outEdges: Edge[] = [];
  private _active: boolean = false;

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

  get x() {
    return this._position.x;
  }

  get y() {
    return this._position.y;
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

  get inEdges() {
    return this._inEdges;
  }

  get outEdges() {
    return this._outEdges;
  }

  get active() {
    return this._active;
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

  addInEdge(edge: Edge) {
    this._inEdges.push(edge);
  }

  addOutEdge(edge: Edge) {
    this._outEdges.push(edge);
  }

  removeInEdge(edge: Edge) {
    const index = this._inEdges.indexOf(edge);
    if (index !== -1) {
      this._inEdges.splice(index, 1);
    }
  }

  removeOutEdge(edge: Edge) {
    const index = this._outEdges.indexOf(edge);
    if (index !== -1) {
      this._outEdges.splice(index, 1);
    }
  }

  setPosition(x: number, y: number) {
    this._position.x = x;
    this._position.y = y;
  }

  activate() {
    this._active = true;
    this.updateActiveView();
  }

  deactivate() {
    this._active = false;
    this.updateActiveView();
  }

  render() {
    const el = document.createElement('div');
    el.classList.add('marker-item');
    el.title = `${this._data.content}\n${this._data.fileName}`;
    const fileNameParts = this._data.fileName.split('/');
    const shortFileName = fileNameParts[fileNameParts.length - 1];
    el.innerHTML = `
      <div class="marker-item-main">
        <div class="marker-item-content">${this._data.content}</div>
        <div class="marker-item-remove" data-role="remove"></div>
      </div>
      <div class="marker-item-filename">${shortFileName}</div>
    `;
    this._el = el;
    this.updateView();
    this.updateActiveView();
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

  updateActiveView() {
    if (this._el) {
      if (this._active) {
        this._el.classList.add('is-active');
      } else {
        this._el.classList.remove('is-active');
      }
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