import { getArea, getLength } from 'ol/sphere';
import Polygon from 'ol/geom/Polygon';
import { transform } from 'ol/proj';
import { Geometry } from 'ol/geom';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { Modify, Snap } from 'ol/interaction';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';

export interface ParcelBoundary {
  coordinates: number[][];
  area: number;
  perimeter: number;
}

export interface AutoDetectionOptions {
  minArea?: number;
  maxArea?: number;
  smoothingFactor?: number;
  snapToGrid?: boolean;
  gridSize?: number;
}

export class ParcelAutomation {

  static calculateArea(polygon: Polygon): number {
    const area = getArea(polygon, { projection: 'EPSG:3857' });
    return Math.round((area / 10000) * 100) / 100;
  }

  static calculatePerimeter(polygon: Polygon): number {
    const coordinates = polygon.getCoordinates()[0];
    let perimeter = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
      const coord1 = transform(coordinates[i], 'EPSG:3857', 'EPSG:4326');
      const coord2 = transform(coordinates[i + 1], 'EPSG:3857', 'EPSG:4326');
      perimeter += this.haversineDistance(coord1, coord2);
    }

    return Math.round(perimeter * 100) / 100;
  }

  private static haversineDistance(coord1: number[], coord2: number[]): number {
    const R = 6371000;
    const lat1 = coord1[1] * Math.PI / 180;
    const lat2 = coord2[1] * Math.PI / 180;
    const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const deltaLon = (coord2[0] - coord1[0]) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  static snapToGrid(coordinates: number[][], gridSize: number = 10): number[][] {
    return coordinates.map(coord => [
      Math.round(coord[0] / gridSize) * gridSize,
      Math.round(coord[1] / gridSize) * gridSize
    ]);
  }

  static smoothBoundary(coordinates: number[][], factor: number = 0.5): number[][] {
    if (coordinates.length < 3) return coordinates;

    const smoothed: number[][] = [];
    const n = coordinates.length;

    for (let i = 0; i < n; i++) {
      const prev = coordinates[(i - 1 + n) % n];
      const curr = coordinates[i];
      const next = coordinates[(i + 1) % n];

      smoothed.push([
        curr[0] * (1 - factor) + (prev[0] + next[0]) * factor / 2,
        curr[1] * (1 - factor) + (prev[1] + next[1]) * factor / 2
      ]);
    }

    return smoothed;
  }

  static simplifyBoundary(coordinates: number[][], tolerance: number = 0.0001): number[][] {
    if (coordinates.length <= 3) return coordinates;

    const simplified: number[][] = [coordinates[0]];
    let lastPoint = coordinates[0];

    for (let i = 1; i < coordinates.length - 1; i++) {
      const point = coordinates[i];
      const distance = Math.sqrt(
        Math.pow(point[0] - lastPoint[0], 2) +
        Math.pow(point[1] - lastPoint[1], 2)
      );

      if (distance > tolerance) {
        simplified.push(point);
        lastPoint = point;
      }
    }

    simplified.push(coordinates[coordinates.length - 1]);
    return simplified;
  }

  static validateBoundary(coordinates: number[][]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (coordinates.length < 4) {
      errors.push('La parcelle doit avoir au moins 3 points');
    }

    const firstPoint = coordinates[0];
    const lastPoint = coordinates[coordinates.length - 1];
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      errors.push('La parcelle doit être fermée');
    }

    if (this.hasSelfintersection(coordinates)) {
      errors.push('La parcelle ne doit pas avoir d\'auto-intersection');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private static hasSelfintersection(coordinates: number[][]): boolean {
    for (let i = 0; i < coordinates.length - 3; i++) {
      for (let j = i + 2; j < coordinates.length - 1; j++) {
        if (i === 0 && j === coordinates.length - 2) continue;

        if (this.segmentsIntersect(
          coordinates[i], coordinates[i + 1],
          coordinates[j], coordinates[j + 1]
        )) {
          return true;
        }
      }
    }
    return false;
  }

  private static segmentsIntersect(
    p1: number[], p2: number[], p3: number[], p4: number[]
  ): boolean {
    const d1 = this.direction(p3, p4, p1);
    const d2 = this.direction(p3, p4, p2);
    const d3 = this.direction(p1, p2, p3);
    const d4 = this.direction(p1, p2, p4);

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
      return true;
    }

    if (d1 === 0 && this.onSegment(p3, p1, p4)) return true;
    if (d2 === 0 && this.onSegment(p3, p2, p4)) return true;
    if (d3 === 0 && this.onSegment(p1, p3, p2)) return true;
    if (d4 === 0 && this.onSegment(p1, p4, p2)) return true;

    return false;
  }

  private static direction(p1: number[], p2: number[], p3: number[]): number {
    return (p3[0] - p1[0]) * (p2[1] - p1[1]) - (p2[0] - p1[0]) * (p3[1] - p1[1]);
  }

  private static onSegment(p1: number[], p2: number[], p3: number[]): boolean {
    return p2[0] <= Math.max(p1[0], p3[0]) && p2[0] >= Math.min(p1[0], p3[0]) &&
           p2[1] <= Math.max(p1[1], p3[1]) && p2[1] >= Math.min(p1[1], p3[1]);
  }

  static createModifyInteraction(vectorSource: VectorSource): Modify {
    return new Modify({
      source: vectorSource,
      style: new Style({
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({ color: '#22c55e' }),
          stroke: new Stroke({ color: 'white', width: 2 })
        })
      })
    });
  }

  static createSnapInteraction(vectorSource: VectorSource): Snap {
    return new Snap({
      source: vectorSource,
      pixelTolerance: 15
    });
  }

  static autoDetectParcels(
    imageData: ImageData,
    options: AutoDetectionOptions = {}
  ): ParcelBoundary[] {
    const { minArea = 0.1, maxArea = 1000, smoothingFactor = 0.3 } = options;
    const parcels: ParcelBoundary[] = [];

    const edges = this.detectEdges(imageData);
    const contours = this.findContours(edges);

    for (const contour of contours) {
      const smoothed = this.smoothBoundary(contour, smoothingFactor);
      const simplified = this.simplifyBoundary(smoothed);

      const polygon = new Polygon([simplified.map(coord =>
        transform([coord[0], coord[1]], 'EPSG:4326', 'EPSG:3857')
      )]);

      const area = this.calculateArea(polygon);

      if (area >= minArea && area <= maxArea) {
        const validation = this.validateBoundary(simplified);
        if (validation.valid) {
          parcels.push({
            coordinates: simplified,
            area,
            perimeter: this.calculatePerimeter(polygon)
          });
        }
      }
    }

    return parcels;
  }

  private static detectEdges(imageData: ImageData): Uint8ClampedArray {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const edges = new Uint8ClampedArray(width * height);

    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const idx = ((y + i) * width + (x + j)) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            const kernelIdx = (i + 1) * 3 + (j + 1);

            gx += gray * sobelX[kernelIdx];
            gy += gray * sobelY[kernelIdx];
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges[y * width + x] = magnitude > 50 ? 255 : 0;
      }
    }

    return edges;
  }

  private static findContours(edges: Uint8ClampedArray): number[][][] {
    const contours: number[][][] = [];

    return contours;
  }

  static suggestOptimalParcels(
    farmBoundary: number[][],
    targetSize: number = 1,
    orientation: 'north-south' | 'east-west' | 'optimal' = 'optimal'
  ): ParcelBoundary[] {
    const suggestions: ParcelBoundary[] = [];

    return suggestions;
  }

  static mergeAdjacentParcels(parcel1: ParcelBoundary, parcel2: ParcelBoundary): ParcelBoundary | null {

    return null;
  }

  static splitParcel(
    parcel: ParcelBoundary,
    splitLine: number[][],
    equalArea: boolean = false
  ): ParcelBoundary[] {

    return [];
  }
}

