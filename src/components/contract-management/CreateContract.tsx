import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState, Options } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import "./styles.css";
import ErrorMessage from "../generic/ErrorMessage";
import Api, { Contact, ItemGroup, Contract, DeliveryPlace } from "pakkasmarja-client";
import { Form, Button, Dropdown, Input, TextArea } from "semantic-ui-react";
import * as moment from "moment";
import { Redirect } from "react-router";
import Select from "react-select/lib/Async";
import { Link } from "react-router-dom";
import strings from "src/localization/strings";

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
  selectedOption: { value: string | undefined, label: string } | null | undefined;
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
  redirect: boolean;
  buttonLoading: boolean;
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
      selectedOption: { value: "", label: "" },
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
      sapComment: "",
      redirect: false,
      buttonLoading: false
    };
  }
  
  /**
   * Get options as promise
   * 
   * @param inputValue input value
   * @return options promise
   */
  private promiseOptions = async (inputValue: string) => {
    return new Promise(resolve => {
      resolve(this.getOptions(inputValue));
    });
  };

  /**
   * Get options
   * 
   * @param value value
   * @return options
   */
  private getOptions = async (value: string) => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    
    const contactsService = Api.getContactsService(this.props.keycloak.token);
    const contacts = await contactsService.listContacts(value);
    this.setState({ contacts: contacts });

    const options = this.state.contacts.map((contact: Contact) => {
      return {
        label: contact.companyName || `${contact.firstName} ${contact.lastName}`,
        value: contact.id
      };
    });

    return options;
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
   * Render autocomplete field
   */
  private renderAutoCompleteField = () => {
    return (
      <Select
        value={this.state.selectedOption}
        loadOptions={this.promiseOptions}
        onChange={(selectedOption) => {
          if (Array.isArray(selectedOption)) {
            return;
          }
          this.setState({ selectedOption: selectedOption })
        }}
      />
    );
  }

  /**
   * Render drop down
   * 
   * @param options options
   * @param value value
   * @param onChange onChange function
   * @param placeholder placeholder
   */
  private renderDropDown = (options: Options[], value: string | number, onChange: (value: string) => void, placeholder: string) => {
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
          onChange(data.value as string)
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
   * 
   * @param value value
   * @param onChange on change function
   * @param placeholder placeholder
   * @param disabled disabled
   */
  private renderTextInput = (value: string | number, onChange: (value: string) => void, placeholder: string, disabled: boolean) => {
    return (
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(event: React.FormEvent<HTMLInputElement>) => onChange(event.currentTarget.value)}
        disabled={disabled}
      />
    );
  }

  /**
   * Render text area
   * 
   * @param value value
   * @param onChange on change function
   * @param placeholder placeholder
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
   * Handle form submit
   */
  private handleFormSubmit = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ buttonLoading: true });
    const contract: Contract = {
      contactId: this.state.selectedOption ? this.state.selectedOption.value : "",
      itemGroupId: this.state.itemGroupId,
      sapId: this.state.sapId,
      status: this.state.status,
      quantityComment: this.state.quantityComment,
      contractQuantity: this.state.quantity,
      deliveryPlaceId: this.state.deliveryPlaceId,
      deliveryPlaceComment: this.state.deliveryPlaceComment,
      remarks: this.state.sapComment,
      deliverAll: false,
      proposedDeliverAll: false,
      year: moment().year()
    };

    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    await contractsService.createContract(contract);
    this.setState({ buttonLoading: false, redirect: true });
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
        <Redirect to="contractManagement" />
      );
    }

    const itemGroupOptions: Options[] = this.state.itemGroups.map((itemGroup) => {
      return {
        key: itemGroup.id,
        value: itemGroup.id,
        text: itemGroup.name
      };
    });

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

    const deliveryPlaceOptions: Options[] = this.state.deliveryPlaces.map((deliveryPlace) => {
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
            <label>{strings.contract}</label>
            {this.renderAutoCompleteField()}
          </Form.Field>
          <Form.Field>
            <label>{strings.itemGroup}</label>
            {this.renderDropDown(itemGroupOptions, this.state.itemGroupId, this.handleItemGroupChange, "Valitse marjalaji")}
          </Form.Field>
          <Form.Field>
            <label>{strings.sapId}</label>
            {this.renderTextInput(this.state.sapId, (value: string) => { this.setState({ sapId: value }) }, "SAP id", false)}
          </Form.Field>
          <Form.Field>
            <label>{strings.status}</label>
            {this.renderDropDown(statusOptions, this.state.status, (value: Contract.StatusEnum) => { this.setState({ status: value }) }, "Valitse tila")}
          </Form.Field>
          <Form.Field>
            <label>{strings.quantityComment}</label>
            {this.renderTextArea(this.state.quantityComment, (value: string) => { this.setState({ quantityComment: value }) }, "Määrän kommentti")}
          </Form.Field>
          <Form.Field>
            <label>{strings.quantity}</label>
            {this.renderTextInput(this.state.quantity, (value: string) => { this.setState({ quantity: parseInt(value) || 0 }) }, "0", false)}
          </Form.Field>
          <Form.Field>
            <label>{strings.deliveryPlace}</label>
            {this.renderDropDown(deliveryPlaceOptions, this.state.deliveryPlaceId, (value: string) => { this.setState({ deliveryPlaceId: value }) }, "Valitse toimituspaikka")}
          </Form.Field>
          <Form.Field>
            <label>{strings.deliveryPlaceComment}</label>
            {this.renderTextArea(this.state.deliveryPlaceComment, (value: string) => { this.setState({ deliveryPlaceComment: value }) }, "Toimituspaikan kommentti")}
          </Form.Field>
          <Form.Field>
            <label>{strings.remarkFieldSap}</label>
            {this.renderTextArea(this.state.sapComment, (value: string) => { this.setState({ sapComment: value }) }, "")}
          </Form.Field>
          <Button.Group floated="right">
            <Button inverted color="red" as={Link} to={"/contractManagement"}>{strings.back}</Button>
            <Button.Or text="" />
            <Button floated="right" color="red" loading={this.state.buttonLoading} onClick={this.handleFormSubmit}>{strings.save}</Button>
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

export default connect(mapStateToProps, mapDispatchToProps)(CreateContract);
