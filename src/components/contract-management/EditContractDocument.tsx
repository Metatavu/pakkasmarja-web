import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import "./styles.scss";
import ErrorMessage from "../generic/ErrorMessage";
import Api, { Contact, ItemGroup, Contract, DeliveryPlace, ContractDocumentTemplate, ItemGroupDocumentTemplate } from "pakkasmarja-client";
import { Button, Header, Divider } from "semantic-ui-react";
import { Redirect } from "react-router";
import CKEditor from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { Link } from "react-router-dom";

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
  type: string
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
      type: ""
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
    await this.loadItemGroup();
    await this.loadContact();
    await this.loadDocumentTemplate();
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
  private loadContact = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract) {
      return;
    }

    const contactsService = await Api.getContactsService(this.props.keycloak.token);
    const contact = await contactsService.findContact(this.state.contract.contactId || "");
    this.setState({ contact });
  }

  /**
   * Load item groups
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
   * Load item group document template
   */
  private loadDocumentTemplate = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.itemGroup || !this.state.itemGroup.id || !this.state.contract || !this.state.contract.id) {
      return;
    }

    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    let documentTemplate: ContractDocumentTemplate = await contractsService.findContractDocumentTemplate(this.state.contract.id, "");
    documentTemplate = documentTemplate[0];
    if (documentTemplate) {
      this.setState({
        contractDocumentTemplate: documentTemplate,
        content: documentTemplate.contents ? documentTemplate.contents : "",
        headerContent: documentTemplate.header ? documentTemplate.header : "",
        footerContent: documentTemplate.footer ? documentTemplate.footer : "",
      });
    } else {
      const documentTemplateService = await Api.getItemGroupsService(this.props.keycloak.token);
      const documentTemplate: ItemGroupDocumentTemplate = await documentTemplateService.findItemGroupDocumentTemplate(this.state.itemGroup.id, "") || {};
      this.setState({
        type: documentTemplate.type ? documentTemplate.type : "",
        content: documentTemplate.contents ? documentTemplate.contents : "",
        headerContent: documentTemplate.header ? documentTemplate.header : "",
        footerContent: documentTemplate.footer ? documentTemplate.footer : "",
      });
    }
  }

  /**
   * Handle contract document submit
   */
  private handleDocumentSubmit = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.contract || !this.state.contract.id) {
      return;
    }
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

    return (
      <BasicLayout>
        <Divider horizontal>
          <Header as='h2'>
            {`Muokkaat sopimuksen ${this.state.contact.companyName || "Kontaktia ei löytynyt"} sopimusmallia ${"hakee tähä mallin vuoden"}`}
          </Header>
        </Divider>
        <p>Huomaathan, että mallin tallentaminen luo sopimukselle erillisen mallin ja eriyttää mallin marjaryhmän pohjamallista</p>
        <Header as="h4">Sisältö</Header>
        <CKEditor
          editor={ClassicEditor}
          data={this.state.content}
          onChange={(e: any, editor: any) => {
            const content = editor.getData();
            this.setState({ content });
          }}
        />
        <Divider />
        <Header as="h4">Ylätunniste</Header>
        <CKEditor
          editor={ClassicEditor}
          data={this.state.headerContent}
          onChange={(e: any, editor: any) => {
            const headerContent = editor.getData();
            this.setState({ headerContent });
          }}
        />
        <Divider />
        <Header as="h4">Alatunniste</Header>
        <CKEditor
          editor={ClassicEditor}
          data={this.state.footerContent}
          onChange={(e: any, editor: any) => {
            const footerContent = editor.getData();
            this.setState({ footerContent });
          }}
        />
        <Divider />
        <Button.Group floated="right">
          <Button inverted color="red" as={Link} to={"/contractManagement"}>Takaisin</Button>
          <Button.Or text="" />
          <Button color="red" onClick={this.handleDocumentSubmit}>Muokkaa</Button>
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