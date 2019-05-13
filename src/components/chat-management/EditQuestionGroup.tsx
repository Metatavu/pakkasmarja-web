import * as React from "react";
import * as actions from "../../actions/";
import * as _ from "lodash";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import Api, { ChatGroupPermissionScope, UserGroup, ChatGroup } from "pakkasmarja-client";
import { Header, Dimmer, Loader, Select, DropdownItemProps, Button, DropdownProps, Form, Input, InputOnChangeData, Image } from "semantic-ui-react";
import ImageGallery from "../generic/ImageGallery";
import UploadNewsImageModal from "../news/UploadNewsImageModal";
import strings from "src/localization/strings";
import { FileService } from "src/api/file.service";
import { Link } from "react-router-dom";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean,
  keycloak?: Keycloak.KeycloakInstance,
  match?: any
}

/**
 * Interface for component state
 */
interface State {
  userGroups: UserGroup[],
  permissionScopes: { [key: string]: ChatGroupPermissionScope| null },
  loading: boolean,
  saving: boolean,
  chatGroupId: number,
  chatGroup?: ChatGroup,
  title: string,
  imageUrl?: string,
  imageBase64?: string,
  galleryOpen: boolean
  uploadModalOpen: boolean
}

/**
 * Component for question group edit
 */
class EditQuestionGroup extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      userGroups: [],
      loading: false,
      saving: false,
      permissionScopes: {},
      chatGroupId: 0,
      title: "",
      uploadModalOpen: false,
      galleryOpen: false
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    await this.loadData();
  }

  /**
   * Load data
   */
  private loadData = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const chatGroupId = this.props.match.params.chatGroupId;

    this.setState({ 
      loading: true,
      chatGroupId: chatGroupId
    });
    
    const userGroupsService = await Api.getUserGroupsService(this.props.keycloak.token);
    const chatGroupsService = await Api.getChatGroupsService(this.props.keycloak.token);

    const chatGroup = await chatGroupsService.findChatGroup(chatGroupId);
    if (!chatGroup) {
      throw new Error("Could not find chat group");
    }

    const chatGroupPermissions = await chatGroupsService.listChatGroupGroupPermissions(chatGroupId);
    const permissions = _.keyBy(chatGroupPermissions, "userGroupId");
    const permissionKeys = Object.keys(permissions);
    const permissionScopes = {};

    for (let i = 0; i < permissionKeys.length; i++) {
      permissionScopes[permissionKeys[i]] = permissions[permissionKeys[i]].scope || null;
    }

    const userGroups = await userGroupsService.listUserGroups();
    
    this.setState({
      userGroups: userGroups,
      loading: false,
      permissionScopes: permissionScopes,
      imageUrl: chatGroup.imageUrl,
      title: chatGroup.title
    });

    this.updateImageBase64(chatGroup.imageUrl);
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.loading || this.state.saving) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted>
              { this.state.saving ? "Tallentaa..." : "Ladataan..." }
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }

    return (
      <BasicLayout>
        <Form>
          <Form.Field>
            <Header as="h2"> { strings.questionGroupManagement } </Header>
          </Form.Field>
          <Form.Field>
            <Header as="h3"> { strings.title } </Header>
          </Form.Field>
          <Form.Field>
            <Input onChange={ this.onTitleChange } value={ this.state.title } />
          </Form.Field>
          <Form.Field>
            <label>{strings.image}</label>
            <Button color="red" style={{ marginTop: "10px" }} onClick={() => this.setState({ galleryOpen: true })}>
              {strings.openGallery}
            </Button>
            <Button color="red" style={{ marginTop: "10px" }} onClick={() => this.setState({ uploadModalOpen: true })}>
              {strings.uploadImage}
            </Button>
            <div style={{ marginTop: "10px" }}>{ this.renderImage() }</div>
          </Form.Field>
          <Form.Field>
            <Header as="h3"> { strings.groupPermissions } </Header>
          </Form.Field>
          <Form.Field>
            { this.renderUserGroups() }
          </Form.Field>
          <Form.Field>
            <Button.Group floated="right">
              <Button inverted color="red" as={Link} to={"/chatManagement"}> { strings.back } </Button>
              <Button.Or text="" />
              <Button color="red" onClick={ this.onSaveClick }> { strings.save } </Button>
            </Button.Group>
          </Form.Field>
        </Form>
        <ImageGallery 
          modalOpen={this.state.galleryOpen}
          onCloseModal={() => this.setState({ galleryOpen: false })}
          onImageSelected={(url: string) => this.onImageSelected(url) }
        />
        <UploadNewsImageModal 
          modalOpen={this.state.uploadModalOpen}
          onCloseModal={() => this.setState({ uploadModalOpen: false })}
          onImageSelected={(url: string) => this.onImageSelected(url) }
        />
      </BasicLayout>
    );
  }

  /**
   * Renders image
   */
  private renderImage = () => {
    if (this.state.imageBase64) {
      return (<div>
        <Image src={this.state.imageBase64} size="medium" />
        <p style={{color: "red", cursor: "pointer"}} onClick={() => this.setState({ imageBase64: undefined, imageUrl: undefined })}>{strings.deleteImage}</p>
      </div>)
    }

    return <div> { strings.noSelectedImage } </div>;
  }

  /**
   * Renders user groups
   */
  private renderUserGroups = () => {
    const roleOptions: DropdownItemProps[] = [{
      key: undefined,
      value: "NONE",
      text: strings.groupPermissionNONE
    }, {
      key: ChatGroupPermissionScope.TRAVERSE,
      value: ChatGroupPermissionScope.TRAVERSE,
      text: strings.groupPermissionTRAVERSE
    }, {
      key: ChatGroupPermissionScope.MANAGE,
      value: ChatGroupPermissionScope.MANAGE,
      text: strings.groupPermissionMANAGE
    }];

    return (
      <div>
      {
        this.state.userGroups.map((userGroup, index) => {
          return (
            <div key={ userGroup.id } style={{ clear: "both", height: "40px" }}>
              <div style={{ float: "left" }}>{ userGroup.name }</div>
              <div style={{ float: "right" }}><Select value={ this.getUserGroupRoleValue(userGroup) } options={ roleOptions } onChange={ (event: React.SyntheticEvent<HTMLElement>, data: DropdownProps) => this.onChangeRole(userGroup.id!, data.value as string) } /></div>
            </div>
          );
        })
      }
      </div>
    );
  }

  /**
   * Returns user group role in group
   * 
   * @param userGroup user group
   * @returns user group role 
   */
  private getUserGroupRoleValue(userGroup: UserGroup) {
    return this.state.permissionScopes[userGroup.id!] || "NONE";
  }

  /**
   * Updates base64 image into state
   * 
   * @param url image url
   */
  private updateImageBase64 = async (url?: string) => {
    if (!this.props.keycloak || !this.props.keycloak.token || !process.env.REACT_APP_API_URL) {
      return;
    }
    
    if (url) {
      const fileService = new FileService(process.env.REACT_APP_API_URL, this.props.keycloak.token);
      const imageData = await fileService.getFile(url);

      this.setState({
        imageBase64: `data:image/jpeg;base64,${imageData.data}`, 
      });
    } else {
      this.setState({
        imageBase64: undefined
      });
    }
  }

  /**
   * On image selected
   * 
   * @param url url
   */
  private onImageSelected = async (url: string) => {
    this.setState({ 
      imageUrl: url,
      uploadModalOpen: false,
      galleryOpen: false
    });

    this.updateImageBase64(url);
  }

  /**
   * Event handler for title change
   */
  private onTitleChange = (event: React.SyntheticEvent<HTMLInputElement>, data: InputOnChangeData) => {
    this.setState({
      title: data.value as string
    });
  }

  /**
   * Event handler for role change select
   */
  private onChangeRole = (userGroupId: string, value?: string) => {
    const permissionScopes = _.clone(this.state.permissionScopes);
    permissionScopes[userGroupId] = value == "NONE" ? null : value as ChatGroupPermissionScope;

    this.setState({
      permissionScopes: permissionScopes
    });
  }

  /**
   * Event handler for save button click
   */
  private onSaveClick = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.chatGroupId || !this.state.title) {
      return;
    }

    const chatGroupId = this.state.chatGroupId;

    this.setState({ 
      saving: true
    });

    const chatGroupsService = await Api.getChatGroupsService(this.props.keycloak.token);

    const chatGroupPermissions = _.keyBy(await chatGroupsService.listChatGroupGroupPermissions(chatGroupId), "userGroupId");

    for (let i = 0; i < this.state.userGroups.length; i++) {
      const userGroup = this.state.userGroups[i];
      const userGroupId = userGroup.id!;
      const scope = this.state.permissionScopes[userGroupId];
      const existingPermission = chatGroupPermissions[userGroupId];

      if (!existingPermission || !existingPermission.id) {
        if (scope) {
          await chatGroupsService.createChatGroupGroupPermissions({
            chatGroupId: chatGroupId,
            scope: scope,
            userGroupId: userGroupId
          }, chatGroupId); 
        }
      } else {
        if (scope) {
          await chatGroupsService.updateChatGroupGroupPermissions({ ... existingPermission, scope: scope}, chatGroupId, existingPermission.id);
        } else {
          await chatGroupsService.deleteChatGroupGroupPermission(chatGroupId, existingPermission.id);
        }
      }
    }

    const chatGroup = await chatGroupsService.findChatGroup(this.state.chatGroupId);
    await chatGroupsService.updateChatGroup({ ... chatGroup, title: this.state.title, imageUrl: this.state.imageUrl }, this.state.chatGroupId);

    this.setState({ 
      saving: false
    });
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

export default connect(mapStateToProps, mapDispatchToProps)(EditQuestionGroup);
