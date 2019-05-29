import * as React from "react";
import { connect } from "react-redux";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import * as actions from "../../actions/";
import Api, { Contact, ChatMessage, ChatThread, Unread } from "pakkasmarja-client";
import strings from "src/localization/strings";
import * as moment from "moment";
import { Segment, Comment, Icon, Button, Grid, Modal, Header, Divider, Loader } from "semantic-ui-react";
import AVATAR_PLACEHOLDER from "../../gfx/avatar.png";
import { FileService } from "src/api/file.service";
import { mqttConnection } from "src/mqtt";
import Textarea from 'react-textarea-autosize';
import Lightbox from 'react-image-lightbox';
import Dropzone from 'react-dropzone';
import 'react-image-lightbox/style.css';
import * as _ from "lodash";

const FAILSAFE_POLL_RATE = 5000;

/**
 * Component properties
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  threadId: number;
  onError?: (errorMsg: string) => void;
  onExit?: () => void;
  answerType: ChatThread.AnswerTypeEnum;
  unreads: Unread[],
  unreadRemoved: (unread: Unread) => void;
};

/**
 * Component state
 */
interface State {
  messages: MessageItem[],
  thread?: ChatThread,
  user?: Contact,
  userAvatar: string
  loading: boolean,
  pollAnswerLoading: boolean,
  open: boolean,
  pendingMessage: string
  pollAnswerMessage: string,
  openImage?: string
  addImageModalOpen: boolean,
  previousMessagesLoaded: boolean,
  pollAnswers: string[]
}

/**
 * Interface representing message item displayed in ui
 */
interface MessageItem {
  id: number,
  userName: string,
  userId: string,
  avatar: string,
  text: string
  image: string
  created: Date
}

/**
 * Component for displaying chat
 */
class Chat extends React.Component<Props, State> {

  private userLookup: Map<string, Contact>;
  private messagesEnd: any;
  private messagePoller: any;

  /**
   * Constructor
   * 
   * @param props component properties 
   */
  constructor(props: Props) {
    super(props);

    this.userLookup = new Map();
    this.state = {
      messages: [],
      pendingMessage: "",
      pollAnswerMessage: "",
      userAvatar: AVATAR_PLACEHOLDER,
      loading: false,
      pollAnswerLoading: false,
      open: true,
      addImageModalOpen: false,
      previousMessagesLoaded: false,
      pollAnswers: []
    };
  }

  /**
   * Component did mount life cycle method
   */
  public componentDidMount = async () => {
    const { threadId, keycloak } = this.props;
    if (!keycloak || !keycloak.token || !threadId) {
      return;
    }
    this.setState({ loading: true });
    try {
      const thread = await Api.getChatThreadsService(keycloak.token).findChatThread(threadId);
      const maxResult = thread.answerType === "POLL" ? 1 : 30;
      const chatMessages = await Api.getChatMessagesService(keycloak.token).listChatMessages(threadId, undefined, undefined, 0, maxResult);
      thread.answerType === "TEXT" && mqttConnection.subscribe("chatmessages", this.onMessage);
      const messages = await this.translateMessages(chatMessages);
      const user = await Api.getContactsService(keycloak.token).findContact(keycloak.subject || "");
      const userAvatar = user.avatarUrl && user.avatarUrl.indexOf("gravatar") > -1 ? user.avatarUrl : await this.loadImage(user.avatarUrl);
      if (messages[0] && thread.answerType === "POLL") {
        if (thread.pollPredefinedTexts && thread.pollPredefinedTexts.indexOf(messages[0].text) > -1) {
          this.setState({ pollAnswerMessage: messages[0].text });
        }
        else {
          if (messages[0].text) {
            this.setState({ pendingMessage: messages[0].text });
          }
        }
      }

      await this.removeUnreads(thread);

      await this.setState({
        messages: messages.reverse(),
        user: user,
        thread: thread,
        userAvatar: userAvatar,
        loading: false,
        pollAnswers: thread.pollPredefinedTexts || []
      });

      thread.answerType === "TEXT" && this.scrollToBottom();

    } catch (e) {
      console.log(e, "error");
      this.props.onError && this.props.onError(strings.errorCommunicatingWithServer);
      this.setState({
        loading: false
      })
    }
    this.state.thread && this.state.thread.answerType === "TEXT" && this.startPolling();
  }

