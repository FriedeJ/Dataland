import { describeIf } from '@e2e/support/TestUtility';

describeIf(
  'As a user, I want to explore the data model of the frameworks',
  {
    executionEnvironments: ['developmentLocal', 'ci', 'developmentCd'],
  },
  () => {
    beforeEach(() => {
      cy.ensureLoggedInAsReader();
    });

    it('Can open the data model tab, pick a framework, inspect a data point and follow a used-by link', () => {
      cy.visitAndCheckAppMount('/companies');
      cy.contains('[role="tab"]', 'DATA MODEL').click();
      cy.url().should('include', '/data-model');

      cy.get('[data-test="data-model-card-sfdr"]').click();
      cy.url().should('include', '/data-model/sfdr');
      cy.get('[data-test="data-model-framework-header"]').should('contain.text', 'SFDR');

      cy.get('[data-test="data-model-tree"]').contains('General').click();
      cy.get('[data-test="data-model-tree"]').contains('Company').click();
      cy.get('[data-test="data-model-tree"]').contains('Fiscal Year End').click();
      cy.url().should('include', 'field=extendedDateFiscalYearEnd');
      cy.get('[data-test="data-model-field-name"]').should('have.text', 'Fiscal Year End');
      cy.get('[data-test="data-model-field-definition"]').should('not.be.empty');

      cy.get('[data-test="data-model-used-by-pcaf"]').click();
      cy.url().should('include', '/data-model/pcaf');
      cy.get('[data-test="data-model-framework-header"]').should('contain.text', 'PCAF');
      cy.get('[data-test="data-model-field-name"]').should('have.text', 'Fiscal Year End');
    });

    it('Can filter the data points of a framework by search', () => {
      cy.visitAndCheckAppMount('/data-model/sfdr');
      cy.get('[data-test="data-model-search"]').type('fiscal year');
      cy.get('[data-test="data-model-tree"]').should('contain.text', 'Fiscal Year End');
      cy.get('[data-test="data-model-search"]').clear();
      cy.get('[data-test="data-model-search"]').type('does-not-exist');
      cy.get('[data-test="data-model-no-results"]').should('be.visible');
    });

    it('Can switch to the table and diagram views and keeps the selected data point', () => {
      cy.visitAndCheckAppMount('/data-model/sfdr?field=extendedDateFiscalYearEnd');
      cy.get('[data-test="data-model-field-name"]').should('have.text', 'Fiscal Year End');

      cy.get('[data-test="data-model-view-switch"]').contains('Table').click();
      cy.url().should('include', 'view=table');
      cy.get('[data-test="data-model-table"]').should('contain.text', 'Fiscal Year End');
      cy.get('[data-test="data-model-field-name"]').should('have.text', 'Fiscal Year End');

      cy.get('[data-test="data-model-view-switch"]').contains('Diagram').click();
      cy.url().should('include', 'view=diagram');
      cy.get('[data-test="erd-data-point-name"]').should('have.text', 'Fiscal Year End');
      cy.get('[data-test="erd-framework-pcaf"]').should('be.visible');
    });
  }
);
