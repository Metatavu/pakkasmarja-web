import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState, Options } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import "./styles.scss";
import ErrorMessage from "../generic/ErrorMessage";
import Api, { Contact, ItemGroup, Contract, DeliveryPlace } from "pakkasmarja-client";
import { Form, Button, Dropdown, Input, TextArea, Header, Divider, Dimmer, Loader } from "semantic-ui-react";
import * as moment from "moment";
import { Redirect } from "react-router";
import { Link } from "react-router-dom";
import strings from "src/localization/strings";

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
  contractEditLoading: boolean;
  buttonLoading: boolean;
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
      redirect: false,
      contractEditLoading: false,
      buttonLoading: false
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ contractEditLoading: true });

    await this.loadContract();
    await this.loadContacts();
    await this.loadItemGroups();
    await this.loadDeliveryPlaces();

    this.loadContractManagementData();
    this.setState({ contractEditLoading: false });
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
    const deliveryPlaceId: string = deliveryPlace.id || ""
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
  private renderDropDown = (options: Options[], value: string | number, callBack: (value: string) => void, placeholder: string) => {
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
  private renderTextInput = (value: string | number, onChange: (value: string) => void, placeholder: string | number, disabled: boolean) => {
    return (
      <Input
        type="number"
        placeholder={placeholder}
        value={value}
        onChange={(event: React.FormEvent<HTMLInputElement>) => onChange(event.currentTarget.value)}
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
        onChange={(event: React.FormEvent<HTMLTextAreaElement>) => {
          onchange(event.currentTarget.value)
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

    this.setState({ buttonLoading: true });

    const contractUpdate: Contract = {
      areaDetails: this.state.contract ? this.state.contract.areaDetails : [],
      itemGroupId: this.state.itemGroup.id!,
      sapId: this.state.sapId,
      status: this.state.status,
      quantityComment: this.state.quantityComment,
      contractQuantity: this.state.quantity,
      proposedQuantity: this.state.contract ? this.state.contract.proposedQuantity : 0,
      deliveryPlaceId: this.state.deliveryPlaceId,
      deliveryPlaceComment: this.state.deliveryPlaceComment,
      remarks: this.state.sapComment,
      deliverAll: false,
      proposedDeliverAll: false,
      year: moment().year(),
      proposedDeliveryPlaceId: this.state.contract.proposedDeliveryPlaceId
    };

    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    await contractsService.updateContract(contractUpdate, this.state.contract.id);
    this.setState({ buttonLoading: false, redirect: true });
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.contractEditLoading) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted>
              {strings.loading}
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }

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
      text: strings.rejected
    }, {
      key: "APPROVED",
      value: "APPROVED",
      text: strings.approved
    }, {
      key: "ON_HOLD",
      value: "ON_HOLD",
      text: strings.onHold
    }, {
      key: "DRAFT",
      value: "DRAFT",
      text: strings.draft
    }, {
      key: "TERMINATED",
      value: "TERMINATED",
      text: strings.terminated
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
              {`${this.state.contact.companyName || strings.contactNotFound} - ${this.state.itemGroup.name || strings.itemGroupNotFound}`}
            </Header>
          </Form.Field>
          <Form.Field>
            <label>{strings.sapId}</label>
            {this.renderTextInput(this.state.sapId, (value: string) => { this.setState({ sapId: value }) }, strings.sapId, false)}
          </Form.Field>
          <Form.Field>
            <label>{strings.status}</label>
            {this.renderDropDown(statusOptions, this.state.status, (value: Contract.StatusEnum) => { this.setState({ status: value }) }, strings.status)}
          </Form.Field>
          <Form.Field>
            <Divider />
            <label>{strings.contractAmount}</label>
            {this.renderTextInput(this.state.quantity, (value: string) => { this.setState({ quantity: parseInt(value) }) }, "0", false)}
          </Form.Field>
          <Form.Field>
            <p>{strings.amountProposed} <strong>{this.state.contract && this.state.contract.proposedQuantity || "0"}</strong></p>
            <label>{strings.quantityComment}</label>
            {this.renderTextArea(this.state.quantityComment, (value: string) => { this.setState({ quantityComment: value }) }, strings.quantityComment)}
          </Form.Field>
          <Form.Field>
            <Divider />
            <p>{strings.deliveryPalceProposed} <strong>{this.state.proposedDeliveryPlace.name || "-"}</strong></p>
            <label>{strings.deliveryPlace}</label>
            {this.renderDropDown(deliveryPlaceOptions, this.state.deliveryPlaceId, (value: string) => { this.setState({ deliveryPlaceId: value }) }, strings.deliveryPlace)}
          </Form.Field>
          <Form.Field>
            <label>{strings.deliveryPlaceComment}</label>
            {this.renderTextArea(this.state.deliveryPlaceComment, (value: string) => { this.setState({ deliveryPlaceComment: value }) }, strings.deliveryPlaceComment)}
          </Form.Field>
          <Form.Field>
            <label>{strings.remarkFieldSap}</label>
            {this.renderTextArea(this.state.sapComment, (value: string) => { this.setState({ sapComment: value }) }, "")}
          </Form.Field>
          <Button.Group floated="right">
            <Button inverted color="red" as={Link} to={"/contractManagement"}>{strings.back}</Button>
            <Button.Or text="" />
            <Button floated="right" color="red" loading={this.state.buttonLoading} onClick={this.handleFormEdit}>{strings.save}</Button>
          </Button.Group>
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
