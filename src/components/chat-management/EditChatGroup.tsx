import * as React from "react";
import * as actions from "../../actions/";
import * as _ from "lodash";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import Api, { ChatGroupPermissionScope, UserGroup, ChatGroup, ChatThread } from "pakkasmarja-client";
import { Header, Dimmer, Loader, Select, DropdownItemProps, Button, DropdownProps, Form, Input, InputOnChangeData, Image, Dropdown, Checkbox } from "semantic-ui-react";
import ImageGallery from "../generic/ImageGallery";
import UploadNewsImageModal from "../news/UploadNewsImageModal";
import strings from "../../localization/strings";
import { FileService } from "../../api/file.service";
import { Link } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import CKEditor from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

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
  permissionScopes: { [key: string]: ChatGroupPermissionScope | null },
  loading: boolean,
  saving: boolean,
  chatGroupId: number,
  chatGroup?: ChatGroup,
  chatThread?: ChatThread,
  title: string,
  imageUrl?: string,
  imageBase64?: string,
  galleryOpen: boolean,
  uploadModalOpen: boolean,
  date?: Date,
  answerType: ChatThread.AnswerTypeEnum,
  pollAllowOther?: boolean,
  pollAnswers: string[],
  description?: string
}

/**
 * Component for chat group edit
 */
class EditChatGroup extends React.Component<Props, State> {

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
      galleryOpen: false,
      answerType: "TEXT",
      pollAnswers: [""]
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
    const chatThreadsService = await Api.getChatThreadsService(this.props.keycloak.token);
    const chatGroupsService = await Api.getChatGroupsService(this.props.keycloak.token);

    const chatGroup = await chatGroupsService.findChatGroup(chatGroupId);
    if (!chatGroup) {
      throw new Error("Could not find chat group");
    }

    const chatThreads = await chatThreadsService.listChatThreads(chatGroup.id);

    if (chatThreads.length > 1) {
      throw new Error("Editor does not support multiple threads");
    } else if (!chatThreads.length) {
      throw new Error("Could not find a thread");
    }

    const chatThread = chatThreads[0];

    const chatGroupPermissions = await chatGroupsService.listChatGroupGroupPermissions(chatGroupId);
    const permissions = _.keyBy(chatGroupPermissions, "userGroupId");
    const permissionKeys = Object.keys(permissions);
    const permissionScopes = {};

    for (let i = 0; i < permissionKeys.length; i++) {
      permissionScopes[permissionKeys[i]] = permissions[permissionKeys[i]].scope || null;
    }

    const imageUrl = chatGroup.imageUrl || chatThread.imageUrl;