  public componentWillUnmount = () => {
    this.stopPolling();
  }

  /**
   * Render
   */
  public render() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      this.props.onError && this.props.onError(strings.accessTokenExpired)
      return null;
    }

    if (this.state.pollAnswerLoading && this.state.thread && this.state.thread.answerType === "POLL") {
      return (
        <Segment.Group stacked>
          <Segment style={{ color: "#fff", background: "rgb(229, 29, 42)", display: "flex" }}>
            <span style={{ cursor: "pointer", display: "flex", flex: "0.9" }} onClick={this.toggleWindow}>
              {this.state.thread && this.state.thread.title ? this.state.thread.title : "Ladataan..."}
              {this.state.open ? (
                <Icon name="angle down" />
              ) : (
                  <Icon name="angle up" />
                )}
            </span>
            <Icon style={{ cursor: "pointer", display: "flex", flex: "0.1", justifyContent: "center" }} onClick={() => this.props.onExit && this.props.onExit()} name="window close outline" />
          </Segment>
          <Segment style={{
            display: this.state.open ? "block" : "none",
            overflow: "auto",
            minHeight: "300px",
            maxHeight: "400px"
          }}>
            <Loader size="small" active indeterminate >{"Viesti lähetetty, voit muokata vastausta lähettämällä uuden vastauksen!"}</Loader>
          </Segment>
        </Segment.Group>
      );
    }

    const messages = this.state.messages.map((message: MessageItem) => {
      return (
        <Comment key={message.id}>
          <Comment.Avatar src={message.avatar} />
          <Comment.Content>
            <Comment.Author>{message.userName}</Comment.Author>
            <Comment.Metadata>{moment(message.created).format("DD.MM.YYYY HH:mm:ss")}</Comment.Metadata>
            <Comment.Text>{message.image ? <img onClick={() => this.setState({ openImage: message.image })} style={{ width: "100%" }} src={message.image} /> : message.text}</Comment.Text>
          </Comment.Content>
        </Comment>
      );
    });

    return (
      <Segment.Group stacked>
        <Segment style={{ color: "#fff", background: "rgb(229, 29, 42)", display: "flex" }}>
          <span style={{ cursor: "pointer", display: "flex", flex: "0.9" }} onClick={this.toggleWindow}>
            {this.state.thread && this.state.thread.title ? this.state.thread.title : "Ladataan..."}
            {this.state.open ? (
              <Icon name="angle down" />
            ) : (
                <Icon name="angle up" />
              )}
          </span>
          <Icon style={{ cursor: "pointer", display: "flex", flex: "0.1", justifyContent: "center" }} onClick={() => this.props.onExit && this.props.onExit()} name="window close outline" />
        </Segment>
        {
          this.state.thread && this.state.thread.answerType == "TEXT" &&
          <Segment onScroll={this.handleScroll} style={{
            display: this.state.open ? "block" : "none",
            overflow: "auto",
            minHeight: "300px",
            maxHeight: "400px"
          }} loading={this.state.loading}>
            <Comment.Group>
              {messages}
            </Comment.Group>
            <div style={{ float: "left", clear: "both" }} ref={(el) => { this.messagesEnd = el; }}></div>
          </Segment>
        }
        {
          this.state.thread && this.state.thread.answerType === "POLL" &&
          <div style={{ display: this.state.open ? "block" : "none", padding: "8px 14px 20px 14px", background: "white" }}>
            <Divider style={{ margin: "7px 0px" }} horizontal>
              <Header as='h4'>
                <Icon color="red" name='clipboard list' />
                {"Kysely"}
              </Header>
            </Divider>
            {
              this.state.thread && this.state.thread.description &&
              <div dangerouslySetInnerHTML={{ __html: this.state.thread.description }} />
            }
            <p style={{ paddingTop: "8px" }}><i>{strings.lastDayToAnswer}{this.state.thread && moment(this.state.thread.expiresAt).format("DD.MM.YYYY")}</i></p>
            <Grid>
              {
                this.state.pollAnswers.map((answer) => {
                  return (
                    <Grid.Row key={answer} style={{ padding: "5px 0px 5px 0px" }} >
                      <Grid.Column>
                        <Segment className={this.state.pollAnswerMessage === answer ? "" : "open-modal-element"} onClick={() => this.handleMessageChange(undefined, answer)} style={this.state.pollAnswerMessage === answer ? { background: "rgb(229, 29, 42)", color: "white", padding: "9px" } : { padding: "9px" }}>
                          {answer}
                        </Segment>
                      </Grid.Column>
                    </Grid.Row>
                  );
                })}
              {
                this.state.thread && this.state.thread.pollAllowOther &&
                <Grid.Row style={{ padding: "5px 0px 5px 0px" }} >
                  <Grid.Column>
                    <Textarea value={this.state.pendingMessage} onChange={this.handleMessageChange} style={{ resize: "none", padding: "10px", borderRadius: "4px", width: "100%", boxShadow: "0 1px 2px 0 rgba(34,36,38,.15)", borderColor: "lightgrey" }} draggable={false} placeholder={this.state.thread && this.state.thread.answerType === "POLL" ? "Kirjoita muu vastaus..." : "Kirjoita viesti..."}></Textarea>
                  </Grid.Column>
                </Grid.Row>
              }
              <Grid.Row style={{ padding: "5px 0px 5px 0px" }} >
                <Grid.Column>
                  <Button title={strings.send} onClick={() => this.uploadMessage()} style={{ color: "#fff", background: "rgb(229, 29, 42)" }} fluid>
                    {strings.sendAnswer}
                  </Button>
                </Grid.Column>
              </Grid.Row>
            </Grid>
          </div>
        }
        {this.state.thread && this.state.thread.answerType == "TEXT" &&
          <Segment style={{ display: this.state.open ? "block" : "none" }}>
            <Grid columns="equal">
              <Grid.Column className="chat-footer" width={12}>
                <Textarea value={this.state.pendingMessage} onChange={(e) => this.handleMessageChange(e)} style={{ resize: "none", padding: "10px", borderRadius: "10px", width: "100%" }} draggable={false} placeholder="Kirjoita viesti..."></Textarea>
              </Grid.Column>
              <Grid.Column className="chat-footer" width={2}>
                <Button title={strings.addImageShort} onClick={() => this.setState({ addImageModalOpen: true })} style={{ color: "#fff", background: "rgb(229, 29, 42)" }} circular icon>
                  <Icon name="upload" />
                </Button>
              </Grid.Column>
              <Grid.Column className="chat-footer" width={2}>
                <Button title={strings.send} onClick={() => this.uploadMessage()} style={{ color: "#fff", background: "rgb(229, 29, 42)" }} circular icon>
                  <Icon name="paper plane" />
                </Button>
              </Grid.Column>
            </Grid>
          </Segment>
        }
        {this.state.openImage &&
          <Lightbox
            mainSrc={this.state.openImage}
            onCloseRequest={() => this.setState({ openImage: undefined })}
          />
        }
        <Modal
          open={this.state.addImageModalOpen}
          onClose={() => this.setState({ addImageModalOpen: false })}
          basic
        >
          <Header content="Lisää kuva" />
          <Modal.Content>
            <Dropzone activeStyle={{ border: "2px solid #62f442" }} style={{ border: "2px dashed #fff", width: "100%", cursor: "pointer", padding: "25px" }} onDrop={this.onFileDropped}>
              <h3>Lisää kuva raahaamalla tai klikkaamalla tästä.</h3>
            </Dropzone>
          </Modal.Content>
          <Modal.Actions>
            <Button color="red" onClick={() => this.setState({ addImageModalOpen: false })} inverted>
              <Icon name="window close outline" /> Peruuta
            </Button>
          </Modal.Actions>
        </Modal>
      </Segment.Group>
    );
  }

  /**
   * Starts failsafe message poller
   */
  private startPolling = () => {
    this.messagePoller = setInterval(() => {
      this.checkMessages();
    }, FAILSAFE_POLL_RATE);
  }

  /**
   * Counts unreads by group
   * 
   * @param group id
   * @return unreads
   */
  private removeUnreads = async (thread: ChatThread) => {
    const { keycloak } = this.props;
    
    if (!keycloak || !keycloak.token || !thread || !thread.id || !thread.groupId) {
      return;
    }

    const unreadsService = Api.getUnreadsService(keycloak.token);

    const unreads = this.props.unreads
      .filter((unread: Unread) => {
        const path = (unread.path || "");
        return path.startsWith(`chat-${thread.groupId}-${thread.id}-`);
      });

    await Promise.all(unreads.map(async (unread) => {
      this.props.unreadRemoved(unread);
      await unreadsService.deleteUnread(unread.id!)
    }));

  }

  /**
   * Checks if there is new messages available
   */
  private checkMessages = async () => {
    const latestMessage = this.getLatestMessage();
    const { threadId, keycloak } = this.props;
    if (!keycloak || !keycloak.token || !threadId) {
      return;
    }
    const chatMessages = await Api.getChatMessagesService(keycloak.token).listChatMessages(threadId, undefined, latestMessage.toDate());
    const messages = await this.translateMessages(chatMessages);
    this.setState((prevState: State) => {
      return {
        loading: false,
        messages: prevState.messages.concat(messages.reverse())
      }
    });
  }

  /**
   * Stops failsafe message poller
   */
  private stopPolling = () => {
    if (this.messagePoller) {
      clearInterval(this.messagePoller);
    }
  }

  /**
   * Handles file upload
   */
  private onFileDropped = async (files: File[] | File) => {
    const file = Array.isArray(files) ? files[0] : files;
    if (!file || !this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ loading: true, addImageModalOpen: false });

    const fileService = new FileService(process.env.REACT_APP_API_URL || "", this.props.keycloak.token);
    const fileUploadResponse = await fileService.uploadFile(file);

    const { user } = this.state;

    await Api.getChatMessagesService(this.props.keycloak.token).createChatMessage({
      image: fileUploadResponse.url,
      threadId: this.props.threadId,
      userId: user!.id
    }, this.props.threadId);

    this.setState({
      loading: false
    });
  }

  /**
   * Handles message content change
   */
  private handleMessageChange = (event?: React.ChangeEvent<HTMLTextAreaElement>, pollAnswerMessage?: string) => {
    if (pollAnswerMessage) {
      this.setState({
        pollAnswerMessage,
        pendingMessage: ""
      });
    }
    if (event) {
      this.setState({
        pendingMessage: event.target.value,
        pollAnswerMessage: ""
      });
    }
  }

  /**
   * Handles scrolling
   */
  private handleScroll = async (e: any) => {
    if (this.state.loading || this.state.previousMessagesLoaded) {
      return;
    }

    let element = e.target
    if (element.scrollTop < 50) {
      this.setState({ loading: true });
      const earliestMessage = this.getEarliestMessage();
      const { threadId, keycloak } = this.props;
      if (!keycloak || !keycloak.token || !threadId) {
        return;
      }
      const chatMessages = await Api.getChatMessagesService(keycloak.token).listChatMessages(threadId, earliestMessage.toDate(), undefined, 0, 20);
      const messages = await this.translateMessages(chatMessages);
      const reversedMessages = messages.reverse();
      const existingMessages = this.state.messages;
      existingMessages.unshift(...reversedMessages);
      this.setState({
        messages: existingMessages,
        previousMessagesLoaded: chatMessages.length === 0,
        loading: false
      });
    }
  }

  /**
   * Toggles the chat window open or closed
   */
  private toggleWindow = () => {
    const { open } = this.state;
    this.setState({
      open: !open
    });
  }

  /**
   * Scrolls to bottom of the chat window
   */
  private scrollToBottom = () => {
    setTimeout(() => this.messagesEnd.scrollIntoView({ behavior: "smooth" }), 50);
  }

  /**
   * Callback for receiving message from mqtt
   */
  private onMessage = async (mqttMessage: any) => {
    try {
      const data = JSON.parse(mqttMessage);
      if (data.threadId && data.threadId == this.props.threadId) {
        const latestMessage = this.getLatestMessage();
        const { threadId, keycloak } = this.props;
        if (!keycloak || !keycloak.token || !threadId) {
          return;
        }
        const chatMessages = await Api.getChatMessagesService(keycloak.token).listChatMessages(threadId, undefined, latestMessage.toDate());
        const messages = await this.translateMessages(chatMessages);
        this.setState((prevState: State) => {
          return {
            loading: false,
            messages: prevState.messages.concat(messages.reverse())
          }
        });
        this.scrollToBottom();
      }
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Return moment representing latest time message has arrived
   */
  private getLatestMessage = () => {
    let latestMessage = moment(0);
    this.state.messages.forEach((message) => {
      const messageMoment = moment(message.created);
      if (messageMoment.isAfter(latestMessage)) {
        latestMessage = messageMoment;
      }
    });

    return latestMessage;
  }

  /**
   * Return moment representing latest time message has arrived
   */
  private getEarliestMessage = () => {
    let earliestMessage = moment();
    this.state.messages.forEach((message) => {
      const messageMoment = moment(message.created);
      if (messageMoment.isBefore(earliestMessage)) {
        earliestMessage = messageMoment;
      }
    });

    return earliestMessage;
  }

  /**
 * Loads image
 */
  private loadImage = async (url?: string, defaultImage?: string) => {
    if (!url || !this.props.keycloak || !this.props.keycloak.token || !process.env.REACT_APP_API_URL) {
      return defaultImage || AVATAR_PLACEHOLDER;
    }

    const fileService = new FileService(process.env.REACT_APP_API_URL, this.props.keycloak.token);
    const imageData = await fileService.getFile(url);
    return `data:image/jpeg;base64,${imageData.data}`;
  }

  /**
   * Translates list of api messages to list of gifted chat messages
   * 
   * @param chatMessages messages to translate
   */
  private translateMessages = async (chatMessages: ChatMessage[]): Promise<MessageItem[]> => {
    const messagePromises = chatMessages.map(chatMessage => this.translateMessage(chatMessage));
    return await Promise.all(messagePromises);
  }

  /**
   * Translates api message to gifted chat message
   * 
   * @param chatMessage message to translate
   */
  private translateMessage = async (chatMessage: ChatMessage): Promise<MessageItem> => {
    const contact = await this.getMessageContact(chatMessage);
    return {
      id: chatMessage.id!,
      created: new Date(chatMessage.createdAt || 0),
      text: chatMessage.contents || "",
      image: chatMessage.image && chatMessage.image.indexOf("gravatar") > -1 ? chatMessage.image : chatMessage.image ? await this.loadImage(chatMessage.image) : undefined,
      userName: contact.displayName || "",
      userId: contact.id || "",
      avatar: contact.avatarUrl && contact.avatarUrl.indexOf("gravatar") > -1 ? contact.avatarUrl : await this.loadImage(contact.avatarUrl)
    }
  }

  /**
   * Resolves contact for chat message
   */
  private getMessageContact = async (chatMessage: ChatMessage): Promise<Contact> => {
    let contact = this.userLookup.get(chatMessage.userId!);
    if (contact) {
      return contact;
    }

    const { keycloak } = this.props;
    if (!keycloak || !keycloak.token) {
      return Promise.reject();
    }

    contact = await Api.getContactsService(keycloak.token).findContact(chatMessage.userId!);
    this.userLookup.set(chatMessage.userId!, contact);
    return contact;
  }

  /**
   * Uploads message to the server
   * 
   */
  private uploadMessage = async (): Promise<ChatMessage> => {
    const { threadId, keycloak } = this.props;
    if (!keycloak || !keycloak.token || !threadId) {
      return Promise.reject();
    }
    const { user } = this.state;

    this.setState({ loading: true, pollAnswerLoading: true });
    const messageService = await Api.getChatMessagesService(keycloak.token);
    const message = await messageService.createChatMessage({
      contents: this.state.pollAnswerMessage ? this.state.pollAnswerMessage : this.state.pendingMessage,
      threadId: threadId,
      userId: user!.id
    }, threadId);

    if (this.state.thread && this.state.thread.answerType === "TEXT") {
      this.setState({
        pollAnswerMessage: "",
        pendingMessage: "",
      });
    }
    this.setState({ loading: false });
    setTimeout(() => { this.setState({ pollAnswerLoading: false }) }, 4000);
    return message;
  }
}

/**
 * Redux mapper for mapping store state to component props
 * 
 * @param state store state
 */
function mapStateToProps(state: StoreState) {
  return {
    authenticated: state.authenticated,
    keycloak: state.keycloak,
    unreads: state.unreads
  };
}

/**
 * Redux mapper for mapping component dispatches 
 * 
 * @param dispatch dispatch method
 */
function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
    unreadRemoved: (unread: Unread) => dispatch(actions.unreadRemoved(unread))
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Chat);