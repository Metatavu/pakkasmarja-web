import * as React from "react";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { StoreState } from "src/types";
import BasicLayout from "../generic/BasicLayout";
import Api, { Contact } from "pakkasmarja-client";
import { Button, Form, Grid, Header, Icon } from "semantic-ui-react";
import { useHistory, useRouteMatch } from "react-router";
import { AuthUtils } from "src/utils/auth";
import { KeycloakInstance } from "keycloak-js";

/**
 * Interface for component props
 */
interface Props {
  keycloak?: KeycloakInstance;
}

/**
 * Manage contact screen
 *
 * @param props component properties
 */
const ManageContactScreen = ({ keycloak }: Props) => {
  const { params: { contactId } } = useRouteMatch<{ contactId: string }>();
  const history = useHistory();

  const [ loading, setLoading ] = useState(true);
  const [ contact, setContact ] = useState<Contact | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    if (!keycloak?.token || !AuthUtils.canManageContacts(keycloak)) return;

    Api.getContactsService(keycloak.token).findContact(contactId)
      .then(contact => mounted && setContact(contact))
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false };
  }, []);

  if (!AuthUtils.canManageContacts(keycloak)) {
    return (
      <BasicLayout>
        Sinulla ei ole oikeutta nähdä tätä sivua.
      </BasicLayout>
    );
  }

  /**
   * Saves contact and returns to contact list
   */
  const save = async () => {
    if (!keycloak?.token || !contact) return;

    setLoading(true);

    Api.getContactsService(keycloak.token).updateContact(contact, contactId)
      .then(() => history.push("/manageContacts"))
      .catch(error => {
        console.error(error);
        setLoading(false);
      });
  };

  /**
   * Render contact form
   */
  const renderContactForm = () => {
    return (
      <Form loading={ loading }>
        <Header as="h4">
          <Icon name="user" />
          Yhteystiedot
        </Header>
        <Form.Group widths="equal">
          <Form.Input
            label="Etunimi"
            value={contact?.firstName ?? ""}
            onChange={(_, { value }) => setContact({ ...contact, firstName: value })}
          />
          <Form.Input
            label="Sukunimi"
            value={contact?.lastName ?? ""}
            onChange={(_, { value }) => setContact({ ...contact, firstName: value })}
          />
        </Form.Group>
        <Form.Group widths="equal">
          <Form.Input
            label="Sähköpostiosoite"
            value={contact?.email ?? ""}
            onChange={(_, { value }) => setContact({ ...contact, firstName: value })}
          />
          <Form.Input
            label="Yritys"
            value={contact?.companyName ?? ""}
            onChange={(_, { value }) => setContact({ ...contact, firstName: value })}
          />
        </Form.Group>
        <Header as="h4">
          <Icon name="phone" />
          Puhelinnumerot
        </Header>
        {
          contact?.phoneNumbers?.map((phoneNumber, index) =>
            <Form.Input
              label={`Puhelinnumero ${index + 1}`}
              value={phoneNumber ?? ""}
              onChange={(_, { value }) =>
                setContact({
                  ...contact,
                  phoneNumbers: (contact.phoneNumbers ?? [])
                    .map((phoneNumber, i) => i === index ? value : phoneNumber)
                })
              }
            />
          )
        }
        <Header as="h4">
          <Icon name="address book" />
          Osoitteet
        </Header>
        { contact?.addresses?.map((address, index) =>
            <Form.Group key={index}>
              <Form.Input
                width={8}
                label="Katuosoite"
                value={address?.streetAddress ?? ""}
                onChange={(_, { value }) =>
                  setContact({
                    ...contact,
                    addresses: (contact.addresses ?? [])
                      .map(address => ({ ...address, streetAddress: value }))
                  })
                }
              />
              <Form.Input
                width={4}
                label="Postinumero"
                value={address?.postalCode ?? ""}
                onChange={(_, { value }) =>
                  setContact({
                    ...contact,
                    addresses: (contact.addresses ?? [])
                      .map(address => ({ ...address, postalCode: value }))
                  })
                }
              />
              <Form.Input
                width={4}
                label="Kaupunki"
                value={address?.city ?? ""}
                onChange={(_, { value }) =>
                  setContact({
                    ...contact,
                    addresses: (contact.addresses ?? [])
                      .map(address => ({ ...address, city: value }))
                  })
                }
              />
            </Form.Group>
          )
        }
        <Header as="h4">
          <Icon name="law" />
          Verotiedot
        </Header>
        <Form.Group widths="equal">
          <Form.Input
            label="Verovelvollisuus"
            value={contact?.vatLiable ?? ""}
            onChange={(_, { value }) => setContact({ ...contact, audit: value })}
          />
          <Form.Input
            label="ALV-numero"
            value={contact?.taxCode ?? ""}
            onChange={(_, { value }) => setContact({ ...contact, taxCode: value })}
          />
        </Form.Group>
        <Header as="h4">
          <Icon name="euro sign" />
          Pankkitiedot
        </Header>
        <Form.Group widths="equal">
          <Form.Input
            label="Tilinumero (IBAN)"
            value={contact?.IBAN ?? ""}
            onChange={(_, { value }) => setContact({ ...contact, IBAN: value })}
          />
          <Form.Input
            label="BIC-koodi (SWIFT)"
            value={contact?.BIC ?? ""}
            onChange={(_, { value }) => setContact({ ...contact, BIC: value })}
          />
        </Form.Group>
        <Header as="h4">
          <Icon name="info" />
          Muut tiedot
        </Header>
        <Form.Group widths="equal">
          <Form.Input
            label="SAP-tunnus"
            value={contact?.sapId ?? ""}
            onChange={(_, { value }) => setContact({ ...contact, sapId: value })}
          />
          <Form.Input
            label="Auditointi"
            value={contact?.audit ?? ""}
            onChange={(_, { value }) => setContact({ ...contact, audit: value })}
          />
        </Form.Group>
        <Form.Checkbox
          label="Kalusto tarkastettu"
          checked={contact?.equipmentInspected ?? false}
          onChange={(_, { checked }) => setContact({ ...contact, equipmentInspected: checked })}
        />
      </Form>
    );
  }

  /**
   * Component render
   */
  return (
    <BasicLayout pageTitle={contact?.displayName}>
      { renderContactForm() }
      <Grid columns="equal" padded="vertically">
        <Grid.Row>
          <Grid.Column width="12"/>
          <Grid.Column>
            <Button fluid onClick={ () => history.push("/manageContacts") }>
              Takaisin
            </Button>
          </Grid.Column>
          <Grid.Column>
            <Button fluid color="red" onClick={ save }>
              Tallenna
            </Button>
          </Grid.Column>
        </Grid.Row>
      </Grid>
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

export default connect(mapStateToProps)(ManageContactScreen);
