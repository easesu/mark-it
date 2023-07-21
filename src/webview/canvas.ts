import { MarkerData } from "../definition";
import { WebviewEvent } from "./definition";
import { Edge } from "./edge";
import { emit } from "./event";
import { Marker } from "./marker";

export class Canvas {
  private _el: HTMLDivElement;
  private _container: HTMLDivElement;
  private _nodeCanvas: HTMLDivElement;
  private _edgeCanvas: SVGElement;

  private _rootMarker: Marker | null = null;
  private _activeMarker: Marker | null = null;
  private _markerMap: Map<string, Marker> = new Map();
  private _edgeMap: Map<string, Edge> = new Map();

  constructor() {
    this._el = document.createElement('div');
    this._el.classList.add('canvas');
    this._container = document.createElement('div');
    this._container.classList.add('layer-container');
    this._nodeCanvas = document.createElement('div');
    this._nodeCanvas.classList.add('node-layer');
    this._edgeCanvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this._edgeCanvas.classList.add('edge-layer');
    this._el.appendChild(this._container);
    this._container.appendChild(this._nodeCanvas);
    this._container.appendChild(this._edgeCanvas);
  }

  get el() {
    return this._el;
  }

  init(data: { markers: MarkerData[]; activeMarkerId: string | null }) {
    if (data.markers.length === 0) {
      return;
    }
  
    const markers: Marker[] = [];
    let rootMarker: Marker | null = null;
    data.markers.forEach(markerData => {
      if (!markerData.first && !markerData.parent) {
        return;
      }
      const marker = this._addMarker(markerData);
      if (markerData.first) {
        rootMarker = marker;
      }
      markers.push(marker);
    });

    if (!rootMarker) {
      return;
    }

    const remove = (marker: Marker) => {
      const index = markers.indexOf(marker);
      if (index !== -1) {
        markers.splice(index, 1);
        this._markerMap.delete(marker.data.id);
      }
    };

    const link = (marker: Marker) => {
      if (marker !== rootMarker && !marker.data.parent) {
        remove(marker);
        return;
      }
      if (marker.data.parent) {
        const parentMarker = this._markerMap.get(marker.data.parent);
        if (parentMarker && parentMarker.data.children && parentMarker.data.children.includes(marker.data.id)) {
          marker.setParent(parentMarker);
          parentMarker.addChild(marker);
        } else {
          remove(marker);
        }
      }
      if (marker.data.children) {
        marker.data.children.forEach(child => {
          const childMarker = this._markerMap.get(child);
          if (childMarker) {
            link(childMarker);
          }
        });
      }
    };

    link(rootMarker);
    
    this._rootMarker = rootMarker;
    let activeMarker;
    if (data.activeMarkerId) {
      activeMarker = this._markerMap.get(data.activeMarkerId) || null;
    }
    if (!activeMarker) {
      activeMarker = rootMarker;
    }
    this.renderMarkers(markers);
    this._activateMarker(activeMarker);
    this.relayout();
  }

  _addMarker(markerData: MarkerData) {
    const marker = new Marker(markerData);
    this._markerMap.set(markerData.id, marker);
    return marker;
  }

  addMarker(markerData: MarkerData) {
    const marker = this._addMarker(markerData);
    if (markerData.first) {
      this._rootMarker = marker;
    }

    if (markerData.parent) {
      const parentMarker = this._markerMap.get(markerData.parent);
      if (parentMarker) {
        marker.setParent(parentMarker);
        parentMarker.addChild(marker);
      }
    }

    this._activateMarker(marker);
    this.renderMarkers([marker]);
    this.relayout();
  }

  _removeMarker(marker: Marker) {
    if (!marker) {
      return;
    }
    if (marker.parent) {
      marker.parent.removeChild(marker);
      marker.unsetParent();
    }

    this._markerMap.delete(marker.data.id);
    this.removeMarkerView(marker);
    const { children } = marker;
    children.forEach(child => {
      this._removeMarker(child);
    });
    
  }

  removeMarker(markerId: string) {
    const marker = this._markerMap.get(markerId);
    if (!marker) {
      return;
    }
    const parent = marker.parent;
    this._removeMarker(marker);
    this.relayout();
    if (parent) {
      emit(WebviewEvent.requestActivateMaker, parent.data.id);
    }
  }

  activateMarker(markerId: string) {
    const marker = this._markerMap.get(markerId);
    if (!marker) {
      return;
    }
    this._activateMarker(marker);
  }

  _activateMarker(marker: Marker) {
    this._activeMarker = marker;
  }

  renderMarkers(markers: Marker[]) {
    markers.forEach(marker => {
      this._nodeCanvas.appendChild(marker.render());
    });
  }

  removeMarkerView(marker: Marker) {
    if (marker.el && marker.el.parentElement) {
      marker.el.parentElement.removeChild(marker.el)
    }
  }

  relayout() {
    const rootMarker = this._rootMarker;
    if (!rootMarker) {
      return;
    }

    interface Info {
      width: number;
      height: number;
      childrenWidth: number;
      childrenHeight: number;
      marker: Marker;
      children: Info[]
    }
    const calc = (marker: Marker): Info => {
      let childrenWidth = 0;
      let childrenHeight = 0;

      const children = marker.children.map(child => {
        const res = calc(child);
        const width = Math.max(res.width, res.childrenWidth);
        childrenWidth += width;
        childrenHeight = Math.max(childrenHeight, res.height + (res.childrenHeight > 0 ? res.childrenHeight + 20 : 0));
        return res;
      });

      return {
        width: marker.width,
        height: marker.height,
        childrenWidth: childrenWidth + Math.max(0, marker.children.length - 1) * 20,
        childrenHeight: childrenHeight,
        marker,
        children
      };
    };

    const sizeInfo = calc(rootMarker);

    const layout = (info: Info, parentX: number, parentY: number) => {
      const width = Math.max(info.width, info.childrenWidth);
      let left = parentX - width / 2;
      const top = parentY + info.height + 20;
    
      info.children.forEach((childInfo) => {
        const width = Math.max(childInfo.width, childInfo.childrenWidth);
        const x = left + width / 2;
        const y = top;
        left += width + 20;
        childInfo.marker.setPosition(x, y);
        childInfo.marker.updateView();
        layout(childInfo, x, y);
      });
    };

    sizeInfo.marker.updateView();

    layout(sizeInfo, 0, 0);
  }
  
}