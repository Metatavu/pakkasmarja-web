import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState, Options } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import "./styles.css";
import ErrorMessage from "../generic/ErrorMessage";
import Api, { Contact, ItemGroup, Contract, DeliveryPlace, ContractStatus } from "pakkasmarja-client";
import { Form, Button, Dropdown, Input, TextArea, Header, Dimmer, Loader, Checkbox } from "semantic-ui-react";
import { Redirect } from "react-router";
import { Link } from "react-router-dom";
import strings from "src/localization/strings";
import AppConfig, { AppConfigItemGroupOptions } from "src/utils/AppConfig";
import AsyncButton from "../generic/asynchronous-button";

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
  deliveryPlaces: DeliveryPlace[];
  deliveryPlace: DeliveryPlace;
  deliveryPlaceComment: string;
  deliveryPlaceId: string;
  proposedDeliveryPlace?: DeliveryPlace;
  contact?: Contact;
  itemGroup: ItemGroup;
  sapId: string;
  status: ContractStatus;
  quantityComment: string;
  quantity: number;
  sapComment: string;
  redirect: boolean;
  contractEditLoading: boolean;
  buttonLoading: boolean;
  allowDeliveryAll: boolean;
  deliverAllChecked: boolean;
  proposedDeliveryAll?: boolean;
  deliveredQuantity?: number;
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
      allowDeliveryAll: false,
      deliverAllChecked: false,
      deliveryPlaces: [],
      deliveryPlace: {},
      deliveryPlaceId: "",
      itemGroup: {},
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
    await this.loadContractManagementData();
    this.setState({ contractEditLoading: false });
  }

  /**
   * Load contract data
   */
  private loadContractManagementData = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const contractId: string = this.props.match.params.contractId;
    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    const contract: Contract = await contractsService.findContract(contractId, "application/json");
    const deliveryPlacesService = await Api.getDeliveryPlacesService(this.props.keycloak.token);
    const deliveryPlaces = await deliveryPlacesService.listDeliveryPlaces();
    const deliveryPlace = deliveryPlaces.find(deliveryPlace => deliveryPlace.id === contract.deliveryPlaceId) || {};
    const deliveryPlaceId = deliveryPlace.id || "";
    const proposedDeliveryPlace = contract.proposedDeliveryPlaceId ? deliveryPlaces.find(deliveryPlace => deliveryPlace.id === contract.proposedDeliveryPlaceId) : undefined;
    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);
    const itemGroup = await itemGroupsService.findItemGroup(contract.itemGroupId);
    const contactsService = await Api.getContactsService(this.props.keycloak.token);
    const contact = contract.contactId ? await contactsService.findContact(contract.contactId) : undefined;
    const deliveryPlaceComment: string = contract.deliveryPlaceComment || "";
    const quantityComment: string = contract.quantityComment || "";
    const sapComment: string = contract.remarks || "";
    const deliveredQuantity: number = contract.deliveredQuantity || 0;
    const sapId: string = contract.sapId || "";
    const quantity: number = contract.contractQuantity || 0;
    const status: ContractStatus = contract.status;

    const appConfig = await AppConfig.getAppConfig();
    if (appConfig && contract.itemGroupId) {
      const configItemGroups = appConfig["item-groups"];
      const configItemGroup: AppConfigItemGroupOptions = configItemGroups[contract.itemGroupId];
      const allowDeliveryAll = configItemGroup && configItemGroup["allow-delivery-all"] ? true : false;
      this.setState({ allowDeliveryAll });
    }

    this.setState({
      contract,
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
      proposedDeliveryPlace,
      deliveryPlaces,
      proposedDeliveryAll: contract.proposedDeliverAll,
      deliverAllChecked: contract.deliverAll,
      deliveredQuantity
    });
  }

  /**
   * Render drop down
   * 
   * @param options options
   * @param value value
   * @param onChange on change event handler
   * @param placeholder placeholder
   */
  private renderDropDown = (
    options: Options[],
    value: string | number,
    onChange: (value: string) => void,
    placeholder: string
  ) => {
    if (options.length < 1) {
      return <Dropdown fluid />;
    }

    return (
      <Dropdown
        fluid
        placeholder={ placeholder }
        selection
        value={ value }
        options={ options }
        onChange={ (event, data) => onChange(data.value as string) }
      />
    );
  }

  /**
   * Render text input
   *
   * @param value value
   * @param onChange on change event handler
   * @param placeholder placeholder
   * @param disabled disabled
   */
  private renderTextInput = (
    value: string | number,
    onChange: (value: string) => void,
    placeholder: string | number,
    disabled: boolean
  ) => {
    return (
      <Input
        type={ typeof value === "number" ? "number" : "text" }
        placeholder={ placeholder }
        value={ value }
        onChange={ event => onChange(event.currentTarget.value) }
        disabled={ disabled }
      />
    );
  }

  /**
   * Render text area
   *
   * @param value value
   * @param onChange on change event handler
   * @param placeholder 
   */
  private renderTextArea = (
    value: string,
    onchange: (value: string) => void,
    placeholder: string
  ) => {
    return (
      <TextArea
        value={ value }
        onChange={ event => onchange(event.currentTarget.value) }
        placeholder={ placeholder }
      />
    );
  }

  /**
   * Handle form edit
   */
  private handleFormEdit = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract || !this.state.contract.id || !this.state.itemGroup.id) {
      return;
    }

    this.setState({ buttonLoading: true });

    const contractUpdate: Contract = {
      areaDetails: this.state.contract.areaDetails,
      itemGroupId: this.state.itemGroup.id,
      sapId: this.state.sapId,
      status: this.state.status,
      quantityComment: this.state.quantityComment,
      contractQuantity: this.state.quantity,
      proposedQuantity: this.state.contract.proposedQuantity,
      deliveryPlaceId: this.state.deliveryPlaceId,
      deliveryPlaceComment: this.state.deliveryPlaceComment,
      deliveredQuantity: this.state.deliveredQuantity,
      remarks: this.state.sapComment,
      deliverAll: this.state.deliverAllChecked,
      proposedDeliverAll: this.state.deliverAllChecked,
      year: this.state.contract.year,
      proposedDeliveryPlaceId: this.state.contract.proposedDeliveryPlaceId
    };

    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    await contractsService.updateContract(contractUpdate, this.state.contract.id);
    this.setState({ buttonLoading: false, redirect: true });
  }

  /**
   * Renders deliver all section
   */
  private renderDeliveryAll = () => {
    const { deliverAllChecked, proposedDeliveryAll } = this.state;

    return (
      <>
        <Header as="h5">{ strings.deliverAll }</Header>
        <Form.Field>
          <Checkbox
            checked={ deliverAllChecked }
            onChange={ () => this.setState({ deliverAllChecked: !deliverAllChecked }) }
            label={ strings.pakkasmarjaProposal }
          />
        </Form.Field>
        <Form.Field>
          <Checkbox
            disabled
            checked={ proposedDeliveryAll }
            label={ strings.farmerProposal }
          />
        </Form.Field>
      </>
    );
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
              {this.state.contact ? `${this.state.contact.displayName} sopimus` : "Kontaktia ei löytynyt"}
            </Header>
          </Form.Field>
          <Form.Field>
            <label>{strings.sapId}</label>
            {this.renderTextInput(this.state.sapId, (value: string) => { this.setState({ sapId: value }) }, strings.sapId, false)}
          </Form.Field>
          <Form.Field>
            <label>{strings.status}</label>
            {
              this.renderDropDown(
                statusOptions,
                this.state.status,
                (value: ContractStatus) => this.setState({ status: value }),
                strings.status
              )
            }
          </Form.Field>
          <Form.Field>
            <label>{strings.contractAmount}</label>
            {this.renderTextInput(this.state.quantity, (value: string) => { this.setState({ quantity: parseInt(value) }) }, "0", false)}
          </Form.Field>
          <p>{strings.amountProposed} <strong>{this.state.contract && this.state.contract.proposedQuantity || "0"}</strong></p>
          { this.state.allowDeliveryAll && this.renderDeliveryAll() }
          <Form.Field>
            <label>{strings.quantityComment}</label>
            {this.renderTextArea(this.state.quantityComment, (value: string) => { this.setState({ quantityComment: value }) }, strings.quantityComment)}
          </Form.Field>
          <Form.Field>
            {this.state.proposedDeliveryPlace && <p>{strings.deliveryPlaceProposed} <strong>{this.state.proposedDeliveryPlace.name}</strong></p>}
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
            <AsyncButton floated="right" color="red" loading={ this.state.buttonLoading } onClick={ this.handleFormEdit }>{ strings.save }</AsyncButton>
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
