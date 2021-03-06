import * as React from "react";
import { connect } from "react-redux";
import { StoreState, ConversationType } from "src/types";
import { Dispatch } from "redux";
import * as actions from "../../actions/";
import Api, { ChatGroup, ChatThread, Unread } from "pakkasmarja-client";
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
  group?: ChatGroup,
  type: ConversationType,
  unreads: Unread[],
  onThreadSelected: (threadId: number, answerType: ChatThread.AnswerTypeEnum, type: ConversationType) => void
  onBackClick?: () => void
  onError?: (errorMsg: string) => void
  search: string
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
    const { group, keycloak } = this.props;
    const prevGroupId = prevProps.group?.id;
    const currentGroupId = group?.id;
    const wasLoggedIn = prevProps.keycloak?.token;
    const isLoggedIn = keycloak?.token;
    if(prevGroupId != currentGroupId || prevProps.type != this.props.type || wasLoggedIn !== isLoggedIn ){
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

    this.setState({ loading: true });
    const { group } = this.props;
    try {
      const chatThreadsService = Api.getChatThreadsService(this.props.keycloak.token);
      const chatThreads = await chatThreadsService.listChatThreads(group?.id, this.props.type);

      const validChatThreads = chatThreads.filter(thread =>
        thread.expiresAt ?
          moment(moment().format("YYYY-MM-DDTHH:mm:ss.SSSSZ")).isBefore(moment(thread.expiresAt)) :
          true
      );

      const conversationListItemPromises = validChatThreads.map(chatThread => this.loadConversationItem(chatThread));
      const conversationListItems = await Promise.all(conversationListItemPromises);

      const itemsWithUnreads = conversationListItems.filter(({ groupId, id }) => this.hasUnreadMessages(groupId, id!));
      const itemsWithoutUnreads = conversationListItems.filter(({ groupId, id }) => !this.hasUnreadMessages(groupId, id!));

      const sortedItems = [
        ...itemsWithUnreads.sort(this.sortItems),
        ...itemsWithoutUnreads.sort(this.sortItems)
      ];

      this.setState({
        conversationListItems: sortedItems,
        loading: false
      });
    } catch (e) {
      this.props.onError && this.props.onError(strings.errorCommunicatingWithServer);
      this.setState({ loading: false });
    }
  }

  /**
   * Search filter
   * 
   * @param item conversation list item
   * @returns boolean indicating if item should be filtered or not
   */
  private searchFilter = (item: ConversationListItem): boolean => {
    const { search } = this.props;
    if (!search) {
      return true;
    }

    return item.title.split(" ").some(word => word.toLowerCase().startsWith(search.toLowerCase()));
  }

  /**
   * Render
   */
  public render() {
    const { conversationListItems } = this.state;
    const conversations = conversationListItems
      .filter(this.searchFilter)
      .map(conversationListItem =>
        <Item
          key={ conversationListItem.id }
          onClick={ () => this.selectThread(conversationListItem.id, conversationListItem.answerType, this.props.type) }
          style={{ cursor: "pointer" }}
        >
          <Item.Image
            avatar
            style={{ width: 45 }}
            src={ conversationListItem.avatar }
          />
          <Item.Content>
            { this.renderChatHeader(conversationListItem) }
            { conversationListItem.answerType === "TEXT" ?
              <Item.Meta>{ conversationListItem.subtitle }</Item.Meta> :
              "- KYSELY -"
            }
            { conversationListItem.date &&
              <Item.Extra>
                { moment(conversationListItem.date).format("DD.MM.YYYY HH:mm:ss") }
              </Item.Extra>
            }
          </Item.Content>
        </Item>
      );

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
      <span className="chat-header">
        { text }
        { unreadCount ? <div style={{ float: "right", marginRight: "5px" }}> <Label color='black' circular size="mini"> { unreadCount } </Label> </div> : null }
      </span>
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
    const latestMessage = await chatMessagesService.listChatMessages(chatThread.id!, undefined, undefined, undefined, 0, 1);
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
  private selectThread = async (chatThreadId: number, answerType: ChatThread.AnswerTypeEnum, conversationType: ConversationType) => {
    this.props.onThreadSelected(chatThreadId, answerType, conversationType);
  }

  /**
   * Sorts conversation list items by date and time
   *
   * @param a item a
   * @param b item b
   */
  private sortItems = (a: ConversationListItem, b: ConversationListItem) => {
    return !a.date && !b.date ?
      this.sortTitlesAsc(a.title, b.title) :
      this.sortDatesDesc(a.date, b.date);
  }

  /**
   * Sorts titles ascending
   *
   * @param a title a
   * @param b title b
   */
  private sortTitlesAsc = (a: string, b: string) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
  }

  /**
   * Sorts dates descending
   *
   * @param a date a
   * @param b date b
   */
  private sortDatesDesc = (a?: Date, b?: Date) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return moment(b).diff(a);
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
