import * as React from "react";
import { connect } from "react-redux";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import * as actions from "../../actions/";
import Api, { ChatThread, Unread } from "pakkasmarja-client";
import strings from "src/localization/strings";
import { Item, Loader, Label } from "semantic-ui-react";
import AVATAR_PLACEHOLDER from "../../gfx/avatar.png";
import { FileService } from "src/api/file.service";
import * as moment from "moment";
import * as _ from "lodash";

/**
 * Component properties
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  groupId?: number,
  type: "CHAT" | "QUESTION",
  unreads: Unread[],
  onThreadSelected: (threadId: number, answerType: ChatThread.AnswerTypeEnum) => void
  onBackClick?: () => void
  onError?: (errorMsg: string) => void
};

/**
 * Component state
 */
interface State {
  loading: boolean,
  conversationListItems: ConversationListItem[]
};

/**
 * Conversation list item
 */
interface ConversationListItem {
  id: number,
  groupId: number,
  avatar: string,
  alt: string,
  title: string,
  subtitle: string,
  date?: Date,
  unread: number,
  answerType: ChatThread.AnswerTypeEnum
}

/**
 * Component for displaying list of available chat groups
 */
class ChatThreadList extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props component properties 
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      loading: false,
      conversationListItems: []
    };
  }

  /**
   * Component did mount life cycle method
   */
  public componentDidUpdate = async (prevProps: Props) => {
    if(prevProps.groupId != this.props.groupId || prevProps.type != this.props.type){
      if (!this.props.keycloak || !this.props.keycloak.token) {
        return;
      }
      this.loadData();
    }
  }

  /**
   * Component did mount life cycle method
   */
  public componentDidMount = async() => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    this.loadData();
  }

  /**
   * Load data
   */
  private loadData = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    this.setState({loading: true});
    try {
      const chatThreadsService = await Api.getChatThreadsService(this.props.keycloak.token);
      const chatThreads = await chatThreadsService.listChatThreads(this.props.groupId, this.props.type);
      const conversationListItemPromises = chatThreads.map((chatThread: ChatThread) => this.loadConversationItem(chatThread));
      const conversationListItems = await Promise.all(conversationListItemPromises);
      const sortedListItems = _.sortBy( conversationListItems, (thread) => this.hasUnreadMessages( thread.groupId , thread.id! )).reverse();;
      this.setState({
        conversationListItems: sortedListItems,
        loading: false
      });
    } catch (e) {
      this.props.onError && this.props.onError(strings.errorCommunicatingWithServer);
      this.setState({
        loading: false,
      });
    }
  }

  /**
   * Render
   */
  public render() {
    const conversations = this.state.conversationListItems.map((conversationListItem) => {
      return (
        <Item key={conversationListItem.id} onClick={() => this.selectThread(conversationListItem.id, conversationListItem.answerType)}>
          <Item.Image avatar style={{width:"45px"}} src={conversationListItem.avatar} />
          <Item.Content>
            { this.renderChatHeader(conversationListItem) }
            {conversationListItem.answerType === "TEXT" ? <Item.Meta>{conversationListItem.subtitle}</Item.Meta> : "- KYSELY -"}
            <Item.Extra>{moment(conversationListItem.date).format("DD.MM.YYYY HH:mm:ss")}</Item.Extra>
          </Item.Content>
        </Item>
      )
    });

    return (
      <div style={{minHeight: "400px", maxHeight: "500px", overflow: "auto"}}>
        { this.state.loading ? (
          <Loader size="small" active />
        ) : (
          <Item.Group>
            {conversations}
          </Item.Group>
        )}
      </div>
    );
  }

  /**
   * Renders chat header
   * 
   * @param conversationListItem list item
   */
  private renderChatHeader = (conversationListItem: ConversationListItem) => {
    const unreadCount = this.countUnreads(conversationListItem.groupId, conversationListItem.id);
    const text = (conversationListItem.title.length > 30 ? `${conversationListItem.title.substring(0, 30)}...` : conversationListItem.title);

    return (
      <p className="chat-header"> 
        { text }
        { unreadCount ? <div style={{ float: "right", marginRight: "5px" }}> <Label color='black' circular size="mini"> { unreadCount } </Label> </div> : null }
      </p>
    );
  }

  /**
   * Counts unreads by group
   * 
   * @param group id
   * @return unreads
   */
  private countUnreads = (groupId: number, threadId: number) => {
    return this.props.unreads.filter((unread: Unread) => {
      return (unread.path || "").startsWith(`chat-${groupId}-${threadId}-`);
    }).length;
  }

  /**
   * Check if unread
   * 
   * @param groupId groupId
   * @param threadId threadId
   */
  private hasUnreadMessages = (groupId: number, threadId: number) => {
    if(!this.props.unreads){
      return false;
    }
    return !!this.props.unreads.find((unread: Unread) => {
      return (unread.path || "").startsWith(`chat-${groupId}-${threadId}-`);
    });
  }

  /**
   * Loads conversation item
   */
  private loadConversationItem = async (chatThread: ChatThread): Promise<ConversationListItem> => {
    const conversationItem: ConversationListItem = {
      id: chatThread.id!,
      groupId: chatThread.groupId,
      avatar: await this.loadThreadImage(chatThread),
      alt: "Avatar",
      title: chatThread.title,
      subtitle: "",
      unread: 0,
      answerType: chatThread.answerType
    };

    if (!this.props.keycloak || !this.props.keycloak.token) {
      return conversationItem;
    }

    const chatMessagesService = await Api.getChatMessagesService(this.props.keycloak.token);
    const latestMessage = await chatMessagesService.listChatMessages(chatThread.id!, undefined, undefined, 0, 1);
    if (latestMessage[0]) {
      conversationItem.date = latestMessage[0].updatedAt,
      conversationItem.subtitle = latestMessage[0].contents || ""
    }

    return conversationItem;
  } 

  /**
   * Loads thread image
   */
  private loadThreadImage =  async (chatThread: ChatThread) => {
    if (!chatThread.imageUrl || !this.props.keycloak || !this.props.keycloak.token || !process.env.REACT_APP_API_URL) {
      return AVATAR_PLACEHOLDER;
    }

    const fileService = new FileService(process.env.REACT_APP_API_URL, this.props.keycloak.token);
    const imageData = await fileService.getFile(chatThread.imageUrl);
    return `data:image/jpeg;base64,${imageData.data}`;
  }

  /**
   * Opens chat
   */
  private selectThread = async (chatThreadId: number, answerType: ChatThread.AnswerTypeEnum) => {
    this.props.onThreadSelected(chatThreadId, answerType);
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
  return {};
}

export default connect(mapStateToProps, mapDispatchToProps)(ChatThreadList);