    await this.setState({
      userGroups: await userGroupsService.listUserGroups(),
      loading: false,
      permissionScopes: permissionScopes,
      imageUrl: imageUrl,
      title: chatGroup.title,
      chatThread: chatThread,
      pollAllowOther: chatThread.pollAllowOther,
      answerType: chatThread.answerType,
      date: chatThread.expiresAt && new Date(chatThread.expiresAt),
      description: chatThread.description,
      pollAnswers: chatThread.pollPredefinedTexts || [""]
    });
    this.handleAddNewInput();
    this.updateImageBase64(imageUrl);
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.loading || this.state.saving) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted>
              {this.state.saving ? "Tallentaa..." : "Ladataan..."}
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }

    return (
      <BasicLayout>
        <Form>
          <Form.Field>
            <Header as="h2"> {strings.questionGroupManagement} </Header>
          </Form.Field>
          <Form.Field>
            <label> {strings.title} </label>
            <Input onChange={this.onTitleChange} value={this.state.title} />
          </Form.Field>
          <Form.Field>
            <label>{strings.image}</label>
            <Button color="red" style={{ marginTop: "10px" }} onClick={() => this.setState({ galleryOpen: true })}>
              {strings.openGallery}
            </Button>
            <Button color="red" style={{ marginTop: "10px" }} onClick={() => this.setState({ uploadModalOpen: true })}>
              {strings.uploadImage}
            </Button>
            <div style={{ marginTop: "10px" }}>{this.renderImage()}</div>
          </Form.Field>
          <Form.Field>
            <label> {strings.answerType} </label>
            {this.renderDropDown()}
          </Form.Field>
          {
            this.state.answerType === "POLL" &&
            <React.Fragment>
              <Form.Field>
                <Header as="h5"> {strings.pollDescription} </Header>
              </Form.Field>
              <Form.Field>
                <CKEditor
                  editor={ClassicEditor}
                  data={this.state.description}
                  onChange={(e: any, editor: any) => {
                    const description = editor.getData();
                    this.setState({ description });
                  }}
                />
              </Form.Field>
              <Form.Field>
                <Header as="h5"> {strings.pollChoices} </Header>
              </Form.Field>
              <Form.Field>
                <p>{strings.insertPollChoicesBelow}</p>
                {this.renderAnswerInput()}
              </Form.Field>
              <Form.Field>
                {this.renderCheckBox()}
              </Form.Field>
              <Form.Field>
                <label> {strings.expireDate} </label>
                {this.renderDatePicker()}
              </Form.Field>
            </React.Fragment>
          }
          <Form.Field>
            <Header as="h3"> {strings.groupPermissions} </Header>
          </Form.Field>
          <Form.Field>
            {this.renderUserGroups()}
          </Form.Field>
          <Form.Field>
            <Button.Group floated="right">
              <Button inverted color="red" as={Link} to={"/chatManagement"}> {strings.back} </Button>
              <Button.Or text="" />
              <Button color="red" onClick={this.onSaveClick}> {strings.save} </Button>
            </Button.Group>
          </Form.Field>
        </Form>
        <ImageGallery
          modalOpen={this.state.galleryOpen}
          onCloseModal={() => this.setState({ galleryOpen: false })}
          onImageSelected={(url: string) => this.onImageSelected(url)}
        />
        <UploadNewsImageModal
          modalOpen={this.state.uploadModalOpen}
          onCloseModal={() => this.setState({ uploadModalOpen: false })}
          onImageSelected={(url: string) => this.onImageSelected(url)}
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
        <p style={{ color: "red", cursor: "pointer" }} onClick={() => this.setState({ imageBase64: undefined, imageUrl: undefined })}>{strings.deleteImage}</p>
      </div>)
    }

    return <div> {strings.noSelectedImage} </div>;
  }

  /**
  * Renders drop down
  */
  private renderDropDown = () => {

    const options = [{
      key: "TEXT",
      value: "TEXT",
      text: "Teksti (oletus)"
    }, {
      key: "POLL",
      value: "POLL",
      text: "Äänestys"
    }]
    return (
      <Dropdown
        fluid
        selection
        placeholder={this.state.answerType}
        value={this.state.answerType}
        options={options}
        onChange={(event: any, data: DropdownProps) =>
          this.setState({ answerType: data.value as ChatThread.AnswerTypeEnum })
        }
      />
    );
  }

  /**
   * Renders user groups
   */
  private renderUserGroups = () => {
    const roleOptions: DropdownItemProps[] = [{
      key: undefined,
      value: "NONE",
      text: strings.groupPermissionNONE
    }, {
      key: ChatGroupPermissionScope.ACCESS,
      value: ChatGroupPermissionScope.ACCESS,
      text: strings.groupPermissionACCESS
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
              <div key={userGroup.id} style={{ clear: "both", height: "40px" }}>
                <div style={{ float: "left" }}>{userGroup.name}</div>
                <div style={{ float: "right" }}><Select value={this.getUserGroupRoleValue(userGroup)} options={roleOptions} onChange={(event: React.SyntheticEvent<HTMLElement>, data: DropdownProps) => this.onChangeRole(userGroup.id!, data.value as string)} /></div>
              </div>
            );
          })
        }
      </div>
    );
  }

  /**
   * Renders date picker
   */
  private renderDatePicker = () => {
    return (
      <DatePicker
        onChange={(date: Date) => {
          this.setState({ date });
        }}
        selected={this.state.date}
      />
    );
  }

  /**
   * Renders checkbox
   */
  private renderCheckBox = () => {
    return (
      <Checkbox label='Salli muu vastaus' onChange={() => this.setState(prevState => ({ pollAllowOther: !prevState.pollAllowOther }))} checked={this.state.pollAllowOther} />
    );
  }

  /**
   * Renders answer input
   */
  private renderAnswerInput = () => {
    return (
      this.state.pollAnswers && this.state.pollAnswers.map((answer, index) => {
        return (
          <Form.Field key={index}>
            <Input value={this.state.pollAnswers[index]} onChange={(e, data) => this.handlePollAnswerChange(e, data, index)} onBlur={this.handleAddNewInput} />
          </Form.Field>
        );
      })
    );
  }

  /**
   * Handle on blur
   */
  private handlePollAnswerChange = (event: React.SyntheticEvent<HTMLInputElement>, data: InputOnChangeData, index: number) => {
    const pollAnswers = [... this.state.pollAnswers];
    pollAnswers[index] = data.value;
    this.setState({ pollAnswers });
  }

  /**
   * Handles adding a new input if needed
   */
  private handleAddNewInput = () => {
    const pollAnswers = [... this.state.pollAnswers];
    if (pollAnswers.length == 0) {
      pollAnswers.push("");
      this.setState({ pollAnswers: pollAnswers });
    }
    if (pollAnswers[pollAnswers.length - 1]) {
      pollAnswers.push("");
      this.setState({ pollAnswers: pollAnswers });
    }
  }

  /**
   * Returns user group role in group
   * 
   * @param userGroup user group
   * @returns user group role 
   */
  private getUserGroupRoleValue(userGroup: UserGroup) {
    return this.state.permissionScopes[userGroup.id!] || "NONE";
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
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.chatGroupId || !this.state.chatThread || !this.state.chatThread.id || !this.state.title) {
      return;
    }

    const chatGroupId = this.state.chatGroupId;

    this.setState({
      saving: true
    });

    const chatGroupsService = await Api.getChatGroupsService(this.props.keycloak.token);
    const chatThreadsService = await Api.getChatThreadsService(this.props.keycloak.token);

    const chatGroupPermissions = _.keyBy(await chatGroupsService.listChatGroupGroupPermissions(chatGroupId), "userGroupId");

    for (let i = 0; i < this.state.userGroups.length; i++) {
      const userGroup = this.state.userGroups[i];
      const userGroupId = userGroup.id!;
      const scope = this.state.permissionScopes[userGroupId];
      const existingPermission = chatGroupPermissions[userGroupId];

      if (!existingPermission || !existingPermission.id) {
        if (scope) {
          await chatGroupsService.createChatGroupGroupPermissions({
            chatGroupId: chatGroupId,
            scope: scope,
            userGroupId: userGroupId
          }, chatGroupId);
        }
      } else {
        if (scope) {
          await chatGroupsService.updateChatGroupGroupPermissions({ ...existingPermission, scope: scope }, chatGroupId, existingPermission.id);
        } else {
          await chatGroupsService.deleteChatGroupGroupPermission(chatGroupId, existingPermission.id);
        }
      }
    }

    const chatThreadId = this.state.chatThread.id;

    const chatGroup = await chatGroupsService.findChatGroup(this.state.chatGroupId);

    await chatGroupsService.updateChatGroup({ ...chatGroup, title: this.state.title, imageUrl: this.state.imageUrl }, this.state.chatGroupId);
    const pollPredefinedTexts = this.state.pollAnswers.filter((answer) => answer);
    const bodyload: ChatThread = {
      id: this.state.chatThread.id,
      groupId: this.state.chatThread.groupId,
      title: this.state.title,
      imageUrl: this.state.imageUrl,
      pollAllowOther: this.state.answerType === "POLL" ? this.state.pollAllowOther : false,
      expiresAt: this.state.answerType === "POLL" ? this.state.date : undefined,
      answerType: this.state.answerType,
      description: this.state.answerType === "POLL" ? this.state.description || "" : "",
      pollPredefinedTexts: this.state.answerType === "POLL" ? pollPredefinedTexts : undefined
    }
    
    await chatThreadsService.updateChatThread(bodyload, chatThreadId);
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

export default connect(mapStateToProps, mapDispatchToProps)(EditChatGroup);
