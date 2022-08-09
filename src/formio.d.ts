type ElementStub = unknown;
type EventStub = Record<string, unknown>;

export interface FormioGlobal {
  Event: EventStub;

  Text: ElementStub;
  HTMLElement: ElementStub;
  HTMLCanvasElement: ElementStub;

  navigator: {
    userAgent: string;
  };
  window: {
    addEventListener: () => unknown;
    Event: unknown;
    navigator: FormioGlobal['navigator'];
  };
  document: {
    createElement: () => ElementStub | unknown;
    getElementsByTagName: () => Array<unknown>;
    documentElement: {
      style: [];
    };
    cookie: string;
  };
}

declare global {
  type Event = FormioGlobal['Event'];

  type Text = FormioGlobal['Text'];
  type HTMLElement = FormioGlobal['HTMLElement'];
  type HTMLCanvasElement = FormioGlobal['HTMLCanvasElement'];

  type CSSStyleDeclaration = Record<string, unknown>;

  // IMPORTANT: use var; see: https://stackoverflow.com/a/69429093
  /* eslint-disable no-var */
  var Event: FormioGlobal['Event'];
  var Text: FormioGlobal['Text'];
  var HTMLElement: FormioGlobal['HTMLElement'];
  var HTMLCanvasElement: FormioGlobal['HTMLCanvasElement'];
  var navigator: FormioGlobal['navigator'];
  var window: FormioGlobal['window'];
  var document: FormioGlobal['document'];
  /* eslint-enable no-var */
}
