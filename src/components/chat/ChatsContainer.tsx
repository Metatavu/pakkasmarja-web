import * as React from "react";
import * as actions from "../../actions";
import { StoreState, ChatWindow, ConversationType } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "./styles.css";
import ChatIndex from "./ChatIndex";
import Chat from "./Chat";
import { Segment, Icon, Label, Button, Input, InputOnChangeData } from "semantic-ui-react";
import Api, { ChatGroup, ChatThread, Unread } from "pakkasmarja-client";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  chats: ChatWindow[];
  unreads: Unread[],
  chatOpen: (chat: ChatWindow) => void;
  chatClose: (chat: ChatWindow) => void;
}

/**
 * Interface for component state
 */
interface State {
  open: boolean;
  searchOpen: boolean;
  chatGroup?: ChatGroup;
  searchString: string;
}

/**
 * Page for chat index
 */
class ChatsContainer extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      open: false,
      searchOpen: false,
      searchString: ""
    };
  }

  /*
   * Render
   */
  public render() {
    const { chatGroup, searchOpen, open, searchString } = this.state;
    const chatWindows = this.props.chats.map((chatWindow, index) => {
      return (
        <div key={chatWindow.threadId} style={{ width: "350px", position: "fixed", bottom: "0", right: `${((index + 1) * 365)}px` }}>
          <Chat onExit={() => this.closeChat(chatWindow.threadId)} threadId={chatWindow.threadId} answerType={chatWindow.answerType} conversationType={chatWindow.conversationType}/>
        </div>
      );
    });

    const chatTitle = chatGroup ?
      `Keskustelu / ${ chatGroup.title }` :
      "Keskustelu";

    return (
      <div className="chat-container" style={{ position: "fixed", right: "10px", bottom: "0", width: "350px", zIndex: 999 }}>
        <Segment.Group stacked>
          <Segment style={{ color: "#fff", background: "rgb(229, 29, 42)", cursor: "pointer" }} >
            { chatGroup &&
              <Button
                color="black"
                size="mini"
                onClick={ this.resetChatGroupId }
                icon="angle left"
              />
            }
            <span style={{ paddingLeft: "3px", cursor: "pointer" }} onClick={ this.toggleWindow }>
              { chatTitle }
              <Icon name={ open ? "angle down" : "angle up" }/>
              { this.renderUnreads() }
            </span>
            { open &&
              <span onClick={ this.toggleSearch } style={{ cursor: "pointer", float: "right" }}>
                <Icon name="search" />
              </span>
            }
            { open && searchOpen && 
              <div style={{ paddingTop: 5 }}>
                <Input
                  onChange={ this.onSearchStringChange }
                  value={ searchString }
                  size="mini"
                  fluid
                />
              </div>
            }
          </Segment>
          <div style={ this.state.open ? {} : { display: "none" } }>
            <ChatIndex
              search={ searchOpen ? searchString : "" }
              onResetChatGroupId={ this.resetChatGroupId }
              chatGroup={ chatGroup }
              onChatGroupSelected={ this.onSelectGroup }
              onChatThreadSelected={ this.onSelectThread }
            />
          </div>
        </Segment.Group>
        {chatWindows}
      </div>
    )
  }

  /**
   * Search input change handler
   * 
   * @param event change event
   * @param data event data
   */
  private onSearchStringChange = (event: React.SyntheticEvent<HTMLInputElement>, data: InputOnChangeData) => {
    this.setState({ searchString: data.value });
  }

  /**
   * Render unreads label if needed
   */
  private renderUnreads = () => {
    if (!this.props.unreads.length) {
      return null;
    }

    const unreadChats = this.props.unreads.filter((unread: Unread) => {
      return (unread.path || "").startsWith("chat");
    });    

    return (
      <div style={{ float: "right" }}>
        <Label color='black' circular size="mini"> { unreadChats.length } </Label>
      </div>
    );
  }

  /**
   * Reset chat group id
   */
  private resetChatGroupId = () => {
    this.setState({ chatGroup: undefined });
  }

  /**
   * Closes chat with thread id
   */
  private closeChat = (threadId: number) => {
    const chatToClose = this.props.chats.find(chatWindow => chatWindow.threadId === threadId);
    if (chatToClose) {
      this.props.chatClose(chatToClose);
    }
  }

  /**
   * Toggles window
   */
   private toggleSearch = () => {
    this.setState({ searchOpen: !this.state.searchOpen });
  }

  /**
   * Toggles window
   */
  private toggleWindow = () => {
    const { open } = this.state;
    this.setState({
      open: !open
    });
  }

  /**
   * Group selection handler
   */
  private onSelectGroup = (chatGroupId: number) => {
    const { keycloak } = this.props;
    if (!keycloak?.token) {
      return;
    }

    Api
      .getChatGroupsService(keycloak.token)
      .findChatGroup(chatGroupId)
      .then(chatGroup => this.setState({ chatGroup }));

  }

  /**
   * Thread select handler
   */
  private onSelectThread = (chatThreadId: number, answerType: ChatThread.AnswerTypeEnum, conversationType: ConversationType) => {
    const { chats } = this.props;
    let found = false;
    chats.forEach((chatWindow) => {
      if (chatWindow.threadId === chatThreadId) {
        chatWindow.open = true;
        found = true;
      }
    });

    if (!found) {
      this.props.chatOpen({
        open: true,
        threadId: chatThreadId,
        answerType,
        conversationType: conversationType
      });
    }
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
    keycloak: state.keycloak,
    chats: state.openChats,
    unreads: state.unreads
  }
}

/**
 * Redux mapper for mapping component dispatches 
 * 
 * @param dispatch dispatch method
 */
export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
    chatOpen: (chat: ChatWindow) => dispatch(actions.chatOpen(chat)),
    chatClose: (chat: ChatWindow) => dispatch(actions.chatClose(chat))
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChatsContainer);
