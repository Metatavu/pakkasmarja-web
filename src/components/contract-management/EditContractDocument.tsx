import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import "./styles.css";
import ErrorMessage from "../generic/ErrorMessage";
import Api, { Contact, ItemGroup, Contract, DeliveryPlace, ContractDocumentTemplate, ItemGroupDocumentTemplate } from "pakkasmarja-client";
import { Button, Header, Divider, Dimmer, Loader } from "semantic-ui-react";
import { Redirect } from "react-router";
import CKEditor from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { Link } from "react-router-dom";
import strings from "src/localization/strings";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  match?: any;
  navigation?: any;
}

/**
 * Interface for component state
 */
interface State {
  errorMessage?: string;
  contract?: Contract;
  deliveryPlace: DeliveryPlace;
  contact: Contact;
  itemGroup: ItemGroup;
  redirect: boolean;
  content: string,
  headerContent: string,
  footerContent: string,
  contractDocumentTemplate?: ContractDocumentTemplate;
  type: string;
  loading: boolean;
  buttonLoading: boolean;
}

/**
 * Class for edit contract document component
 */
class EditContractDocument extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      deliveryPlace: {},
      itemGroup: {},
      contact: {},
      redirect: false,
      content: "",
      headerContent: "",
      footerContent: "",
      type: "2020",
      loading: false,
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

    this.setState({ loading: true });
    await this.loadContract();
    await this.loadItemGroup();
    await this.loadContact();
    await this.loadDocumentTemplate();
    this.setState({ loading: false });
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
   * Load contact
   */
  private loadContact = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract) {
      return;
    }

    const contactsService = await Api.getContactsService(this.props.keycloak.token);
    const contact = await contactsService.findContact(this.state.contract.contactId || "");
    this.setState({ contact });
  }

  /**
   * Load item group
   */
  private loadItemGroup = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract) {
      return;
    }

    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);
    const itemGroup = await itemGroupsService.findItemGroup(this.state.contract.itemGroupId || "");
    this.setState({ itemGroup });
  }

  /**
   * Load document template
   */
  private loadDocumentTemplate = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.itemGroup || !this.state.itemGroup.id || !this.state.contract || !this.state.contract.id) {
      return;
    }

    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    const documentTemplates: ContractDocumentTemplate[] = await contractsService.listContractDocumentTemplates(this.state.contract.id);
    const documentTemplate = documentTemplates[0];
    if (documentTemplate) {
      this.setState({
        contractDocumentTemplate: documentTemplate,
        content: documentTemplate.contents ? documentTemplate.contents : "",
        headerContent: documentTemplate.header ? documentTemplate.header : "",
        footerContent: documentTemplate.footer ? documentTemplate.footer : "",
      });
    } else {
      const documentTemplateService = await Api.getItemGroupsService(this.props.keycloak.token);
      let documentTemplate: ItemGroupDocumentTemplate = await documentTemplateService.findItemGroupDocumentTemplate(this.state.itemGroup.id, "") || {};
      documentTemplate = documentTemplate[0];
      this.setState({
        content: documentTemplate.contents ? documentTemplate.contents : "",
        headerContent: documentTemplate.header ? documentTemplate.header : "",
        footerContent: documentTemplate.footer ? documentTemplate.footer : "",
      });
    }
  }

  /**
   * Handle contract document submit.
   */
  private handleDocumentSubmit = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract || !this.state.contract.id) {
      return;
    }

    this.setState({ buttonLoading: true });

    const contractDocumentService = await Api.getContractsService(this.props.keycloak.token);
    if (!this.state.contractDocumentTemplate) {
      const contractDocumentTemplate: ContractDocumentTemplate = {
        contractId: this.state.contract.id,
        type: this.state.type,
        contents: this.state.content,
        header: this.state.headerContent,
        footer: this.state.footerContent
      }

      await contractDocumentService.createContractDocumentTemplate(contractDocumentTemplate, this.state.contract.id);
    } else {
      const contractDocumentTemplate: ContractDocumentTemplate = {
        contractId: this.state.contract.id,
        type: this.state.type,
        contents: this.state.content,
        header: this.state.headerContent,
        footer: this.state.footerContent
      }

      const contractDocumentTemplateId: string = this.state.contractDocumentTemplate && this.state.contractDocumentTemplate.id || "";
      await contractDocumentService.updateContractDocumentTemplate(contractDocumentTemplate, this.state.contract.id, contractDocumentTemplateId);
    }

    this.setState({ buttonLoading: false, redirect: true });
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.loading || !this.state.contract) {
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
            errorMessage={this.state.errorMessage || ""}
          />
        </BasicLayout>
      );
    }

    if (this.state.redirect) {
      return (
        <Redirect to="/contractManagement" />
      );
    }

    const header = `Muokkaat sopimuksen ${this.state.contact.companyName || "Kontaktia ei löytynyt"} sopimusmallia`;

    return (
      <BasicLayout>
        <Divider horizontal>
          <Header as='h2'>{ header }</Header>
        </Divider>

        <Header as='h4'>Sopimuksen tiedot</Header>
        <div><b>Vuosi: </b> { this.state.contract.year}</div>
        <div><b>Tyyppi: </b> { this.state.contractDocumentTemplate && this.state.contractDocumentTemplate.type || "Ei tiedossa" }</div>
        <br/>

        <p>{strings.contractDocumentInfoText}</p>
        <Header as="h4">{strings.header}</Header>
        <div>
          <CKEditor
            editor={ClassicEditor}
            data={this.state.headerContent}
            onChange={(e: any, editor: any) => {
              const headerContent = editor.getData();
              this.setState({ headerContent });
            }}
          />
        </div>
        <Divider />
        <Header as="h4">{strings.content}</Header>
        <div>
          <CKEditor
            editor={ClassicEditor}
            data={this.state.content}
            onChange={(e: any, editor: any) => {
              const content = editor.getData();
              this.setState({ content });
            }}
          />
        </div>
        <Divider />
        <Header as="h4">{strings.footer}</Header>
        <div>
          <CKEditor
            editor={ClassicEditor}
            data={this.state.footerContent}
            onChange={(e: any, editor: any) => {
              const footerContent = editor.getData();
              this.setState({ footerContent });
            }}
          />
        </div>
        <Divider />
        <Button.Group floated="right">
          <Button inverted color="red" as={Link} to={"/contractManagement"}>{strings.back}</Button>
          <Button.Or text="" />
          <Button color="red" loading={this.state.buttonLoading} onClick={this.handleDocumentSubmit}>{strings.save}</Button>
        </Button.Group>
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

export default connect(mapStateToProps, mapDispatchToProps)(EditContractDocument);
