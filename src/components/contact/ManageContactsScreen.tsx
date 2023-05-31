import * as React from "react";
import { KeycloakInstance } from "keycloak-js";
import { connect } from "react-redux";
import { StoreState } from "src/types";
import BasicLayout from "../generic/BasicLayout";
import { useEffect, useMemo, useState } from "react";
import Api, { Contact } from "pakkasmarja-client";
import { Button, Form, Icon, Loader, Table } from "semantic-ui-react";
import { useHistory } from "react-router";
import { AuthUtils } from "src/utils/auth";

/**
 * Interface for component props
 */
interface Props {
  keycloak?: KeycloakInstance;
}

/**
 * Manage contacts screen
 *
 * @param props component properties
 */
const ManageContactsScreen = ({ keycloak }: Props) => {
  const history = useHistory();
  const [ searchInputValue, setSearchInputValue ] = React.useState("");
  const [ showOnlyInspected, setShowOnlyInspected ] = React.useState(false);
  const [ contacts, setContacts ] = useState<Contact[] | undefined>(undefined);
  const [ loading, setLoading ] = useState(true);

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    if (!searchInputValue && !showOnlyInspected) return contacts;

    return contacts.filter(contact => {
      if (showOnlyInspected && contact.equipmentInspected !== true) return false;

      const searchInputValueLower = searchInputValue.toLowerCase();

      return contact.displayName?.toLowerCase().includes(searchInputValueLower)
        || contact.sapId?.toLowerCase().includes(searchInputValueLower)
        || contact.email?.toLowerCase().includes(searchInputValueLower);
    });
  }, [ contacts, searchInputValue, showOnlyInspected ]);

  useEffect(() => {
    let mounted = true;

    if (!keycloak?.token || !AuthUtils.canViewContacts(keycloak)) return;

    Api.getContactsService(keycloak.token).listContacts()
      .then(contacts => mounted && setContacts(contacts))
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false };
  }, []);

  if (!AuthUtils.canViewContacts(keycloak)) {
    return (
      <BasicLayout>
        Sinulla ei ole oikeutta nähdä tätä sivua.
      </BasicLayout>
    );
  }

  /**
   * Renders contacts
   */
  const renderContacts = () => {
    if (!contacts) {
      return null;
    }

    return filteredContacts.map(contact => (
      <Table.Row key={ contact.id }>
        <Table.Cell width={2}>{ contact.sapId }</Table.Cell>
        <Table.Cell width={6}>{ contact.displayName }</Table.Cell>
        <Table.Cell width={5}>{ contact.email }</Table.Cell>
        <Table.Cell width={1}>
          <Icon
            name={ contact.equipmentInspected ? "checkmark" : "x" }
            color={ contact.equipmentInspected ? "green" : "red" }
          />
        </Table.Cell>
        <Table.Cell width={2}>
          <Button
            basic
            disabled={ !AuthUtils.canManageContacts(keycloak) }
            onClick={ () => history?.push(`/manageContacts/${contact.id}`) }
          >
            { AuthUtils.canManageContacts(keycloak) ? "Muokkaa" : "Ei oikeutta muokata" }
          </Button>
        </Table.Cell>
      </Table.Row>
    ));
  };

  const renderTable = () => {
    if (loading) {
      return (
        <Loader active />
      );
    }

    return (
      <Table selectable>
        <Table.Header>
          <Table.HeaderCell>SAP-tunnus</Table.HeaderCell>
          <Table.HeaderCell>Nimi</Table.HeaderCell>
          <Table.HeaderCell>Sähköposti</Table.HeaderCell>
          <Table.HeaderCell>Kalusto tarkastettu</Table.HeaderCell>
          <Table.HeaderCell></Table.HeaderCell>
        </Table.Header>
        <Table.Body>
          { renderContacts() }
        </Table.Body>
      </Table>
    );
  };

  return (
    <BasicLayout pageTitle="Viljelijätietojen hallinta">
      <Form>
        <Form.Input
          label="Hae viljelijän nimellä, sähköpostilla tai SAP-tunnuksella"
          value={ searchInputValue }
          onChange={ (_, { value }) => setSearchInputValue(value) }
        />
        <Form.Checkbox
          label="Näytä vain viljelijät, joiden kalusto on tarkastettu"
          checked={ showOnlyInspected }
          onChange={ (_, { checked }) => setShowOnlyInspected(checked ?? false) }
        />
      </Form>
      { renderTable() }
    </BasicLayout>
  );
};

/**
 * Redux mapper for mapping store state to component props
 *
 * @param state store state
 */
const mapStateToProps = (state: StoreState) => ({
  keycloak: state.keycloak
});

export default connect(mapStateToProps)(ManageContactsScreen);
