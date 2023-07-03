import { Column, TableComponent, FormComponent } from '#app/types/forms';
import * as _ from 'lodash';

export const isFileComponent = (type: string): boolean =>
  type === 'file' || type === 'fileLatest' || type === 'fileLegacy' || type === 'dataImport';

export const isTableComponent = (type: string): boolean =>
  type === 'table' || type === 'tableLatest' || type === 'tableLegacy';

export const findComponents = <T = FormComponent>(
  formComponents: FormComponent[],
  cb: (value: T) => boolean,
): T[] | undefined => {
  const fc = (components: FormComponent[], predicate: (value: T) => boolean): T[] => {
    return _.flatMapDeep(components, (component: FormComponent) => {
      if (predicate(component as unknown as T)) {
        return component;
      }

      if ('columns' in component) {
        return _.flatMapDeep(component.columns, (column: Column) => {
          return column.components.map((columnComponent) => {
            if (predicate(columnComponent as unknown as T)) {
              return columnComponent;
            }

            if ('columns' in columnComponent) {
              return fc([columnComponent], predicate);
            }

            const nestedColumnComponents = _.get(columnComponent, 'components', []);
            if (nestedColumnComponents.length) {
              return fc(nestedColumnComponents, predicate);
            }

            return [];
          });
        });
      }

      if (isTableComponent(component.type)) {
        return _.flatMapDeep((component as unknown as TableComponent).rows, (rows) => {
          return rows.map((rowsComponents) => {
            return rowsComponents.components.map((columns) => {
              if (predicate(columns as unknown as T)) {
                return columns;
              }

              if ('rows' in columns) {
                return fc([columns], predicate);
              }

              const nestedTableComponents = _.get(columns, 'components', []);
              if (nestedTableComponents.length) {
                return fc(nestedTableComponents, predicate);
              }

              return [];
            });
          });
        });
      }

      const nestedComponents = _.get(component, 'components', []);
      if (nestedComponents.length) {
        return fc(nestedComponents, predicate);
      }

      return [];
    }) as unknown as T[];
  };

  const result = fc(formComponents, cb);
  return result.length ? result : undefined;
};
