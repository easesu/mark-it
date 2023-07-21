import { SVG_NS } from "./definition";
import { Marker } from "./marker";

export class Edge {
  static findEdgeByStart(edges: Edge[], start: Marker) {
    return edges.find(e => e._start === start);
  }

  static findEdgeByEnd(edges: Edge[], end: Marker) {
    return edges.find(e => e._end === end);
  }

  private _el: SVGPathElement | null = null;
  private _start: Marker;
  private _end: Marker;

  constructor(start: Marker, end: Marker) {
    this._start = start;
    this._end = end;
  }

  get el() {
    return this._el;
  }

  render() {
    const el = document.createElementNS(SVG_NS, 'path');
    this._el = el;
    return this._el;
  }

  update() {
    if (!this._el) {
      return;
    }
    const startX = this._start.x + this._start.width / 2;
    const startY = this._start.y + this._start.height;
    const endX = this._end.x + this._end.width / 2;
    const endY = this._end.y;

    let d = '';
    if (startX === endX) {
      d = `M ${startX},${startY}
        L ${endX},${endY}
      `;
    } else {
      d = `M ${startX},${startY}
        C ${startX},${startY + 20} ${endX},${endY - 20} ${endX},${endY}
      `;
    }
    d += `
    L ${endX - 3},${endY - 3}
    M ${endX},${endY}
    L ${endX + 3},${endY - 3}
    `;

    this._el.setAttributeNS(null, 'd', d);
  }
}