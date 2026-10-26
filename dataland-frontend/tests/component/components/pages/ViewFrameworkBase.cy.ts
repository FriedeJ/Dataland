import ViewFrameworkBase from '@/components/generics/ViewFrameworkBase.vue';
import { DataTypeEnum } from '@clients/backend';
import { minimalKeycloakMock } from '@ct/testUtils/Keycloak';
import { routes } from '@/router';
import { createMemoryHistory, createRouter } from 'vue-router';

describe('Component test for ViewFrameworkBase', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/data-availability/viewable-dimensions/search', {
      fixture: 'BasicDataDimensionsMocksForOneCompany',
      times: 1,
    }).as('dataFetch');
  });

  it('Should proper set the drop down options based on data', () => {
    //@ts-ignore
    cy.mountWithPlugins(ViewFrameworkBase, {
      keycloak: minimalKeycloakMock({}),
      global: {
        stubs: ['CompanyInformation'],
      },
      props: {
        dataType: DataTypeEnum.EutaxonomyFinancials,
        companyID: 'mock-company-id',
      },
    }).then(({ component }) => {
      cy.wait('@dataFetch').then(() => {
        cy.wrap(component).its('isDataProcessedSuccessfully').should('be.true');
        cy.wrap(component).its('availableDataDimensions').its('length').should('equal', 9);
      });
    });
  });

  it('Should display the download data button for data reader and open download modal', () => {
    //@ts-ignore
    cy.mountWithPlugins(ViewFrameworkBase, {
      keycloak: minimalKeycloakMock({}),
      global: {
        stubs: ['CompanyInformation'],
      },
      props: {
        dataType: DataTypeEnum.Lksg,
        companyID: 'mock-company-id',
      },
    }).then(({ component }) => {
      cy.wait('@dataFetch').then(() => {
        cy.wrap(component).its('isDataProcessedSuccessfully').should('be.true');
        cy.get('button[data-test=downloadDataButton]').should('exist').click();
      });
    });
  });

  it('Should display a button that links to the data model documentation of the current framework', () => {
    const router = createRouter({ routes, history: createMemoryHistory() });
    //@ts-ignore
    cy.mountWithPlugins(ViewFrameworkBase, {
      keycloak: minimalKeycloakMock({}),
      router,
      global: {
        stubs: ['CompanyInformation'],
      },
      props: {
        dataType: DataTypeEnum.Sfdr,
        companyID: 'mock-company-id',
      },
    }).then(() => {
      cy.wait('@dataFetch');
      cy.get('[data-test=viewDataModelButton]').should('be.visible').click();
      cy.wrap(router.currentRoute).its('value.path').should('eq', '/data-model/sfdr');
    });
  });
});
