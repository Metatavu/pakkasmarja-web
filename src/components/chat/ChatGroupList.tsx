import * as React from "react";
import { connect } from "react-redux";
import { StoreState, ConversationType } from "src/types";
import { Dispatch } from "redux";
import * as actions from "../../actions/";
import Api, { ChatGroup, Unread } from "pakkasmarja-client";
import strings from "src/localization/strings";
import { Item, Loader, Label } from "semantic-ui-react";
import AVATAR_PLACEHOLDER from "../../gfx/avatar.png";
import { FileService } from "src/api/file.service";
import * as _ from "lodash";

/**
 * Component properties
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  type: ConversationType,
  unreads: Unread[],
  onGroupSelected: (threadId: number) => void
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
  avatar: string,
  alt: string,
  title: string,
  subtitle: string,
  date?: Date
}

/**
 * Component for displaying list of available chat groups
 */
class ChatGroupList extends React.Component<Props, State> {

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
  public componentDidMount = async() => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    
    this.setState({loading: true});
    try {
      const chatGroupsService = await Api.getChatGroupsService(this.props.keycloak.token);
      const chatGroups = await chatGroupsService.listChatGroups(this.props.type);
      const conversationListItemPromises = chatGroups.map((chatGroup: ChatGroup) => this.loadConversationItem(chatGroup));
      const conversationListItems = await Promise.all(conversationListItemPromises);
      const sortedListItems = _.sortBy( conversationListItems, (group) => this.hasUnreadThreads(group.id!)).reverse(); 
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
        <Item key={conversationListItem.id} onClick={() => this.selectGroup(conversationListItem.id)} style={{ cursor: "pointer" }}>
          <Item.Image avatar style={{width:"45px"}} src={conversationListItem.avatar} />
          <Item.Content>
            { this.renderChatHeader(conversationListItem) }
            <Item.Meta>{conversationListItem.subtitle}</Item.Meta>
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
    const unreadCount = this.countUnreadsByGroup(conversationListItem.id);
    const text = conversationListItem.title.length > 30 ? `${conversationListItem.title.substring(0, 30)}...` : conversationListItem.title;

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
  private countUnreadsByGroup = (groupId: number) => {
    return this.props.unreads.filter((unread: Unread) => {
      return (unread.path || "").startsWith(`chat-${groupId}-`);
    }).length;
  }

  /**
   * Check if unread
   * 
   * @param groupId groupId
   * @returns returns true if group has unreads
   */
  private hasUnreadThreads = (groupId: number) => {
    if(!this.props.unreads){
      return false;
    }
    return !!this.props.unreads.find((unread: Unread) => {
      return (unread.path || "").startsWith(`chat-${groupId}-`);
    });
  }

  /**
   * Loads conversation item
   */
  private loadConversationItem = async (chatGroup: ChatGroup): Promise<ConversationListItem> => {
    const conversationItem: ConversationListItem = {
      id: chatGroup.id!,
      avatar: await this.loadThreadImage(chatGroup),
      alt: "Avatar",
      title: chatGroup.title,
      subtitle: ""
    };

    if (!this.props.keycloak || !this.props.keycloak.token) {
      return conversationItem;
    }

    //TODO: fix
    /*const chatMessagesService = await Api.getChatMessagesService(this.props.keycloak.token);
    const latestMessage = await chatMessagesService.listChatMessages(chatGroup.id!, undefined, undefined, 0, 1);
    if (latestMessage[0]) {
      conversationItem.date = latestMessage[0].updatedAt,
      conversationItem.subtitle = latestMessage[0].contents || ""
    }*/

    return conversationItem;
  } 

  /**
   * Loads thread image
   */
  private loadThreadImage =  async (chatGroup: ChatGroup) => {
    if (!chatGroup.imageUrl || !this.props.keycloak || !this.props.keycloak.token || !process.env.REACT_APP_API_URL) {
      return AVATAR_PLACEHOLDER;
    }

    const fileService = new FileService(process.env.REACT_APP_API_URL, this.props.keycloak.token);
    const imageData = await fileService.getFile(chatGroup.imageUrl);
    return `data:image/jpeg;base64,${imageData.data}`;
  }

  /**
   * Opens chat
   */
  private selectGroup = async (chatGroupId: number) => {
    this.props.onGroupSelected(chatGroupId);
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
    unreadRemoved: dispatch
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChatGroupList);