import DataModelPage from '@/components/pages/DataModelPage.vue';
import { routes } from '@/router';
import { minimalKeycloakMock } from '@ct/testUtils/Keycloak';
import { getMountingFunction } from '@ct/testUtils/Mount';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';

const ref = (kind: string, id: string): { id: string; ref: string } => ({
  id,
  ref: `https://local-dev.dataland.com/specifications/${kind}/${id}`,
});

const leaf = (id: string, aliasExport: string): { id: string; ref: string; aliasExport: string } => ({
  ...ref('data-point-types', id),
  aliasExport,
});

const frameworkList = [
  { framework: ref('frameworks', 'sfdr'), name: 'SFDR' },
  { framework: ref('frameworks', 'pcaf'), name: 'PCAF' },
];

const sfdrSpec = {
  framework: ref('frameworks', 'sfdr'),
  name: 'SFDR',
  businessDefinition: 'Sustainability Finance Disclosure Regulation',
  schema: JSON.stringify({
    general: {
      company: { fiscalYearEnd: leaf('extendedDateFiscalYearEnd', 'FISCAL_YEAR_END') },
      emptyCategory: {},
    },
    environmental: {
      emissions: { scope1GhgEmissions: leaf('extendedDecimalScope1', 'SCOPE_1') },
    },
  }),
};

const pcafSpec = {
  framework: ref('frameworks', 'pcaf'),
  name: 'PCAF',
  businessDefinition: 'Partnership for Carbon Accounting Financials',
  schema: JSON.stringify({
    general: { company: { fiscalYearEnd: leaf('extendedDateFiscalYearEnd', 'FISCAL_YEAR_END') } },
  }),
};

const fiscalYearEndType = {
  dataPointType: ref('data-point-types', 'extendedDateFiscalYearEnd'),
  name: 'Fiscal Year End',
  businessDefinition: 'The date the fiscal year ends.',
  dataPointBaseType: ref('data-point-base-types', 'extendedDate'),
  usedBy: [ref('frameworks', 'sfdr'), ref('frameworks', 'pcaf')],
  constraints: ['min:0'],
  calculationRules: [],
};

const extendedDateBaseType = {
  dataPointBaseType: ref('data-point-base-types', 'extendedDate'),
  name: 'General date data point with an extended source',
  businessDefinition: 'A date without a time-zone.',
  validatedBy: 'org.dataland.SomeValidator',
  schema: { value: 'LocalDate', quality: 'QualityOptions', dataSource: { page: 'String', fileName: 'String' } },
  example: { value: '2007-03-05', quality: 'Reported', dataSource: { page: '5-7', fileName: null } },
  usedBy: [ref('data-point-types', 'extendedDateFiscalYearEnd')],
};

/**
 * Registers the intercepts for all specification service calls used by the page.
 */
function interceptSpecificationService(): void {
  cy.intercept('GET', '**/specifications/frameworks', frameworkList).as('frameworkList');
  cy.intercept('GET', '**/specifications/frameworks/sfdr', sfdrSpec).as('sfdr');
  cy.intercept('GET', '**/specifications/frameworks/pcaf', pcafSpec).as('pcaf');
  cy.intercept('GET', '**/specifications/data-point-types/extendedDateFiscalYearEnd', fiscalYearEndType).as('type');
  cy.intercept('GET', '**/specifications/data-point-types/extendedDecimalScope1', {
    ...fiscalYearEndType,
    dataPointType: ref('data-point-types', 'extendedDecimalScope1'),
    name: 'Scope 1 GHG emissions - Of which Enabling',
    businessDefinition: 'Direct emissions of greenhouse gases.',
    usedBy: [ref('frameworks', 'sfdr')],
    calculationRules: [{ inputs: ['extendedDateFiscalYearEnd'], calculationMethod: 'Sum' }],
  }).as('scope1');
  cy.intercept('GET', '**/specifications/data-point-base-types/extendedDate', extendedDateBaseType).as('baseType');
}

/**
 * Mounts the page at the given path.
 * @param path the route to open before mounting
 * @returns the router used for mounting
 */
