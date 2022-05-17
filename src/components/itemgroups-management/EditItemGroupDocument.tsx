import * as React from "react";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
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
   * Component did mount life cycle event
   */
  public componentDidMount = async () => {
    const { keycloak, match } = this.props;
    const { params } = match;

    if (!keycloak?.token) {
      return;
    }

    const itemGroupId: string = params.itemGroupId;
    const itemGroupDocumentTemplateId: string = params.itemGroupDocumentTemplateId;

    this.setState({
      itemGroupId,
      itemGroupDocumentTemplateId,
      loading: true
    });

    await Promise.all([
      this.loadItemGroup(),
      this.loadDocumentTemplate()
    ]);

    this.setState({ loading: false });
  }

  /**
   * Load item group
   */
  private loadItemGroup = async () => {
    const { keycloak } = this.props;
    const { itemGroupId } = this.state;

    if (!keycloak?.token) {
      return;
    }

    const itemGroup = await Api
      .getItemGroupsService(keycloak.token)
      .findItemGroup(itemGroupId || "");

    this.setState({ itemGroup });
  }

  /**
   * Load document template
   */
  private loadDocumentTemplate = async () => {
    const { keycloak } = this.props;
    const { itemGroupId, itemGroupDocumentTemplateId } = this.state;

    if (!keycloak?.token) {
      return;
    }

    const documentTemplate = await Api
      .getItemGroupsService(keycloak.token)
      .findItemGroupDocumentTemplate(itemGroupId, itemGroupDocumentTemplateId);

    if (!documentTemplate) {
      return;
    }

    this.setState({
      type: documentTemplate?.type ?? "",
      content: documentTemplate?.contents ?? "",
      headerContent: documentTemplate?.header ?? "",
      footerContent: documentTemplate?.footer ?? "",
      documentTemplateId: documentTemplate?.id ?? ""
    });
  }

  /**
   * Handle contract document submit.
   */
  private handleDocumentSubmit = async () => {
    const { keycloak } = this.props;
    const {
      type,
      content,
      headerContent,
      footerContent,
      itemGroupId,
      documentTemplateId
    } = this.state;

    if (!keycloak?.token) {
      return;
    }

    this.setState({ buttonLoading: true });

    await Api
      .getItemGroupsService(keycloak.token)
      .updateItemGroupDocumentTemplate(
        {
          type: type,
          contents: content,
          header: headerContent,
          footer: footerContent
        },
        itemGroupId,
        documentTemplateId
      );

    this.setState({
      buttonLoading: false,
      redirect: true
    });
  }

  /**
   * Render method
   */
  public render = () => {
    const {
      loading,
      redirect,
      itemGroup,
      type,
      headerContent,
      content,
      footerContent,
      buttonLoading
    } = this.state;

    if (loading) {
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

    if (redirect) {
      return (
        <Redirect to="/itemGroupsManagement" />
      );
    }

    return (
      <BasicLayout>
        <Divider horizontal>
          <Header as='h2'>
            {`Muokkaat marjalajin ${itemGroup.name} sopimusmallia ${type || "(sopimustyyppiä ei löytynyt)"}`}
          </Header>
        </Divider>
        <Header as="h4">
          Ylätunniste
        </Header>
        <div>
          <TextArea
            value={ headerContent }
            onChange = { (_, data) => this.setState({ headerContent: data.value as string }) }
          />
        </div>
        <Divider />
        <Header as="h4">
          Sisältö
        </Header>
        <div>
          <TextArea
            value={ content }
            onChange={ (_, data) => this.setState({ content: data.value as string }) }
          />
        </div>
        <Divider />
        <Header as="h4">
          Alatunniste
        </Header>
        <div>
          <TextArea
            value={ footerContent }
            onChange = {(_, data) => this.setState({ footerContent: data.value as string }) }
          />
        </div>
        <Divider />
        <Button.Group floated="right">
          <Button
            inverted
            color="red"
            as={ Link }
            to="/itemGroupsManagement"
          >
            Takaisin
          </Button>
          <Button.Or text="" />
          <AsyncButton
            color="red"
            loading={ buttonLoading }
            onClick={ this.handleDocumentSubmit }
          >
            Tallenna muutokset
          </AsyncButton>
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
export const mapStateToProps = (state: StoreState) => ({
  authenticated: state.authenticated,
  keycloak: state.keycloak
});

export default connect(mapStateToProps)(EditContractDocument);
