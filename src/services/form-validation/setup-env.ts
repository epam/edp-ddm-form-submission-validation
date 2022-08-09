/* istanbul ignore file */
import type { FormioGlobal } from '#app/formio';

const noop = () => void 0;
const noopClass = class {};

/* istanbul ignore next */
function _setupGlobalObject(global: FormioGlobal): FormioGlobal {
  // Define a few global noop placeholder shims and import the component classes
  global.Text = noopClass;
  global.HTMLElement = noopClass;
  global.HTMLCanvasElement = noopClass;
  global.navigator = { userAgent: '' };
  global.window = {
    addEventListener: noop,
    Event: {},
    navigator: global.navigator,
  };
  global.document = {
    cookie: '',
    createElement: () => ({}),
    documentElement: { style: [] },
    getElementsByTagName: () => [],
  };
  return global;
}

_setupGlobalObject(global);
