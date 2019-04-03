import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import "./styles.scss";
import ErrorMessage from "../generic/ErrorMessage";
import * as Autocomplete from "react-autocomplete";
import Api, { Contact, ItemGroup, Contract, DeliveryPlace } from "pakkasmarja-client";
import { Form, Button, Dropdown, Input, TextArea } from "semantic-ui-react";
import * as moment from "moment";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  match?: any;
  contacts: Contact[]
}

/**
 * Interface for component state
 */
interface State {
  errorMessage?: string;
  selectedContactId: string;
  contacts: Contact[];
  itemGroups: ItemGroup[];
  itemGroupId: string;
  sapId: string;
  status: Contract.StatusEnum;
  quantityComment: string;
  quantity: number;
  deliveryPlaces: DeliveryPlace[];
  deliveryPlaceId: string;
  deliveryPlaceComment: string;
  sapComment: string;
}

/**
 * Class for contract list component
 */
class CreateContract extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      selectedContactId: "",
      contacts: [],
      itemGroups: [],
      itemGroupId: "",
      sapId: "",
      status: "ON_HOLD",
      quantityComment: "",
      quantity: 0,
      deliveryPlaces: [],
      deliveryPlaceId: "",
      deliveryPlaceComment: "",
      sapComment: ""
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    await this.loadContacts();
    await this.loadItemGroups();
    await this.loadDeliveryPlaces();
  }

  /**
   * Load contacts
   */
  private loadContacts = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const contactsService = await Api.getContactsService(this.props.keycloak.token);
    const contacts = await contactsService.listContacts();
    this.setState({ contacts: contacts });
  }

  /**
   * Load contacts
   */
  private loadItemGroups = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);
    const itemGroups = await itemGroupsService.listItemGroups();
    this.setState({ itemGroups: itemGroups });
  }

  /**
   * Load contacts
   */
  private loadDeliveryPlaces = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const deliveryPlacesService = await Api.getDeliveryPlacesService(this.props.keycloak.token);
    const deliveryPlaces = await deliveryPlacesService.listDeliveryPlaces();
    this.setState({ deliveryPlaces: deliveryPlaces });
  }

  /**
   * Render autocomplete field
   */
  private renderAutoCompleteField = () => {
    return (
      <Autocomplete
        wrapperStyle={{ width: "100%" }}
        menuStyle={{ zIndex: 9999, width: "100%" }}
        getItemValue={(item) => item.label}
        items={this.state.contacts.map((contact: Contact) => {
          return {
            label: contact.companyName || `${contact.firstName} ${contact.lastName}`,
            value: contact.id
          };
        })}
        renderItem={(item, isHighlighted) =>
          <div style={{ background: isHighlighted ? 'lightgray' : 'white' }}>
            {item.label}
          </div>
        }
        value={this.state.selectedContactId}
        onChange={(e, value) => this.setState({ selectedContactId: value })}
        onSelect={(value, item) => this.setState({ selectedContactId: value })}
      />
    );
  }

  /**
   * Render drop down
   * 
   * @param options options
   */
  private renderDropDown = (options: any, value: string | number, callBack: (value: string) => void, placeholder: string) => {
    if (options.length <= 0) {
      return <Dropdown fluid/>;
    }

    return (
      <Dropdown
        fluid
        placeholder={placeholder}
        selection
        value={value}
        options={options}
        onChange={(event, data) => {
          callBack(data.value as string)
        }
        }
      />
    );
  }

  /**
   * Handle item group change
   * 
   * @param value value
   */
  private handleItemGroupChange = (value: string) => {
    this.setState({ itemGroupId: value });
  }

  /**
   * Render text input
   */
  private renderTextInput = (value: string | number, onChange: (value: string) => void, placeholder: string, disabled: boolean) => {
    return (
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(event: any) => onChange(event.target.value)}
        disabled={disabled}
      />
    );
  }

  /**
   * Render text area
   */
  private renderTextArea = (value: string, onchange: (value: string) => void, placeholder: string) => {
    return (
      <TextArea
        value={value}
        onChange={(event: any) => {
          onchange(event.target.value)
        }}
        placeholder={placeholder}
      />
    );
  }

  /**
   * Handle form submit
   */
  private handleFormSubmit = () => {
    const contract: Contract = {
      contactId: this.state.selectedContactId,
      itemGroupId: this.state.itemGroupId,
      sapId: this.state.sapId,
      status: this.state.status,
      quantityComment: this.state.quantityComment,
      contractQuantity: this.state.quantity,
      deliveryPlaceId: this.state.deliveryPlaceId,
      deliveryPlaceComment: this.state.deliveryPlaceComment,
      remarks: this.state.sapComment,
      deliverAll: false,
      year: moment().year()
    };

    console.log(contract);
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.errorMessage) {
      return (
        <BasicLayout>
          <ErrorMessage 
            errorMessage={this.state.errorMessage}
          />
        </BasicLayout>
      );
    }

    const itemGroupOptions = this.state.itemGroups.map((itemGroup) => {
      return {
        key: itemGroup.id,
        value: itemGroup.id,
        text: itemGroup.name
      };
    });

    const statusOptions = [{
      key: "REJECTED",
      value: "REJECTED",
      text: "Hylätty"
    }, {
      key: "APPROVED",
      value: "APPROVED",
      text: "Hyväksytty"
    }, {
      key: "ON_HOLD",
      value: "ON_HOLD",
      text: "Odottaa"
    }, {
      key: "DRAFT",
      value: "DRAFT",
      text: "Vedos"
    }, {
      key: "TERMINATED",
      value: "TERMINATED",
      text: "Päättynyt"
    }];

    const deliveryPlaceOptions = this.state.deliveryPlaces.map((deliveryPlace) => {
      return {
        key: deliveryPlace.id,
        value: deliveryPlace.id,
        text: deliveryPlace.name
      };
    });

    return (
      <BasicLayout>
        <Form>
          <Form.Field>
            <label>Sopimus</label>
            { this.renderAutoCompleteField() }
          </Form.Field>
          <Form.Field>
            <label>Marjalaji</label>
            { this.renderDropDown(itemGroupOptions, this.state.itemGroupId, this.handleItemGroupChange, "Valitse marjalaji") }
          </Form.Field>
          <Form.Field>
            <label>SAP id</label>
            { this.renderTextInput(this.state.sapId, (value: string) => { this.setState({ sapId: value }) } , "SAP id", false) }
          </Form.Field>
          <Form.Field>
            <label>Tila</label>
            { this.renderDropDown(statusOptions, this.state.status, (value: Contract.StatusEnum) => { this.setState({ status: value }) }, "Valitse tila") }
          </Form.Field>
          <Form.Field>
            <label>Määrän kommentti</label>
            { this.renderTextArea(this.state.quantityComment, (value: string) => { this.setState({ quantityComment: value }) }, "Määrän kommentti") }
          </Form.Field>
          <Form.Field>
            <label>Määrä</label>
            { this.renderTextInput(this.state.quantity, (value: string) => { this.setState({ quantity: parseInt(value) }) } , "0", false) }
          </Form.Field>
          <Form.Field>
            <label>Toimituspaikka</label>
            { this.renderDropDown(deliveryPlaceOptions, this.state.deliveryPlaceId, (value: Contract.StatusEnum) => { this.setState({ deliveryPlaceId: value }) }, "Valitse toimituspaikka") }
          </Form.Field>
          <Form.Field>
            <label>Toimituspaikan kommentti</label>
            { this.renderTextArea(this.state.deliveryPlaceComment, (value: string) => { this.setState({ deliveryPlaceComment: value }) }, "Toimituspaikan kommentti") }
          </Form.Field>
          <Form.Field>
            <label>Huomautuskenttä (SAP)</label>
            { this.renderTextArea(this.state.sapComment, (value: string) => { this.setState({ sapComment: value }) }, "") }
          </Form.Field>
          <Button onClick={this.handleFormSubmit}>Tallenna</Button>
        </Form>
      </BasicLayout>
    );
  }
}

/**
 * Redux mapper for mapping store state to component props
 * 
 * @param state store state
 */
export function mapStateToProps(state: StoreState) {
  return {
    authenticated: state.authenticated,
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

export default connect(mapStateToProps, mapDispatchToProps)(CreateContract);