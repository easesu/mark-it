import { MarkerData } from "../definition";
import { SVG_NS, WebviewEvent } from "./definition";
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
  private _edgeList: Edge[] = [];
  private _canvasWidth: number = 0;
  private _canvasHeight: number = 0;
  private _translateX: number = 0;
  private _translateY: number = 0;

  constructor() {
    this._el = document.createElement('div');
    this._el.classList.add('canvas');
    this._container = document.createElement('div');
    this._container.classList.add('layer-container');
    this._nodeCanvas = document.createElement('div');
    this._nodeCanvas.classList.add('node-layer');
    this._edgeCanvas = document.createElementNS(SVG_NS, 'svg');
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
    const edges: Edge[] = [];
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
          const edge = this._linkMarker(parentMarker, marker);
          edges.push(edge);
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
    this.renderEdges(edges);
    this._activateMarker(activeMarker);
    this.relayout();
  }

  moveTo(x: number, y: number) {
    this._translateX = x;
    this._translateY = y;
    this.updateViewPosition();
  }

  moveBy(deltaX: number, deltaY: number) {
    this._translateX += deltaX;
    this._translateY += deltaY;
    this.updateViewPosition();
  }

  _linkMarker(parent: Marker, child: Marker) {
    child.setParent(parent);
    parent.addChild(child);
    const edge = this._addEdge(parent, child);
    parent.addOutEdge(edge);
    child.addInEdge(edge);
    return edge;
  }

  _unlinkMarker(parent: Marker, child: Marker) {
    child.unsetParent();
    parent.removeChild(child);

    const outEdge = Edge.findEdgeByEnd(parent.outEdges, child);
    const inEdge = Edge.findEdgeByStart(child.inEdges, parent);
    if (outEdge) {
      parent.removeOutEdge(outEdge);
      this._removeEdge(outEdge);
    }
    if (inEdge) {
      child.removeInEdge(inEdge);
    }
  }

  _removeEdge(edge: Edge) {
    const index = this._edgeList.indexOf(edge);
    if (index !== -1) {
      this._edgeList.splice(index, 1);
    }
    this.removeEdgeView(edge);
  }

  _addEdge(start: Marker, end: Marker) {
    const edge = new Edge(start, end);
    this._edgeList.push(edge);
    return edge;
  }

  addEdge(start: Marker, end: Marker) {
    const edge = this._addEdge(start, end);
    this.renderEdges([edge]);
    this.relayout();
  }

  _addMarker(markerData: MarkerData) {
    const marker = new Marker(markerData);
    this._markerMap.set(markerData.id, marker);
    return marker;
  }

  addMarker(markerData: MarkerData) {
    const marker = this._addMarker(markerData);
    let edge: Edge | undefined = undefined;
    if (markerData.first) {
      this._rootMarker = marker;
    }

    if (markerData.parent) {
      const parentMarker = this._markerMap.get(markerData.parent);
      if (parentMarker) {
        edge = this._linkMarker(parentMarker, marker);
      }
    }

    this._activateMarker(marker);
    this.renderMarkers([marker]);
    if (edge) {
      this.renderEdges([edge]);
    }
    this.relayout();
  }

  _removeMarker(marker: Marker) {
    if (!marker) {
      return;
    }
    if (marker.parent) {
      this._unlinkMarker(marker.parent, marker);
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
    if (this._activeMarker) {
      this._activeMarker.deactivate();
    }
    if (marker) {
      this._activeMarker = marker;
      marker.activate();
    }
  }

  renderMarkers(markers: Marker[]) {
    markers.forEach(marker => {
      this._nodeCanvas.appendChild(marker.render());
    });
  }
  renderEdges(edges: Edge[]) {
    edges.forEach(edge => {
      this._edgeCanvas.appendChild(edge.render());
    });
  }

  removeMarkerView(marker: Marker) {
    if (marker.el && marker.el.parentElement) {
      marker.el.parentElement.removeChild(marker.el);
    }
  }
  removeEdgeView(edge: Edge) {
    if (edge.el && edge.el.parentNode) {
      edge.el.parentNode.removeChild(edge.el);
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

    const canvasWidth = Math.max(sizeInfo.width, sizeInfo.childrenWidth);
    const canvasHeight = sizeInfo.height + (sizeInfo.childrenHeight > 0 ? sizeInfo.childrenHeight + 20 : 0);

    const layout = (info: Info, left: number, top: number) => {
      let markerLeft = left;
      if (info.childrenWidth > 0) {
        markerLeft += info.childrenWidth / 2 - info.width / 2;
      }
      info.marker.setPosition(markerLeft, top);
      info.marker.updateView();

      let childLeft = markerLeft + info.width / 2 - info.childrenWidth / 2;
      const childTop = top + sizeInfo.height + 20;
      info.children.forEach(childInfo => {
        layout(childInfo, childLeft, childTop);
        childLeft += Math.max(childInfo.width, childInfo.childrenWidth) + 20;
      });
    };
    layout(sizeInfo, canvasWidth / 2 - Math.max(sizeInfo.width, sizeInfo.childrenWidth) / 2, 0);

    this._canvasWidth = canvasWidth;
    this._canvasHeight = canvasHeight;
    this._el.style.width = `${canvasWidth}px`;
    this._el.style.height = `${canvasHeight}px`;

    this._edgeList.forEach(edge => {
      edge.update();
    });
  }

  updateViewPosition() {
    this._container.style.transform = `translate(${this._translateX}px, ${this._translateY}px)`;
  }
  
}