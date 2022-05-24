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
import { History } from "history";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  match?: any;
  navigation?: any;
  history: History;
}

/**
 * Interface for component state
 */
interface State {
  redirect: boolean;
  itemGroup?: ItemGroup;
  itemGroupDocumentTemplate?: ItemGroupDocumentTemplate;
  loading: boolean;
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
      redirect: false,
      loading: false
    };
  }

  /**
   * Component did mount life cycle event
   */
  public componentDidMount = async () => {
    const { keycloak } = this.props;

    const itemGroupId = this.getItemGroupId();
    const itemGroupDocumentTemplateId = this.getItemGroupDocumentTemplateId();

    if (!keycloak?.token || !itemGroupId || !itemGroupDocumentTemplateId) {
      return;
    }

    this.setState({ loading: true });

    const [ itemGroup, itemGroupDocumentTemplate ] = await Promise.all([
      this.loadItemGroup(itemGroupId),
      this.loadDocumentTemplate(itemGroupId, itemGroupDocumentTemplateId)
    ]);

    this.setState({
      loading: false,
      itemGroup: itemGroup,
      itemGroupDocumentTemplate: itemGroupDocumentTemplate
    });
  }

  /**
   * Load item group
   *
   * @param itemGroupId item group ID
   */
  private loadItemGroup = async (itemGroupId: string) => {
    const { keycloak } = this.props;

    if (!keycloak?.token) return;

    return await Api.getItemGroupsService(keycloak.token)
      .findItemGroup(itemGroupId);
  }

  /**
   * Return item group ID from URL path
   */
  private getItemGroupId = (): string | undefined => {
    return this.props.match.params.itemGroupId;
  }

  /**
   * Return item group document template ID from URL path
   */
  private getItemGroupDocumentTemplateId = (): string | undefined => {
    return this.props.match.params.itemGroupDocumentTemplateId;
  }

  /**
   * Load document template
   *
   * @param itemGroupId item group ID
   * @param documentTemplateId document template ID
   */
  private loadDocumentTemplate = async (itemGroupId: string, documentTemplateId: string) => {
    const { keycloak } = this.props;

    if (!keycloak?.token) return;

    return await Api.getItemGroupsService(keycloak.token)
      .findItemGroupDocumentTemplate(itemGroupId, documentTemplateId);
  }

  /**
   * Event handler item group document template property change
   *
   * @param key property key
   */
  private onDocumentTemplateChange = (key: keyof ItemGroupDocumentTemplate) =>
    (event: React.FormEvent<HTMLTextAreaElement>) => {
    const { itemGroupDocumentTemplate } = this.state;

    console.log(event.currentTarget.value);

    if (!itemGroupDocumentTemplate) return;

    this.setState({
      itemGroupDocumentTemplate: {
        ...itemGroupDocumentTemplate,
        [key]: event.currentTarget.value
      }
    })
  }

  /**
   * Handle contract document submit.
   */
  private handleDocumentSubmit = async () => {
    const { keycloak, history } = this.props;
    const { itemGroupDocumentTemplate } = this.state;
    const itemGroupId = this.getItemGroupId();
    const itemGroupDocumentTemplateId = this.getItemGroupDocumentTemplateId();

    if (!keycloak?.token || !itemGroupDocumentTemplate) return;

    if (!itemGroupId || !itemGroupDocumentTemplateId) return;

    await Api
      .getItemGroupsService(keycloak.token)
      .updateItemGroupDocumentTemplate(
        itemGroupDocumentTemplate,
        itemGroupId,
        itemGroupDocumentTemplateId
      );

    history.push("/itemGroupsManagement");
  }

  /**
   * Render method
   */
  public render = () => {
    const {
      loading,
      redirect,
      itemGroup,
      itemGroupDocumentTemplate
    } = this.state;

    if (loading || !itemGroup || !itemGroupDocumentTemplate) {
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
        <Redirect to="" />
      );
    }

    const { header, contents, footer, type } = itemGroupDocumentTemplate;

    return (
      <BasicLayout>
        <Divider horizontal>
          <Header as="h2">
            {`Muokkaat marjalajin ${itemGroup.name} sopimusmallia ${type || "(sopimustyyppiä ei löytynyt)"}`}
          </Header>
        </Divider>
        <Header as="h4">
          Ylätunniste
        </Header>
        <div>
          <TextArea
            value={ header }
            onChange={ this.onDocumentTemplateChange("header") }
          />
        </div>
        <Divider />
        <Header as="h4">
          Sisältö
        </Header>
        <div>
          <TextArea
            value={ contents }
            onChange={ this.onDocumentTemplateChange("contents") }
          />
        </div>
        <Divider />
        <Header as="h4">
          Alatunniste
        </Header>
        <div>
          <TextArea
            value={ footer }
            onChange={ this.onDocumentTemplateChange("footer") }
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
