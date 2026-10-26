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
    name: 'Scope 1 GHG emissions',
    usedBy: [ref('frameworks', 'sfdr')],
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
      cy.get('[data-test="data-model-tree"]').should('contain.text', 'Fiscal Year End');
      cy.get('[data-test="data-model-tree"]').should('not.contain.text', 'Empty Category');
      cy.get('[data-test="data-model-no-selection"]').should('exist');

      cy.get('[data-test="data-model-tree"]').contains('Fiscal Year End').click();
      cy.get('[data-test="data-model-field-name"]').should('have.text', 'Fiscal Year End');
      cy.get('[data-test="data-model-field-definition"]').should('contain.text', 'The date the fiscal year ends.');
      cy.get('[data-test="data-model-field-alias"]').should('contain.text', 'FISCAL_YEAR_END');
      cy.get('[data-test="data-model-field-constraints"]').should('contain.text', 'min:0');
      cy.get('[data-test="data-model-field-base-type"]').should('contain.text', 'extendedDate');
      cy.get('[data-test="data-model-example"]').should('not.exist');
      cy.get('[data-test="data-model-toggle-example"]').click();
      cy.get('[data-test="data-model-example"]').should('contain.text', 'value').and('contain.text', '2007-03-05');
      cy.get('[data-test="data-model-example"]').should('not.contain.text', '{');
      cy.wrap(router.currentRoute).its('value.query.field').should('eq', 'extendedDateFiscalYearEnd');
    });
  });

  it('Restores the selected field from the URL and switches frameworks via the used-by links', () => {
    mountAt('/data-model/sfdr?field=extendedDateFiscalYearEnd').then((router) => {
      cy.get('[data-test="data-model-field-name"]').should('have.text', 'Fiscal Year End');
      cy.get('[data-test="data-model-field-used-by"]').should('contain.text', 'Used by 2 framework(s)');
      cy.get('[data-test="data-model-used-by-pcaf"]').click();
      cy.wrap(router.currentRoute).its('value.path').should('eq', '/data-model/pcaf');
      cy.wrap(router.currentRoute).its('value.query.field').should('eq', 'extendedDateFiscalYearEnd');
    });
    cy.get('[data-test="data-model-framework-header"]').should('contain.text', 'PCAF');
    cy.get('[data-test="data-model-field-name"]').should('have.text', 'Fiscal Year End');
  });

  it('Filters the tree with the search field', () => {
    mountAt('/data-model/sfdr');
    cy.get('[data-test="data-model-tree"]').should('contain.text', 'Scope1 Ghg Emissions');
    cy.get('[data-test="data-model-search"]').type('fiscal');
    cy.get('[data-test="data-model-tree"]').should('contain.text', 'Fiscal Year End');
    cy.get('[data-test="data-model-tree"]').should('not.contain.text', 'Scope1');
    cy.get('[data-test="data-model-search"]').clear().type('does-not-exist');
    cy.get('[data-test="data-model-no-results"]').should('exist');
  });

  it('Shows an error message if the framework cannot be loaded', () => {
    cy.intercept('GET', '**/specifications/frameworks/sfdr', { statusCode: 500, body: {} });
    mountAt('/data-model/sfdr');
    cy.get('[data-test="data-model-framework-error"]').should('be.visible');
  });
});
