import {_isDomSupported} from '../shared/index.js';
import BasePlatform from './platform.js';
import BasicPlatform from './basic.js';
import DomPlatform from './dom.js';

export function _detectPlatform(canvas) {
  if (!_isDomSupported() || (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas)) {
    return BasicPlatform;
  }
  return DomPlatform;
}

export {BasePlatform, BasicPlatform, DomPlatform};