export class ParcelDrawingAssist {
  private vectorSource: VectorSource;
  private currentFeature: Feature | null = null;

  constructor(vectorSource: VectorSource) {
    this.vectorSource = vectorSource;
  }

  enableMagneticSnap(threshold: number = 20): void {

  }

  enableRightAngleMode(): void {

  }

  enableParallelMode(referenceFeature: Feature): void {

  }

  suggestNextPoint(currentPoints: number[][]): number[] | null {
    if (currentPoints.length < 2) return null;

    const lastPoint = currentPoints[currentPoints.length - 1];
    const prevPoint = currentPoints[currentPoints.length - 2];

    const dx = lastPoint[0] - prevPoint[0];
    const dy = lastPoint[1] - prevPoint[1];

    return [lastPoint[0] + dx, lastPoint[1] + dy];
  }

  autoComplete(currentPoints: number[][]): number[][] {
    if (currentPoints.length < 3) return currentPoints;

    return [...currentPoints, currentPoints[0]];
  }
}

export const parcelStyles = {
  default: new Style({
    fill: new Fill({
      color: 'rgba(34, 197, 94, 0.15)'
    }),
    stroke: new Stroke({
      color: '#22c55e',
      width: 2.5
    })
  }),

  selected: new Style({
    fill: new Fill({
      color: 'rgba(34, 197, 94, 0.35)'
    }),
    stroke: new Stroke({
      color: '#16a34a',
      width: 4,
      lineDash: undefined
    })
  }),

  drawing: new Style({
    fill: new Fill({
      color: 'rgba(59, 130, 246, 0.2)'
    }),
    stroke: new Stroke({
      color: '#3b82f6',
      width: 2.5,
      lineDash: [10, 5]
    })
  }),

  error: new Style({
    fill: new Fill({
      color: 'rgba(239, 68, 68, 0.2)'
    }),
    stroke: new Stroke({
      color: '#ef4444',
      width: 2.5
    })
  })
};