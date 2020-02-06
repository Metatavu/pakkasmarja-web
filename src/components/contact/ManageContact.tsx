import * as React from "react";
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import BasicLayout from "../generic/BasicLayout";
import "react-datepicker/dist/react-datepicker.css";
import 'react-image-lightbox/style.css';
import { Form, Input, Button, Accordion, Icon, Dropdown, Divider, Modal } from "semantic-ui-react";
import Api, { Contact, Address } from "pakkasmarja-client";

/**
 * Interface for component props
 */
interface Props {
  keycloak?: Keycloak.KeycloakInstance;
}

/**
 * Interface for component state
 */
interface State {
  openModal: boolean;
  modalText: string;
  activeIndex?: number;
  loading: boolean;
  usersContact?: Contact;
  firstName: string;
  lastName: string;
  companyName: string;
  phoneNumber1: string;
  phoneNumber2: string;
  email: string;
  audit: string;
  sapId: string;
  addresses?: Array<Address>;
  BIC: string;
  IBAN: string;
  taxCode: string;
  vatLiable?: Contact.VatLiableEnum;
  alv: string;
  postNumber: string;
  postAddress: string;
  city: string;
  farmPostNumber: string;
  farmPostAddress: string;
  farmCity: string;
  originalContact: Contact;
}

/**
 * Class for manage contact component
 */
