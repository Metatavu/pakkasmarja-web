import * as React from "react";
import * as actions from "../../actions";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "./styles.css";
import ChatIndex from "./ChatIndex";
import Chat from "./Chat";
import { Segment, Icon } from "semantic-ui-react";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
}

/**
 * Interface for component state
 */
interface State {
  chats: ChatWindow[]
  open: boolean
  chatGroupId?: number
}

/**
 * Interface representing chat window
 */
interface ChatWindow {
  open: boolean,
  threadId: number
}

/**
 * Page for chat index
 */
class ChatsContainer extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      chats: [],
      open: false
    };
  }

  /**
   * Render
   */
  public render() {
    const chatWindows = this.state.chats.map((chatWindow, index) => {
      return (
        <div key={chatWindow.threadId} style={{ width: "350px", position: "fixed", bottom: "0", right: `${((index + 1) * 365)}px` }}>
          <Chat onExit={() => this.closeChat(chatWindow.threadId)} threadId={chatWindow.threadId} />
        </div>
      );
    });

    return (
      <div className="chat-container" style={{ position: "fixed", right: "10px", bottom: "0", width: "350px" }}>
        <Segment.Group stacked>
          <Segment style={{ color: "#fff", background: "rgb(229, 29, 42)" }}>
            <span onClick={this.toggleWindow}>
              Keskustelu
            {this.state.open ? (
                <Icon name="angle down" />
              ) : (
                  <Icon name="angle up" />
                )}
            </span>
            {
              this.state.chatGroupId &&
              <div className="chat-back-button" onClick={this.resetChatGroupId}></div>
            }
          </Segment>
          {this.state.open && <ChatIndex onResetChatGroupId={this.resetChatGroupId} chatGroup={this.state.chatGroupId} onChatGroupSelected={this.onSelectGroup} onChatThreadSelected={this.onSelectThread} />}
        </Segment.Group>
        {chatWindows}
      </div>
    )
  }

  /**
   * Reset chat group id
   */
  private resetChatGroupId = () =>{
    this.setState({ chatGroupId: undefined })
  }

  /**
   * Closes chat with thread id
   */
  private closeChat = (threadId: number) => {
    const openChats = this.state.chats.filter(chatWindow => chatWindow.threadId != threadId);
    this.setState({
      chats: openChats
    });
  }

  /**
   * Toggles window
   */
  private toggleWindow = () => {
    const {open} = this.state;
    this.setState({
      open: !open
    });
  }

  /**
   * Group selection handler
   */
  private onSelectGroup = (chatGroupId: number) => {
    this.setState({
      chatGroupId: chatGroupId
    });
  }

  /**
   * Thread select handler
   */
  private onSelectThread = (chatThreadId: number) => {
    const { chats } = this.state;
    let found = false;
    chats.forEach((chatWindow) => {
      if (chatWindow.threadId === chatThreadId) {
        chatWindow.open = true;
        found = true;
      }
    });

    if (!found) {
      chats.push({
        open: true,
        threadId: chatThreadId
      });
    }

    this.setState({
      chats: chats
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

export default connect(mapStateToProps, mapDispatchToProps)(ChatsContainer);