function mountAt(path: string): Cypress.Chainable<Router> {
  const router = createRouter({ routes, history: createMemoryHistory() });
  return cy.wrap(router.push(path)).then(() => {
    getMountingFunction({ keycloak: minimalKeycloakMock(), router })(DataModelPage, {});
    return cy.wrap(router);
  });
}

describe('Component tests for the data model documentation page', () => {
  beforeEach(() => {
    interceptSpecificationService();
  });

  it('Shows a card for each framework when none is selected and navigates on click', () => {
    mountAt('/data-model').then((router) => {
      cy.get('[data-test="data-model-card-sfdr"]').should('contain.text', 'SFDR');
      cy.get('[data-test="data-model-card-pcaf"]').should('be.visible').click();
      cy.wrap(router.currentRoute).its('value.path').should('eq', '/data-model/pcaf');
    });
    cy.get('[data-test="data-model-framework-header"]').should('contain.text', 'PCAF');
  });

  it('Renders the framework tree, hides empty categories and shows field details on selection', () => {
    mountAt('/data-model/sfdr').then((router) => {
      cy.get('[data-test="data-model-framework-header"]')
        .should('contain.text', 'Sustainability Finance Disclosure Regulation')
        .and('contain.text', '2 data points');
      cy.get('[data-test="data-model-tree"]').should('contain.text', 'General');
      cy.get('[data-test="data-model-tree"]').should('not.contain.text', 'Empty Category');
      cy.get('[data-test="data-model-no-selection"]').should('exist');

      cy.get('[data-test="data-model-tree"]').contains('General').click();
      cy.get('[data-test="data-model-tree"]').contains('Company').click();
      cy.get('[data-test="data-model-tree"]').contains('Fiscal Year End').click();
      cy.get('[data-test="data-model-field-name"]').should('have.text', 'Fiscal Year End');
      cy.get('[data-test="data-model-field-definition"]').should('contain.text', 'The date the fiscal year ends.');
      cy.get('[data-test="data-model-field-value-type"]').should('contain.text', 'Date');
      cy.get('[data-test="data-model-field-constraints"]').should('contain.text', 'at least 0');
      cy.get('[data-test="data-model-technical-details"]').should('not.exist');
      cy.get('[data-test="data-model-toggle-technical"]').click();
      cy.get('[data-test="data-model-field-id"]').should('have.text', 'extendedDateFiscalYearEnd');
      cy.get('[data-test="data-model-field-alias"]').should('contain.text', 'FISCAL_YEAR_END');
      cy.get('[data-test="data-model-field-base-type"]').should('contain.text', 'extendedDate');
      cy.get('[data-test="data-model-example"]').should('contain.text', 'value').and('contain.text', '2007-03-05');
      cy.get('[data-test="data-model-example"]').should('not.contain.text', '{');
      cy.get('[data-test="data-model-example"]')
        .should('contain.text', 'Type')
        .and('contain.text', 'Quality (selection)');
      cy.wrap(router.currentRoute).its('value.query.field').should('eq', 'extendedDateFiscalYearEnd');
    });
  });

  it('Restores the selected field from the URL and switches frameworks via the used-by links', () => {
    mountAt('/data-model/sfdr?field=extendedDateFiscalYearEnd').then((router) => {
      cy.get('[data-test="data-model-field-name"]').should('have.text', 'Fiscal Year End');
      cy.get('[data-test="data-model-field-used-by"]').should('contain.text', 'Used in 2 frameworks');
      cy.get('[data-test="data-model-used-by-pcaf"]').click();
      cy.wrap(router.currentRoute).its('value.path').should('eq', '/data-model/pcaf');
      cy.wrap(router.currentRoute).its('value.query.field').should('eq', 'extendedDateFiscalYearEnd');
    });
    cy.get('[data-test="data-model-framework-header"]').should('contain.text', 'PCAF');
    cy.get('[data-test="data-model-field-name"]').should('have.text', 'Fiscal Year End');
  });

  it('Filters the tree with the search field', () => {
    mountAt('/data-model/sfdr');
    cy.get('[data-test="data-model-tree"]').should('not.contain.text', 'Scope 1 GHG emissions - Of which Enabling');
    cy.get('[data-test="data-model-search"]').type('scope1');
    cy.get('[data-test="data-model-tree"]').should('contain.text', 'Scope 1 GHG emissions - Of which Enabling');
    cy.get('[data-test="data-model-tree"]').should('not.contain.text', 'Fiscal Year End');
    cy.get('[data-test="data-model-search"]').clear();
    cy.get('[data-test="data-model-tree"]').should('not.contain.text', 'Scope 1 GHG emissions - Of which Enabling');
    cy.get('[data-test="data-model-search"]').type('fiscal');
    cy.get('[data-test="data-model-tree"]').should('contain.text', 'Fiscal Year End');
    cy.get('[data-test="data-model-tree"]').should('not.contain.text', 'Scope1');
    cy.get('[data-test="data-model-search"]').clear().type('does-not-exist');
    cy.get('[data-test="data-model-no-results"]').should('exist');
  });

  it('Starts fully collapsed, keeps the expansion state when selecting and opens the path of a deep link', () => {
    mountAt('/data-model/sfdr');
    cy.get('[data-test="data-model-tree"]').should('contain.text', 'General').and('contain.text', 'Environmental');
    cy.get('[data-test="data-model-tree"]').should('not.contain.text', 'Company');

    cy.get('[data-test="data-model-tree"]').contains('Environmental').click();
    cy.get('[data-test="data-model-tree"]').contains('Emissions').click();
    cy.get('[data-test="data-model-tree"]').contains('Scope 1 GHG emissions - Of which Enabling').click();
    cy.get('[data-test="data-model-field-name"]').should('have.text', 'Scope 1 GHG emissions - Of which Enabling');
    cy.get('[data-test="data-model-tree"]').should('contain.text', 'Scope 1 GHG emissions - Of which Enabling');
    cy.get('[data-test="data-model-tree"]').should('not.contain.text', 'Company');
  });

  it('Opens only the path to the selected data point when loading a deep link', () => {
    mountAt('/data-model/sfdr?field=extendedDecimalScope1');
    cy.get('[data-test="data-model-tree"]').should('contain.text', 'Scope 1 GHG emissions - Of which Enabling');
    cy.get('[data-test="data-model-tree"]').should('not.contain.text', 'Company');
  });

  it('Shows the real data point names in the tree and finds data points by their business definition', () => {
    mountAt('/data-model/sfdr?field=extendedDecimalScope1');
    cy.get('[data-test="data-model-tree"]').should('contain.text', 'Scope 1 GHG emissions - Of which Enabling');
    cy.get('[data-test="data-model-tree"]').should('not.contain.text', 'Scope1 Ghg Emissions');
    cy.get('[data-test="data-model-search"]').type('greenhouse gases');
    cy.get('[data-test="data-model-tree"]').should('contain.text', 'Scope 1 GHG emissions - Of which Enabling');
    cy.get('[data-test="data-model-tree"]').should('not.contain.text', 'Fiscal Year End');
  });

  it('Switches to the table view, searches and selects a row while keeping the shared details panel', () => {
    mountAt('/data-model/sfdr').then((router) => {
      cy.get('[data-test="data-model-view-switch"]').contains('Table').click();
      cy.wrap(router.currentRoute).its('value.query.view').should('eq', 'table');
      cy.get('[data-test="data-model-tree"]').should('not.exist');

      cy.get('[data-test="data-model-table"]').should('contain.text', 'Fiscal Year End');
      cy.get('[data-test="data-model-table"]').should('contain.text', 'General > Company');
      cy.get('[data-test="data-model-table"]').should('contain.text', 'Date').and('contain.text', 'at least 0');
      cy.get('[data-test="data-model-table"]').should('contain.text', '2 frameworks');
      cy.get('[data-test="data-model-table"]').should('not.contain.text', 'FISCAL_YEAR_END');
      cy.get('[data-test="data-model-toggle-technical-columns"]').click();
      cy.get('[data-test="data-model-table"]').should('contain.text', 'FISCAL_YEAR_END');
      cy.get('[data-test="data-model-table"] tbody tr').should('have.length', 2);

      cy.get('[data-test="data-model-search"]').type('greenhouse');
      cy.get('[data-test="data-model-table"] tbody tr').should('have.length', 1);
      cy.get('[data-test="data-model-search"]').clear();
      cy.get('[data-test="data-model-search"]').type('does-not-exist');
      cy.get('[data-test="data-model-no-results"]').should('be.visible');
      cy.get('[data-test="data-model-search"]').clear();

      cy.get('[data-test="data-model-table"]').contains('td', 'Fiscal Year End').click();
      cy.wrap(router.currentRoute).its('value.query.field').should('eq', 'extendedDateFiscalYearEnd');
      cy.get('[data-test="data-model-field-name"]').should('have.text', 'Fiscal Year End');

      cy.get('[data-test="data-model-view-switch"]').contains('Tree').click();
      cy.wrap(router.currentRoute).its('value.query.view').should('be.undefined');
      cy.get('[data-test="data-model-field-name"]').should('have.text', 'Fiscal Year End');
    });
  });

  it('Filters the table with Excel-like column filters', () => {
    mountAt('/data-model/sfdr?view=table');
    cy.get('[data-test="data-model-table-count"]').should('contain.text', '2 of 2');
    cy.get('[data-test="data-model-table"] .p-datatable-column-filter-button').eq(2).click();
    cy.get('[data-test="data-model-filter-categoryPath"]')
      .contains('[role="option"]', 'Environmental > Emissions')
      .click();
    cy.get('[data-test="data-model-table-count"]').should('contain.text', '1 of 2');
    cy.get('.p-datatable-filter-overlay').should('be.visible');
    cy.get('[data-test="data-model-table"] tbody tr').should('have.length', 1);
    cy.get('[data-test="data-model-table"]').should('contain.text', 'Scope 1 GHG emissions');
    cy.get('[data-test="data-model-table"]').should('not.contain.text', 'Fiscal Year End');
  });

  it('Splits hierarchical names into data point and detail and filters by them', () => {
    mountAt('/data-model/sfdr?view=table');
    cy.get('[data-test="data-model-table"]')
      .should('contain.text', 'Scope 1 GHG emissions')
      .and('contain.text', 'Of which Enabling');
    cy.get('[data-test="data-model-table"] .p-datatable-column-filter-button').eq(0).click();
    cy.get('[data-test="data-model-filter-baseName"]').contains('[role="option"]', 'Fiscal Year End').click();
    cy.get('[data-test="data-model-table-count"]').should('contain.text', '1 of 2');
    cy.get('[data-test="data-model-table"]').should('not.contain.text', 'Of which Enabling');
  });

  it('Keeps the same data point selected when switching between tree, table and diagram', () => {
    mountAt('/data-model/sfdr?field=extendedDecimalScope1').then((router) => {
      cy.get('[data-test="data-model-tree"] .p-tree-node-selected').should('contain.text', 'Scope 1 GHG emissions');

      cy.get('[data-test="data-model-view-switch"]').contains('Table').click();
      cy.get('[data-test="data-model-table"] .p-datatable-row-selected').should(
        'contain.text',
        'Scope 1 GHG emissions'
      );

      cy.get('[data-test="data-model-view-switch"]').contains('Diagram').click();
      cy.get('[data-test="erd-data-point-name"]').should('have.text', 'Scope 1 GHG emissions - Of which Enabling');

      cy.get('[data-test="data-model-view-switch"]').contains('Tree').click();
      cy.get('[data-test="data-model-tree"] .p-tree-node-selected').should('contain.text', 'Scope 1 GHG emissions');
      cy.wrap(router.currentRoute).its('value.query.field').should('eq', 'extendedDecimalScope1');
    });
  });

  it('Clears a search that would hide the selected data point when switching views', () => {
    mountAt('/data-model/sfdr?field=extendedDecimalScope1');
    cy.get('[data-test="data-model-search"]').type('fiscal');
    cy.get('[data-test="data-model-view-switch"]').contains('Table').click();
    cy.get('[data-test="data-model-search"]').should('have.value', '');
    cy.get('[data-test="data-model-table"] .p-datatable-row-selected').should('exist');
  });

  it('Removes table column filters that hide a data point selected elsewhere', () => {
    mountAt('/data-model/sfdr?view=table');
    cy.get('[data-test="data-model-table"] .p-datatable-column-filter-button').eq(2).click();
    cy.get('[data-test="data-model-filter-categoryPath"]').contains('[role="option"]', 'General > Company').click();
    cy.get('[data-test="data-model-table-count"]').should('contain.text', '1 of 2');
    cy.get('[data-test="data-model-view-switch"]').contains('Diagram').click();
    cy.get('[data-test="data-model-erd-select"]').click();
    cy.contains('[role="option"]', 'Scope 1 GHG emissions').click();
    cy.get('[data-test="data-model-view-switch"]').contains('Table').click();
    cy.get('[data-test="data-model-table-count"]').should('contain.text', '2 of 2');
    cy.get('[data-test="data-model-table"] .p-datatable-row-selected').should('contain.text', 'Scope 1 GHG emissions');
  });

  it('Opens the table view from the URL and offers a CSV download', () => {
    mountAt('/data-model/sfdr?view=table');
    cy.get('[data-test="data-model-table-view"]').should('be.visible');
    cy.window().then((win) => {
      cy.stub(win.URL, 'createObjectURL').as('createObjectURL').returns('blob:test');
      cy.stub(win.URL, 'revokeObjectURL');
    });
    cy.get('[data-test="data-model-download-csv"]').click();
    cy.get('@createObjectURL').should('have.been.calledOnce');
  });

  it('Shows the entity relationship diagram and fills it with the real values of a data point', () => {
    mountAt('/data-model/sfdr?view=diagram').then((router) => {
      cy.get('[data-test="data-model-erd-view"]').should('be.visible');
      cy.get('[data-test="data-model-erd-hint"]').should('be.visible');
      cy.get('[data-test="erd-entity-framework"]').should('contain.text', 'Framework');
      cy.get('[data-test="erd-entity-data-point"]').should('contain.text', 'Data point');
      cy.get('[data-test="erd-entity-value-type"]').should('contain.text', 'Value type');

      cy.get('[data-test="data-model-erd-select"]').click();
      cy.contains('[role="option"]', 'Fiscal Year End').click();
      cy.wrap(router.currentRoute).its('value.query.field').should('eq', 'extendedDateFiscalYearEnd');
      cy.get('[data-test="erd-data-point-name"]').should('have.text', 'Fiscal Year End');
      cy.get('[data-test="erd-value-type-name"]').should('have.text', 'Date');
      cy.get('[data-test="erd-framework-sfdr"]').should('be.visible');
      cy.get('[data-test="erd-framework-pcaf"]').should('be.visible');
      cy.get('[data-test="erd-entity-framework"]')
        .should('contain.text', 'General > Company')
        .and('contain.text', 'FISCAL_YEAR_END');
      cy.get('[data-test="erd-no-calculation"]').should('be.visible');

      cy.get('[data-test="erd-framework-pcaf"]').click();
      cy.wrap(router.currentRoute).its('value.path').should('eq', '/data-model/pcaf');
      cy.wrap(router.currentRoute).its('value.query.view').should('eq', 'diagram');
    });
  });

  it('Shows the calculation inputs in the diagram and navigates to them', () => {
    mountAt('/data-model/sfdr?view=diagram&field=extendedDecimalScope1').then((router) => {
      cy.get('[data-test="erd-entity-calculation"]').should('contain.text', 'Sum of');
      cy.get('[data-test="erd-calculation-input-extendedDateFiscalYearEnd"]')
        .should('have.text', 'Fiscal Year End')
        .click();
      cy.wrap(router.currentRoute).its('value.query.field').should('eq', 'extendedDateFiscalYearEnd');
    });
  });

  it('Shows an error message if the framework cannot be loaded', () => {
    cy.intercept('GET', '**/specifications/frameworks/sfdr', { statusCode: 500, body: {} });
    mountAt('/data-model/sfdr');
    cy.get('[data-test="data-model-framework-error"]').should('be.visible');
  });
});