class ManageContact extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      openModal: false,
      modalText: '',
      loading: false,
      firstName: '',
      lastName: '',
      companyName: '',
      phoneNumber1: '',
      phoneNumber2: '',
      email: '',
      audit: '',
      sapId: '',
      BIC: '',
      IBAN: '',
      taxCode: '',
      alv: '',
      postNumber: '',
      postAddress: '',
      city: '',
      farmPostNumber: '',
      farmPostAddress: '',
      farmCity: '',
      originalContact: {}
    };
  }

  /**
   * Component did mount life-cycle event
   */
  public componentDidMount = async () => {
    const { keycloak } = this.props;
    if (!keycloak || !keycloak.token || !keycloak.subject) {
      return;
    }
    this.setState({ loading: true });
    const usersContact = await Api.getContactsService(keycloak.token).findContact(keycloak.subject);
    this.setState({
      loading: false,
      firstName: usersContact.firstName || '',
      lastName: usersContact.lastName || '',
      companyName: usersContact.companyName || '',
      email: usersContact.email || '',
      audit: usersContact.audit || '',
      sapId: usersContact.sapId || '',
      BIC: usersContact.BIC || '',
      IBAN: usersContact.IBAN || '',
      taxCode: usersContact.taxCode || '',
      alv: usersContact.taxCode || '',
      vatLiable: usersContact.vatLiable || undefined,
      originalContact: usersContact
    });
    if (usersContact.phoneNumbers) {
      if (usersContact.phoneNumbers[0]) {
        this.setState({
          phoneNumber1: usersContact.phoneNumbers[0]
        });
      }
      if (usersContact.phoneNumbers[1]) {
        this.setState({
          phoneNumber2: usersContact.phoneNumbers[1]
        });
      }
    }
    if (usersContact.addresses) {
      if (usersContact.addresses[0]) {
        this.setState({
          postNumber: usersContact.addresses[0].postalCode || '',
          postAddress: usersContact.addresses[0].streetAddress || '',
          city: usersContact.addresses[0].city || '',
        });
      }
      if (usersContact.addresses[1]) {
        this.setState({
          farmPostNumber: usersContact.addresses[1].postalCode || '',
          farmPostAddress: usersContact.addresses[1].streetAddress || '',
          farmCity: usersContact.addresses[1].city || ''
        });
      }
    }
  }

  /**
   * Render method
   */
  public render() {
    const basicInfoInputs = [
      {
        label: "Etunimi",
        key: "firstName"
      },
      {
        label: "Sukunimi",
        key: "lastName"
      },
      {
        label: "Yritys",
        key: "companyName"
      },
      {
        label: "Puhelin 1",
        key: "phoneNumber1"
      },
      {
        label: "Puhelin 2",
        key: "phoneNumber2"
      },
      {
        label: "Sähköposti",
        key: "email"
      },
      {
        label: "Auditoitu",
        key: "audit"
      },
      {
        label: "Viljelijänumero",
        key: "sapId",
        isDisabled: true
      }
    ];

    const addressInfoInputs = [
      {
        label: "Postinro",
        key: "postNumber"
      },
      {
        label: "Postiosoite",
        key: "postAddress"
      },
      {
        label: "Kaupunki",
        key: "city"
      },
      {
        label: "Tilan postinro",
        key: "farmPostNumber"
      },
      {
        label: "Tilan osoite",
        key: "farmPostAddress"
      },
      {
        label: "Tilan kaupunki",
        key: "farmCity"
      }
    ];

    const bankInfoInputs = [
      {
        label: "BIC",
        key: "BIC"
      },
      {
        label: "Tilinumero (IBAN)",
        key: "IBAN"
      },
      {
        label: "ALV - tunnus",
        key: "alv"
      }
    ];

    const vatLiableOptions: { key: string, value: Contact.VatLiableEnum | undefined, text: string }[] = [{
      key: "undefined",
      value: undefined,
      text: "Valitse..."
    }, {
      key: "true",
      value: "true",
      text: "Kyllä"
    }, {
      key: "false",
      value: "false",
      text: "Ei"
    }, {
      key: "Eu",
      value: "EU",
      text: "EU"
    }];

    const { activeIndex } = this.state;
    return (
      <BasicLayout pageTitle={"Yhteystiedot"}>
        <Accordion fluid styled>
          <Accordion.Title active={activeIndex === 0} index={0} onClick={this.handleAccordionClick}>
            <Icon name='user' color="red" />
            Perustiedot
        </Accordion.Title>
          <Accordion.Content active={activeIndex === 0}>
            <Form>
              {
                basicInfoInputs.map((input) => {
                  return this.renderInput(input.label, input.key, input.isDisabled);
                })
              }
            </Form>
          </Accordion.Content>
          <Accordion.Title active={activeIndex === 1} index={1} onClick={this.handleAccordionClick}>
            <Icon name='address book' color="red" />
            Osoitetiedot
        </Accordion.Title>
          <Accordion.Content active={activeIndex === 1}>
            <Form>
              {
                addressInfoInputs.map((input) => {
                  return this.renderInput(input.label, input.key);
                })
              }
            </Form>
          </Accordion.Content>
          <Accordion.Title active={activeIndex === 2} index={2} onClick={this.handleAccordionClick}>
            <Icon name='warehouse' color="red" />
            Pankkitiedot
        </Accordion.Title>
          <Accordion.Content active={activeIndex === 2}>
            <Form>
              {
                bankInfoInputs.map((input) => {
                  return this.renderInput(input.label, input.key);
                })
              }
              <Form.Field>
                <label>ALV. velvollisuus</label>
                <Dropdown
                  fluid
                  selection
                  options={vatLiableOptions}
                  placeholder={"Valitse ..."}
                  value={this.state.vatLiable}
                  onChange={(e, data) => this.setState({ vatLiable: data.value as Contact.VatLiableEnum })}
                />
              </Form.Field>
            </Form>
          </Accordion.Content>
        </Accordion>
        <Divider hidden />
        <Button color="red" floated="right" onClick={this.handleSave} disabled={ this.detectChanges() }>Tallenna</Button>
        <Modal size="tiny" open={this.state.openModal} onClose={() => this.setState({ openModal: false })}>
          <Modal.Content>
            <p>{this.state.modalText}</p>
          </Modal.Content>
          <Modal.Actions>
            <Button onClick={() => this.setState({ openModal: false })} negative>OK</Button>
          </Modal.Actions>
        </Modal>
      </BasicLayout >
    );
  }


  /**
   * Handle inputchange
   */
  private handleInputChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    this.setState({ ...this.state, [name]: value });
  }

  /**
   * Render input
   * 
   * @param label inputs label
   * @param key needs to be the same key with state
   */
  private renderInput = (label: string, key: string, isDisabled?: boolean) => {
    const value = this.state[key];
    return (
      <Form.Field key={label}>
        <label>{label}</label>
        <Input name={key} disabled={isDisabled} onChange={this.handleInputChange} value={value} />
      </Form.Field>
    )
  }

  /**
   * Handles accordion click
   */
  private handleAccordionClick = (e: React.SyntheticEvent, titleProps: any) => {
    const { index } = titleProps;
    const { activeIndex } = this.state;
    const newIndex = activeIndex === index ? -1 : index;
    this.setState({ activeIndex: newIndex })
  }

  /**
   * Handles save click
   */
  private handleSave = async () => {
    const { keycloak } = this.props;
    if (!keycloak || !keycloak.token || !keycloak.subject) {
      return
    }
    const contactService = Api.getContactsService(keycloak.token);
    const { firstName, lastName, companyName, email, BIC, IBAN, taxCode, audit, phoneNumber1, sapId,
      phoneNumber2, postNumber, postAddress, city, farmPostNumber, farmPostAddress, farmCity, vatLiable } = this.state;

    const phoneNumbers: string[] = [
      phoneNumber1 || "",
      phoneNumber2 || "",
    ];

    const addresses: Address[] = [
      {
        streetAddress: postAddress,
        postalCode: postNumber,
        city: city
      }, {
        streetAddress: farmPostAddress,
        postalCode: farmPostNumber,
        city: farmCity
      }];

    const newContact: Contact = {
      sapId: sapId || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      companyName: companyName || undefined,
      phoneNumbers: phoneNumbers[0] || phoneNumbers[1] ? phoneNumbers : [],
      email: email || undefined,
      BIC: BIC || undefined,
      IBAN: IBAN || undefined,
      taxCode: taxCode || undefined,
      audit: audit || undefined,
      vatLiable: vatLiable || undefined,
      addresses: addresses[0] || addresses[1] ? addresses : []
    };
    
    contactService.updateContact(newContact, keycloak.subject).then((updatedData) => {
      this.setState({ openModal: true, modalText: "Tietojen päivittäminen onnistui." })
    }).catch((err) => {
      this.setState({ openModal: true, modalText: "Tietojen tallentamisessa tapahtui virhe, yritä myöhemmin uudelleen." })
    });

  }

  /**
   * Detects changes in users profile information
   */
  private detectChanges = (): boolean => {
    const originalContact = this.state.originalContact;
    const firstName = originalContact.firstName || "";
    const lastName = originalContact.lastName || "";
    const companyName = originalContact.companyName || "";
    const email = originalContact.email || "";
    const audit = originalContact.audit || "";
    const sapId = originalContact.sapId || "";
    const BIC = originalContact.BIC || "";
    const IBAN = originalContact.IBAN || "";
    const taxCode = originalContact.taxCode || "";
    const vatLiable = originalContact.vatLiable || undefined;
    const phoneNumber1 = originalContact.phoneNumbers && originalContact.phoneNumbers[0] ? originalContact.phoneNumbers[0] || "" : "";
    const phoneNumber2 = originalContact.phoneNumbers && originalContact.phoneNumbers[1] ? originalContact.phoneNumbers[1] || "" : "";
    const postNumber = originalContact.addresses && originalContact.addresses[0] ? originalContact.addresses[0].postalCode || "" : "";
    const postAddress = originalContact.addresses && originalContact.addresses[0] ? originalContact.addresses[0].streetAddress || "" : "";
    const city = originalContact.addresses && originalContact.addresses[0] ? originalContact.addresses[0].city || "" : "";
    const farmPostNumber = originalContact.addresses && originalContact.addresses[1] ? originalContact.addresses[0].postalCode || "" : "";
    const farmPostAddress = originalContact.addresses && originalContact.addresses[1] ? originalContact.addresses[1].streetAddress || "" : "";
    const farmCity = originalContact.addresses && originalContact.addresses[1] ? originalContact.addresses[1].city || "" : "";

    return (this.state.firstName === firstName &&
      this.state.lastName === lastName &&
      this.state.companyName === companyName &&
      this.state.email === email &&
      this.state.audit === audit &&
      this.state.sapId === sapId &&
      this.state.BIC === BIC &&
      this.state.IBAN === IBAN &&
      this.state.taxCode === taxCode &&
      this.state.alv === taxCode &&
      this.state.vatLiable === vatLiable &&
      this.state.phoneNumber1 === phoneNumber1 &&
      this.state.phoneNumber2 === phoneNumber2 &&
      this.state.postNumber === postNumber &&
      this.state.postAddress === postAddress &&
      this.state.city === city &&
      this.state.farmPostNumber === farmPostNumber &&
      this.state.farmPostAddress === farmPostAddress &&
      this.state.farmCity === farmCity);
  }
}

/**
 * Redux mapper for mapping store state to component props
 * 
 * @param state store state
 */
export function mapStateToProps(state: StoreState) {
  return {
    keycloak: state.keycloak
  }
}

/**
 * Redux mapper for mapping component dispatches 
 * 
 * @param dispatch dispatch method
 */
export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ManageContact);
