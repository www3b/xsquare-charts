// @ts-nocheck
import {Path} from '../../geometry/path.js';
import {getOrCreateSvgChartPart, getOrCreateSvgClipPath, getOrCreateSvgClipRect, getOrCreateSvgDatasetPart, getOrCreateSvgElement, removeExtraSvgElements, removeSvgDatasetPart, resolveSvgPaint} from './svg.js';
import {getFillClipBounds, traceFillPart, traceFillSide} from '../../series/filler/filler.model.js';
import type {FillerDrawTime} from '../renderer.types.js';

function findChild(parent: any, attribute: string, value: string): any {
  return Array.from(parent.children).find((child: any) => child.getAttribute(attribute) === value);
}

function getPhase(chart: any, drawTime: FillerDrawTime): SVGGElement {
  if (drawTime === 'beforeDraw') {
    const phase = getOrCreateSvgChartPart(chart, 'filler-before-draw', 'background');
    if (phase.parentNode.children[0] !== phase) {
      phase.parentNode.insertBefore(phase, phase.parentNode.children[0] || null);
    }
    return phase;
  }
  const root = chart.$chartjsSvgRoot;
  let datasets = findChild(root, 'data-svg-layer', 'datasets') as SVGGElement;
  if (!datasets) {
    const document = root.ownerDocument;
    datasets = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    datasets.setAttribute('data-svg-layer', 'datasets');
    const foreground = findChild(root, 'data-svg-layer', 'foreground');
    root.insertBefore(datasets, foreground || null);
  }
  let phase = findChild(datasets, 'data-filler-phase', 'before-datasets') as SVGGElement;
  if (!phase) {
    phase = datasets.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g');
    phase.setAttribute('data-filler-phase', 'before-datasets');
    datasets.insertBefore(phase, datasets.children[0] || null);
  }
  if (datasets.children[0] !== phase) {
    datasets.insertBefore(phase, datasets.children[0] || null);
  }
  phase.setAttribute('data-render-id', datasets.getAttribute('data-render-id') || '0');
  return phase;
}

function removePhaseFill(chart: any, source: any, drawTime: FillerDrawTime): void {
  const root = chart.$chartjsSvgRoot;
  if (!root) return;
  const layer = drawTime === 'beforeDraw' ? findChild(root, 'data-svg-layer', 'background') : findChild(root, 'data-svg-layer', 'datasets');
  const phase = layer && findChild(layer, drawTime === 'beforeDraw' ? 'data-chart-svg-part' : 'data-filler-phase', drawTime === 'beforeDraw' ? 'filler-before-draw' : 'before-datasets');
  const fill = phase && findChild(phase, 'data-filler-index', String(source.index));
  if (fill) fill.remove();
  if (phase && !phase.children.length) phase.remove();
}

function getContainer(chart: any, model: any, drawTime: FillerDrawTime): SVGGElement {
  if (drawTime === 'beforeDatasetDraw') {
    const group = getOrCreateSvgDatasetPart(chart, model.index, 'fill');
    const dataset = group.parentNode;
    if (dataset.children[0] !== group) {
      dataset.insertBefore(group, dataset.children[0] || null);
    }
    return group;
  }
  const phase = getPhase(chart, drawTime);
  let container = findChild(phase, 'data-filler-index', String(model.index)) as SVGGElement;
  if (!container) {
    container = phase.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g');
    container.setAttribute('data-filler-index', String(model.index));
    phase.appendChild(container);
  }
  phase.appendChild(container);
  container.setAttribute('data-render-id', phase.getAttribute('data-render-id') || '0');
  return container;
}

function renderModel(chart: any, model: any, drawTime: FillerDrawTime): void {
  if (drawTime !== 'beforeDatasetDraw') {
    removeSvgDatasetPart(chart, model.index, 'fill');
  }
  if (drawTime !== 'beforeDraw') {
    removePhaseFill(chart, model.source, 'beforeDraw');
  }
  if (drawTime !== 'beforeDatasetsDraw') {
    removePhaseFill(chart, model.source, 'beforeDatasetsDraw');
  }
  const group = getContainer(chart, model, drawTime);
  let count = 0;
  for (const side of model.sides) {
    for (const part of side.parts) {
      const item = getOrCreateSvgElement(group, 'g', count++);
      const path = new Path();
      const loop = traceFillPart(path, model.line, model.target, part, model.property);
      const bounds = getFillClipBounds(model.chartArea, model.clip, part.bounds);
      item.setAttribute('clip-path', getOrCreateSvgClipRect(chart, `filler-${model.index}-${count}`, bounds));
      const element = getOrCreateSvgElement(item, 'path');
      element.setAttribute('data-role', 'fill');
      element.setAttribute('d', path.toString());
      element.setAttribute('fill', resolveSvgPaint(chart, part.color));
      element.setAttribute('fill-rule', loop ? 'evenodd' : 'nonzero');
      element.setAttribute('stroke', 'none');
      if (side.side) {
        const sidePath = new Path();
        traceFillSide(sidePath, model.target, model.property, side.edge);
        element.setAttribute('clip-path', getOrCreateSvgClipPath(chart, `filler-${model.index}-${side.side}`, sidePath.toString()));
      } else {
        element.setAttribute('clip-path', 'none');
      }
      removeExtraSvgElements(item, 1);
    }
  }
  removeExtraSvgElements(group, count);
}

export function drawSvgFiller(chart: any, models: any[], drawTime: FillerDrawTime): void {
  for (const model of models) {
    renderModel(chart, model, drawTime);
  }
  if (drawTime !== 'beforeDatasetDraw') {
    const phase = getPhase(chart, drawTime);
    const indexes = new Set(models.map((model) => String(model.index)));
    for (const child of Array.from(phase.children) as SVGElement[]) {
      if (!indexes.has(child.getAttribute('data-filler-index') || '')) {
        child.remove();
      }
    }
    if (!phase.children.length) {
      phase.remove();
    }
  }
}

export function removeSvgFiller(chart: any, source: any): void {
  if (!source) return;
  removeSvgDatasetPart(chart, source.index, 'fill');
  removePhaseFill(chart, source, 'beforeDraw');
  removePhaseFill(chart, source, 'beforeDatasetsDraw');
}
