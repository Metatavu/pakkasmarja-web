import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import Api, { ChatGroup } from "pakkasmarja-client";
import { Header, Dimmer, Loader, Grid, Tab, TabPaneProps, TabProps, Confirm, Button } from "semantic-ui-react";
import { Redirect } from "react-router-dom";
import strings from "src/localization/strings";

type TabType = "CHAT" | "QUESTION";

interface Tab {
  type: TabType,
  label: string
}

const TABS: Tab[] = [{
  type: "CHAT",
  label: strings.chatGroups
}, {
  type: "QUESTION",
  label: strings.questionGroups
}];

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
  chatChatGroups: ChatGroup[],
  queryChatGroups: ChatGroup[],
  loading: boolean,
  activeTab: Tab,
  redirectTo?: string,
  deleteChatGroupConfirmOpen: boolean,
  deleteQuestionGroupConfirmOpen: boolean
}

/**
 * Class component for chat management list
 */
class ChatManagementList extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      chatChatGroups: [],
      queryChatGroups: [],
      loading: false,
      activeTab: TABS[0],
      deleteChatGroupConfirmOpen: false,
      deleteQuestionGroupConfirmOpen: false
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
   * Load products
   */
  private loadData = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ 
      loading: true
    });

    const chatGroupsService = await Api.getChatGroupsService(this.props.keycloak.token);
    const chatChatGroups = await chatGroupsService.listChatGroups("CHAT");
    const queryChatGroups = await chatGroupsService.listChatGroups("QUESTION");
    
    this.setState({ 
      chatChatGroups: chatChatGroups,
      queryChatGroups: queryChatGroups,
      loading: false
    });
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.loading) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted>
              { strings.loading }
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }
    
    if (this.state.redirectTo) {
      return (
        <Redirect to={ this.state.redirectTo } />
      );
    }

    const panes: TabPaneProps[] = TABS.map((tab) => {
      return { menuItem: tab.label, render: () =>  <Tab.Pane> { tab.type == "CHAT" ? this.renderChatGroups() : this.renderQuestionGroups() } </Tab.Pane> };
    });
    
    return (
      <BasicLayout
        onTopBarButtonClick={ this.onNewClick }
        topBarButtonText={ this.getNewButtonText() }
        pageTitle={ strings.chatManagement }>
        <Grid>
          <Grid.Row>
            <Grid.Column>
            <Header floated='left' className="contracts-header">
              <p>{ strings.chatManagement }</p>
            </Header>
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column>
              <Tab onTabChange={ this.onTabChange } panes={ panes } />
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </BasicLayout>
    );
  }

  /**
   * Renders chat groups
   */
  private renderChatGroups = () => {
    return (
      <Grid>
      {
        this.state.chatChatGroups.map((chatChatGroup) => {
          return (
            <Grid.Row key={ chatChatGroup.id }>
              <Grid.Column width={ 12 }>
                { chatChatGroup.title }
              </Grid.Column>
              <Grid.Column width={ 4 } style={{ textAlign: "right" }}>
                <Confirm onConfirm={ () => this.deleteChatGroup(chatChatGroup) } open={ this.state.deleteChatGroupConfirmOpen } size={"mini"} content={"Haluatko varmasti poistaa ryhmän?"} onCancel={ () => { this.setState({ deleteChatGroupConfirmOpen: false }); }} />
                <Button onClick={ () => this.setState({ redirectTo: `/editChatGroup/${chatChatGroup.id}` }) }> { strings.edit } </Button>
                <Button onClick={ () => this.setState({ deleteChatGroupConfirmOpen: true }) } negative>{ strings.delete }</Button>
              </Grid.Column>
            </Grid.Row>
          );
        })
      }
      </Grid>
    );
  }

  /**
   * Renders question groups
   */
  private renderQuestionGroups = () => {
    return (
      <Grid>        
      {
        this.state.queryChatGroups.map((queryChatGroup) => {;
          return (
            <Grid.Row key={ queryChatGroup.id }>
              <Grid.Column width={ 12 }>
                { queryChatGroup.title }
              </Grid.Column>
              <Grid.Column width={ 4 } style={{ textAlign: "right" }}>
              <Confirm onConfirm={ () => this.deleteQuestionGroup(queryChatGroup) } open={ this.state.deleteQuestionGroupConfirmOpen } size={"mini"} content={"Haluatko varmasti poistaa ryhmän?"} onCancel={ () => { this.setState({ deleteQuestionGroupConfirmOpen: false }); }} />
                <Button onClick={ () => this.setState({ redirectTo: `/editQuestionGroup/${queryChatGroup.id}` }) }> { strings.edit } </Button>
                <Button onClick={ () => this.setState({ deleteQuestionGroupConfirmOpen: true }) } negative>{ strings.delete }</Button>
              </Grid.Column>
            </Grid.Row>
          );
        })
      }
      </Grid>
    );
  }

  /**
   * Creates new chat group and redirect user to editor
   */
  private createNewChatGroup = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const chatGroupsService = await Api.getChatGroupsService(this.props.keycloak.token);
    const chatThreadsService = await Api.getChatThreadsService(this.props.keycloak.token);

    const chatGroup = await chatGroupsService.createChatGroup({
      type: "CHAT",
      title: strings.newChatGroupTitle
    });

    await chatThreadsService.createChatThread({
      groupId: chatGroup.id!,
      title: strings.newChatGroupTitle,
      answerType: "TEXT"
    });

    this.setState({
      redirectTo: `/editChatGroup/${chatGroup.id}`
    });
  }

  /**
   * Creates new question group and redirect user to editor
   */
  private createNewQuestionGroup = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const chatGroupsService = await Api.getChatGroupsService(this.props.keycloak.token);

    const chatGroup = await chatGroupsService.createChatGroup({
      type: "QUESTION",
      title: strings.newQuestionGroupTitle
    });

    this.setState({
      redirectTo: `/editQuestionGroup/${chatGroup.id}`
    });
  }

  /**
   * Returns new button text
   */
  private getNewButtonText(): string {
    if (this.state.activeTab.type == "CHAT") {
      return strings.newChatGroup;
    } else if (this.state.activeTab.type == "QUESTION") {
      return strings.newQuestionGroup;
    }

    return "";
  }

  /**
   * Deletes a chat group
   */
  private deleteQuestionGroup = async (chatGroup: ChatGroup) => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ 
      deleteQuestionGroupConfirmOpen: false,
      loading: true
    });

    const chatGroupsService = await Api.getChatGroupsService(this.props.keycloak.token);
    const chatThreadsService = await Api.getChatThreadsService(this.props.keycloak.token);

    const chatThreads = await chatThreadsService.listChatThreads(chatGroup.id!);
    for (let i = 0; i < chatThreads.length; i++) {
      await chatThreadsService.deleteChatThread(chatThreads[i].id!);
    }

    await chatGroupsService.deleteChatGroup(chatGroup.id!);

    const chatGroups = this.state.chatChatGroups.filter((chatChatGroup) => {
      return chatChatGroup.id !== chatGroup.id;
    });

    this.setState({
      chatChatGroups: chatGroups,
      loading: false
    });
  }

  /**
   * Deletes a chat group
   */
  private deleteChatGroup = async (chatGroup: ChatGroup) => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ 
      deleteChatGroupConfirmOpen: false,
      loading: true
    });

    const chatGroupsService = await Api.getChatGroupsService(this.props.keycloak.token);
    const chatThreadsService = await Api.getChatThreadsService(this.props.keycloak.token);

    const chatThreads = await chatThreadsService.listChatThreads(chatGroup.id!);
    for (let i = 0; i < chatThreads.length; i++) {
      await chatThreadsService.deleteChatThread(chatThreads[i].id!);
    }

    await chatGroupsService.deleteChatGroup(chatGroup.id!);

    const chatGroups = this.state.chatChatGroups.filter((chatChatGroup) => {
      return chatChatGroup.id !== chatGroup.id;
    });

    this.setState({
      chatChatGroups: chatGroups,
      loading: false
    });
  }

  /**
   * Event handler for tab change
   */
  private onTabChange = (event: React.MouseEvent<HTMLDivElement>, data: TabProps) => {
    const tab = TABS[data.activeIndex as number];
    this.setState({
      activeTab: tab
    });
  }

  /**
   * New button click handler
   */
  private onNewClick = () => {
    if (this.state.activeTab.type == "CHAT") {
      this.createNewChatGroup();
    } else if (this.state.activeTab.type == "QUESTION") {
      this.createNewQuestionGroup();
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

export default connect(mapStateToProps, mapDispatchToProps)(ChatManagementList);
