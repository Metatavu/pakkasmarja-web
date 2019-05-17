import * as React from "react";
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import { Tab } from "semantic-ui-react";
import ChatThreadList from "./ChatThreadList";
import ChatGroupList from "./ChatGroupList";
import { ChatThread } from "pakkasmarja-client";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  onChatThreadSelected: (chatThreadId: number, answerType: ChatThread.AnswerTypeEnum) => void
  onChatGroupSelected: (chatGroup: number) => void
  onResetChatGroupId: () => void;
  chatGroup?: number
}

/**
 * Interface for component state
 */
interface State {
  loading: boolean;
  redirectTo?: string
}

/**
 * Page for chat index
 */
class ChatIndex extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      loading: false
    };
  }

  /**
   * Renders chat tab
   */
  private renderChatTab = (): JSX.Element => {
    this.props.onResetChatGroupId();
    return (
      <Tab.Pane attached='bottom'>
        <ChatThreadList onThreadSelected={this.props.onChatThreadSelected} type="CHAT" />
      </Tab.Pane>
    );
  }

  /**
   * Renders question tab
   */
  private renderQuestionTab = (): JSX.Element => {
    return (
      <Tab.Pane attached='bottom'>
        {this.props.chatGroup ? (
          <ChatThreadList groupId={this.props.chatGroup} onThreadSelected={this.props.onChatThreadSelected} type="QUESTION" />
        ) : (
            <ChatGroupList onGroupSelected={(chatGroupId: number) => this.props.onChatGroupSelected(chatGroupId)} type="QUESTION" />
          )}
      </Tab.Pane>
    );
  }

  /**
   * Render
   */
  public render() {
    return (
      <Tab
        menu={{ color:"red", attached: 'top', fluid: true, secondary: true, pointing: true }}
        panes={[
          { menuItem: "Ryhmäkeskustelu", render: this.renderChatTab },
          { menuItem: "Kysymykset", render: this.renderQuestionTab }
        ]} />
    );
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

export default connect(mapStateToProps, mapDispatchToProps)(ChatIndex);