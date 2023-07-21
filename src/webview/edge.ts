import { Marker } from "./marker";

export class Edge {
  private startX: number = 0;
  private startY: number = 0;
  private endX: number = 0;
  private endY: number = 0;
  private start: Marker;
  private end: Marker;

  constructor(start: Marker, end: Marker) {
    this.start = start;
    this.end = end;
  }
}