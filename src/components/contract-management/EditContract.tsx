import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import "./styles.scss";
import ErrorMessage from "../generic/ErrorMessage";
import Api, { Contact, ItemGroup, Contract, DeliveryPlace } from "pakkasmarja-client";
import { Form, Button, Dropdown, Input, TextArea, Header, Divider } from "semantic-ui-react";
import * as moment from "moment";
import { Redirect } from "react-router";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  match?: any;
}

/**
 * Interface for component state
 */
interface State {
  errorMessage?: string;
  contract?: Contract;
  contacts: Contact[];
  itemGroups: ItemGroup[];
  deliveryPlaces: DeliveryPlace[];
  deliveryPlace: DeliveryPlace;
  deliveryPlaceComment: string;
  deliveryPlaceId: string;
  proposedDeliveryPlace: DeliveryPlace;
  contact: Contact;
  itemGroup: ItemGroup;
  sapId: string;
  status: Contract.StatusEnum;
  quantityComment: string;
  quantity: number;
  sapComment: string;
  redirect: boolean;
}

/**
 * Class for edit contract component
 */
class EditContract extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      contacts: [],
      itemGroups: [],
      deliveryPlaces: [],
      deliveryPlace: {},
      proposedDeliveryPlace: {},
      deliveryPlaceId: "",
      itemGroup: {},
      contact: {},
      sapId: "",
      status: "ON_HOLD",
      quantityComment: "",
      quantity: 0,
      deliveryPlaceComment: "",
      sapComment: "",
      redirect: false
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    await this.loadContract();
    await this.loadContacts();
    await this.loadItemGroups();
    await this.loadDeliveryPlaces();

    this.loadContractManagementData();
  }

  /**
   * Load contract
   */
  private loadContract = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const contractId: string = this.props.match.params.contractId;

    const contactsService = await Api.getContractsService(this.props.keycloak.token);
    const contract: Contract = await contactsService.findContract(contractId, "application/json");
    this.setState({ contract });
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
   * Load item groups
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
   * Load delivery places
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
   * Load contract data
   */
  private loadContractManagementData = () => {
    if (!this.state.contract) {
      return;
    }

    const contract: Contract = this.state.contract;
    const proposedDeliveryPlace: DeliveryPlace = this.state.deliveryPlaces.find((deliveryPlace) => deliveryPlace.id == contract.proposedDeliveryPlaceId) || {};
    const deliveryPlace: DeliveryPlace = this.state.deliveryPlaces.find((deliveryPlace) => deliveryPlace.id == contract.deliveryPlaceId) || {};
    const deliveryPlaceId : string = deliveryPlace.id ||""
    const itemGroup: ItemGroup = this.state.itemGroups.find((itemGroup) => itemGroup.id == contract.itemGroupId) || {};
    const contact: Contact = this.state.contacts.find((contact) => contact.id == contract.contactId) || {};
    const deliveryPlaceComment: string = contract.deliveryPlaceComment || "";
    const quantityComment: string = contract.quantityComment || "";
    const sapComment: string = contract.remarks || "";
    const sapId: string = contract.sapId || "";
    const quantity: number = contract.contractQuantity || 0;
    const status: Contract.StatusEnum = contract.status || "";

    this.setState({
      quantityComment,
      deliveryPlaceComment,
      sapComment,
      sapId,
      status,
      quantity,
      itemGroup,
      contact,
      deliveryPlace,
      deliveryPlaceId,
      proposedDeliveryPlace
    });
  }

  /**
   * Render drop down
   * 
   * @param options options
   */
  private renderDropDown = (options: any, value: string | number, callBack: (value: string) => void, placeholder: string) => {
    if (options.length <= 0) {
      return <Dropdown fluid />;
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
   * Handle form edit
   */
  private handleFormEdit = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract || !this.state.contract.id) {
      return;
    }
    const contractUpdate: Contract = {
      itemGroupId: this.state.itemGroup.id,
      sapId: this.state.sapId,
      status: this.state.status,
      quantityComment: this.state.quantityComment,
      contractQuantity: this.state.quantity,
      deliveryPlaceId: this.state.deliveryPlace.id,
      deliveryPlaceComment: this.state.deliveryPlaceComment,
      remarks: this.state.sapComment,
      deliverAll: false,
      year: moment().year(),
      proposedDeliveryPlaceId: this.state.contract.proposedDeliveryPlaceId
    };
    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    const log = await contractsService.updateContract(contractUpdate, this.state.contract.id);
    console.log(log);
    this.setState({ redirect: true });
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

    if (this.state.redirect) {
      return (
        <Redirect to="/contractManagement" />
      );
    }

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
            <Header>
              {`${this.state.contact.companyName} - ${this.state.itemGroup.name}`}
            </Header>
          </Form.Field>
          <Form.Field>
            <label>SAP id</label>
            {this.renderTextInput(this.state.sapId, (value: string) => { this.setState({ sapId: value }) }, "SAP id", false)}
          </Form.Field>
          <Form.Field>
            <label>Tila</label>
            {this.renderDropDown(statusOptions, this.state.status, (value: Contract.StatusEnum) => { this.setState({ status: value }) }, "Valitse tila")}
          </Form.Field>
          <Form.Field>
          <Divider />
            <label>Sopimusmäärä</label>
            {this.renderTextInput(this.state.quantity, (value: string) => { this.setState({ quantity: parseInt(value) }) }, "0", false)}
          </Form.Field>
          <Form.Field>
            <p>Viljelijän ehdottama määrä: <strong>{this.state.contract && this.state.contract.proposedQuantity || "0"}</strong></p>
            <label>Määrän kommentti</label>
            {this.renderTextArea(this.state.quantityComment, (value: string) => { this.setState({ quantityComment: value }) }, "Määrän kommentti")}
          </Form.Field>
          <Form.Field>
            <Divider />
            <p>Viljelijän ehdottama toimituspaikka: <strong>{this.state.proposedDeliveryPlace.name || "-"}</strong></p>
            <label>Toimituspaikka</label>
            {this.renderDropDown(deliveryPlaceOptions, this.state.deliveryPlaceId, (value: string) => { this.setState({ deliveryPlaceId: value }) }, "Valitse toimituspaikka")}
          </Form.Field>
          <Form.Field>
            <label>Toimituspaikan kommentti</label>
            {this.renderTextArea(this.state.deliveryPlaceComment, (value: string) => { this.setState({ deliveryPlaceComment: value }) }, "Toimituspaikan kommentti")}
          </Form.Field>
          <Form.Field>
            <label>Huomautuskenttä (SAP)</label>
            {this.renderTextArea(this.state.sapComment, (value: string) => { this.setState({ sapComment: value }) }, "")}
          </Form.Field>
          <Button floated="right" color="red" onClick={this.handleFormEdit}>Tallenna muutokset</Button>
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

export default connect(mapStateToProps, mapDispatchToProps)(EditContract);