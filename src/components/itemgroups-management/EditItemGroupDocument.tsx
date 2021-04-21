import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import "./styles.css";
import Api, { ItemGroupDocumentTemplate, ItemGroup } from "pakkasmarja-client";
import { Button, Header, Divider, Dimmer, Loader, TextArea } from "semantic-ui-react";
import { Redirect } from "react-router";
import { Link } from "react-router-dom";
import AsyncButton from "../generic/asynchronous-button";

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
  type: string;
  redirect: boolean;
  content: string,
  headerContent: string,
  footerContent: string,
  itemGroupDocumentTemplate?: ItemGroupDocumentTemplate;
  loading: boolean;
  buttonLoading: boolean;
  itemGroupId: string;
  itemGroupDocumentTemplateId: string;
  documentTemplateId: string;
  itemGroup : ItemGroup;
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
      type: "",
      redirect: false,
      content: "",
      headerContent: "",
      footerContent: "",
      loading: false,
      buttonLoading: false,
      itemGroupId: "",
      itemGroupDocumentTemplateId: "",
      documentTemplateId: "",
      itemGroup: {}
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const itemGroupId: string = this.props.match.params.itemGroupId;
    const itemGroupDocumentTemplateId: string = this.props.match.params.itemGroupDocumentTemplateId;
    this.setState({ 
      itemGroupId, 
      itemGroupDocumentTemplateId,
      loading: true });
    await this.loadItemGroup();
    await this.loadDocumentTemplate();
    this.setState({ loading: false });
  }

  /**
   * Load itemgroup
   */
  private loadItemGroup = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);
    const itemGroup = await itemGroupsService.findItemGroup(this.state.itemGroupId || "");
    this.setState({ itemGroup });
  }

  /**
   * Load document template
   */
  private loadDocumentTemplate = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const documentTemplateService = await Api.getItemGroupsService(this.props.keycloak.token);
    const documentTemplate: ItemGroupDocumentTemplate = await documentTemplateService.findItemGroupDocumentTemplate(this.state.itemGroupId, this.state.itemGroupDocumentTemplateId);
    if (documentTemplate) {
      this.setState({
        type: documentTemplate.type ? documentTemplate.type : "",
        content: documentTemplate.contents ? documentTemplate.contents : "",
        headerContent: documentTemplate.header ? documentTemplate.header : "",
        footerContent: documentTemplate.footer ? documentTemplate.footer : "",
        documentTemplateId: documentTemplate.id ? documentTemplate.id : ""
      });
    }
  }

  /**
   * Handle contract document submit.
   */
  private handleDocumentSubmit = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ buttonLoading: true });

    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);
    const itemGroupDocumentTemplate: ItemGroupDocumentTemplate = {
      type: this.state.type,
      contents: this.state.content,
      header: this.state.headerContent,
      footer: this.state.footerContent
    }
    await itemGroupsService.updateItemGroupDocumentTemplate(itemGroupDocumentTemplate, this.state.itemGroupId, this.state.documentTemplateId);
    this.setState({ buttonLoading: false, redirect: true });
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.loading) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted>
              Ladataan sopimusmallia
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }

    if (this.state.redirect) {
      return (
        <Redirect to="/itemGroupsManagement" />
      );
    }

    return (
      <BasicLayout>
        <Divider horizontal>
          <Header as='h2'>
            {`Muokkaat marjalajin ${this.state.itemGroup.name} sopimusmallia ${this.state.type || "(sopimustyyppiä ei löytynyt)"}`}
          </Header>
        </Divider>
        <Header as="h4">Ylätunniste</Header>
        <div>
          <TextArea 
            value={this.state.headerContent}
            onChange = {(e, data) => {
              const headerContent = data.value as string;
              this.setState({ headerContent });
            }}
          />
        </div>
        <Divider />
        <Header as="h4">Sisältö</Header>
        <div>
          <TextArea 
            value={this.state.content}
            onChange = {(e, data) => {
              const content = data.value as string;
              this.setState({ content });
            }}
          />
        </div>
        <Divider />
        <Header as="h4">Alatunniste</Header>
        <div>
          <TextArea 
            value={this.state.footerContent}
            onChange = {(e, data) => {
              const footerContent = data.value as string;
              this.setState({ footerContent });
            }}
          />
        </div>
        <Divider />
        <Button.Group floated="right">
          <Button inverted color="red" as={Link} to={"/itemGroupsManagement"}>Takaisin</Button>
          <Button.Or text="" />
          <AsyncButton color="red" loading={ this.state.buttonLoading } onClick={ this.handleDocumentSubmit }>Tallenna muutokset</AsyncButton>
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
