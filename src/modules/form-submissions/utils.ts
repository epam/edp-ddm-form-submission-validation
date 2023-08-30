import { Column, TableComponent, FormComponent, FormSubmission } from '#app/types/forms';
import * as _ from 'lodash';

export const isFileComponent = (type: string): boolean =>
  type === 'file' || type === 'fileLatest' || type === 'fileLegacy' || type === 'dataImport';

export const isTableComponent = (type: string): boolean =>
  type === 'table' || type === 'tableLatest' || type === 'tableLegacy';

export const isFieldsetComponent = (type: string): boolean => (
  type === 'fieldset' || type === 'fieldsetLatest' || type === 'fieldsetLegacy'
);

export const isColumnsComponent = (type: string): boolean => (
  type === 'columns' || type === 'columnsLatest' || type === 'columnsLegacy'
);

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

export const convertSubmissionData = (
  components: Array<FormComponent>,
  data: Record<string, unknown>,
  converter: (value: unknown, component: FormComponent) => unknown,
): Record<string, unknown> => {
  return _.mapValues(data, (value, key) => {
    const componentDefinitionFirstLevel = components.find((component) => component.key === key);
    // fieldset does not have its own data - data from nested components is used instead
    const fieldsetComponents = components.filter((component) => isFieldsetComponent(component.type));
    const componentDefinitionInFieldset = fieldsetComponents
      .flatMap((fieldsetComponent) => _.get(fieldsetComponent, 'components', []))
      .find((component: FormComponent) => component.key === key);
    const componentDefinitionInColumns = components
      .filter((c) => isColumnsComponent(c.type))
      .flatMap((c) => _.get(c, 'columns', []))
      .flatMap((column) => _.get(column, 'components', []))
      .find((component: FormComponent) => component.key === key);
    const componentDefinitionInTable = components
      .filter((c) => isTableComponent(c.type))
      .flatMap((c) => _.get(c, 'rows', []))
      .flatMap((item) => item)
      .flatMap((column) => _.get(column, 'components', []))
      .find((component: FormComponent) => component.key === key);

    const componentDefinition = componentDefinitionFirstLevel
      || componentDefinitionInFieldset
      || componentDefinitionInTable
      || componentDefinitionInColumns;
    const nestedComponents = _.get(componentDefinition, 'components', []) as Array<FormComponent>;

    if (componentDefinition) {
      const convertedValue = converter(value, componentDefinition);
      if (nestedComponents?.length && _.isArray(convertedValue)) {
        return convertedValue.map((nestedValue) => convertSubmissionData(nestedComponents, nestedValue, converter));
      }

      return convertedValue;
    }

    return value;
  });
};

export const convertSubmission = (
  components: Array<FormComponent>,
  // eslint-disable-next-line @typescript-eslint/default-param-last
  formSubmission: FormSubmission = { data: {} },
  converter: (value: unknown, component: FormComponent) => unknown,
): FormSubmission => {
  return {
    ...formSubmission,
    data: convertSubmissionData(components, formSubmission.data, converter),
  };
};
