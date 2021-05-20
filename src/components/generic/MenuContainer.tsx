import * as React from "react";
import { Link } from "react-router-dom";
import strings from "../../localization/strings";
import { KeycloakInstance } from "keycloak-js";
import {
  Menu,
  Dropdown,
  Container,
  Label,
  Icon
} from "semantic-ui-react"
import { ChatWindow, StoreState } from "../../types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import * as actions from "../../actions/";
import ApplicationRoles from "src/utils/application-roles";
import Api, { ChatGroupType, ChatThread, Unread } from "pakkasmarja-client";
import AppConfig from "src/utils/AppConfig";

interface Props {
  authenticated: boolean;
  keycloak?: KeycloakInstance;
  onLogout?: () => void;
  chatOpen: (chat: ChatWindow) => void;
  unreads: Unread[];
}

interface State {
}

class MenuContainer extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
    };
  }

  public render() {
    const { authenticated, keycloak } = this.props;

    const unreadNews = this.countUnreads("news-");

    return (
      <Container>
        <Menu style={{backgroundColor: "#E51D2A", color: "#fff"}} inverted secondary>
          <Menu.Item as="div">
            <Link to="/news">{strings.news}</Link>
            { unreadNews ? <Label color='black' circular size="mini"> { unreadNews } </Label> : null }
          </Menu.Item>
          <Menu.Item as="div">
            <Link to="/deliveries">{strings.deliveries}</Link>
          </Menu.Item>
          <Menu.Item as="div">
            <Link to="/contracts">{strings.contracts}</Link>
          </Menu.Item>
          { authenticated && keycloak && keycloak.hasRealmRole(ApplicationRoles.UPDATE_OTHER_DELIVERIES) &&
            <Menu.Menu>
              <Dropdown item simple text="Vastaanotto">
                <Dropdown.Menu>
                  { keycloak.hasRealmRole(ApplicationRoles.RECEIVE_FRESH_BERRIES) &&
                    <Dropdown.Item to="/manageFreshDeliveries" as={Link}>Tuore toimitukset</Dropdown.Item>
                  }
                  { keycloak.hasRealmRole(ApplicationRoles.RECEIVE_FROZEN_BERRIES) &&
                    <Dropdown.Item to="/manageFrozenDeliveries" as={Link}>Pakaste toimitukset</Dropdown.Item>
                  }
                </Dropdown.Menu>
              </Dropdown>
            </Menu.Menu>
          }
          { authenticated && keycloak && this.showManagement(keycloak) &&
            <Menu.Menu>
              <Dropdown item simple text="Hallinta">
                <Dropdown.Menu>
                  { keycloak.hasRealmRole(ApplicationRoles.CREATE_CHAT_GROUPS) &&
                    <Dropdown.Item to="/chatManagement" as={Link}>{strings.chatManagement}</Dropdown.Item>
                  }
                  { keycloak.hasRealmRole(ApplicationRoles.CREATE_PRODUCTS) &&
                    <Dropdown.Item to="/productsManagement" as={Link}>{strings.productsManagement}</Dropdown.Item>
                  }
                  { keycloak.hasRealmRole(ApplicationRoles.CREATE_ITEM_GROUPS) &&
                    <Dropdown.Item to="/itemGroupsManagement" as={Link}>{strings.itemGroupsManagement}</Dropdown.Item>
                  }
                  { keycloak.hasRealmRole(ApplicationRoles.UPDATE_OTHER_CONTRACTS) &&
                    <Dropdown.Item to="/contractManagement" as={Link}>{strings.contractManagement}</Dropdown.Item>
                  }
                  { keycloak.hasRealmRole(ApplicationRoles.MANAGE_DELIVERY_QUALITIES) &&
                    <Dropdown.Item to="/manageQualities" as={Link}>{strings.qualityManagement}</Dropdown.Item>
                  }
                  { keycloak.hasRealmRole(ApplicationRoles.CREATE_OPERATIONS) &&
                    <Dropdown.Item to="/operationsManagement" as={Link}>{strings.operations}</Dropdown.Item>
                  }
                  { (keycloak.hasRealmRole(ApplicationRoles.MANAGE_OPENING_HOURS) ||
                     keycloak.hasRealmRole(ApplicationRoles.ADMINISTRATE_OPENING_HOURS)) &&
                    <Dropdown.Item to="/manageOpeningHours" as={Link}>{strings.openingHoursManagement}</Dropdown.Item>
                  }
                </Dropdown.Menu>
              </Dropdown>
            </Menu.Menu>
          }
          <Menu.Item as="div">
            <Link to="/databank">{strings.databank}</Link>
          </Menu.Item>
          { authenticated && keycloak &&
            <Menu.Item onClick={ () => this.onHelpClick(keycloak) } style={{cursor: "pointer"}} as="div">
              Apua?
            </Menu.Item>
          }
          { this.props.authenticated &&
            <Menu.Menu position="right">
              <Dropdown item simple text={strings.menuBarUserItemText}>
                <Dropdown.Menu>
                  <Dropdown.Item to="/manageContact" as={Link}><Icon name='user' color="red" />Yhteystiedot</Dropdown.Item>
                  <Dropdown.Item onClick={this.onAccountItemClick}><Icon name='setting' color="red" />{strings.menuBarManageAccountText}</Dropdown.Item>
                  {
                    this.props.authenticated && this.props.keycloak && this.props.keycloak.hasRealmRole(ApplicationRoles.UPDATE_OTHER_CONTACTS) &&
                    <Dropdown.Item href={"https://tunnistus-pakkasmarja.metatavu.io/auth/admin/Pakkasmarja/console"} target="_blank">
                      <Icon name='users' flipped="horizontally" color="red" />
                      Käyttäjähallinta
                    </Dropdown.Item>
                  }
                  <Dropdown.Item onClick={this.onLogoutItemClick}><Icon name='log out' flipped="horizontally" color="red" />{strings.menuBarLogoutText}</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Menu.Menu>
          }
        </Menu>
      </Container>
    );
  }

  /**
   * Checks if management is visible
   */
  private showManagement = (keycloak: KeycloakInstance) => {
    if(keycloak.hasRealmRole(ApplicationRoles.CREATE_CHAT_GROUPS)  
    || keycloak.hasRealmRole(ApplicationRoles.CREATE_PRODUCTS)
    || keycloak.hasRealmRole(ApplicationRoles.CREATE_ITEM_GROUPS)
    || keycloak.hasRealmRole(ApplicationRoles.UPDATE_OTHER_CONTRACTS)
    || keycloak.hasRealmRole(ApplicationRoles.MANAGE_DELIVERY_QUALITIES)
    || keycloak.hasRealmRole(ApplicationRoles.MANAGE_OPENING_HOURS)
    || keycloak.hasRealmRole(ApplicationRoles.ADMINISTRATE_OPENING_HOURS)
    || keycloak.hasRealmRole(ApplicationRoles.CREATE_OPERATIONS)){
      return true;
    } else {
      return false;
    }
  }
  
  private onHelpClick = async (keycloak: KeycloakInstance) => {
    if (!keycloak.token) {
      return;
    }
    
    const appConfig = await AppConfig.getAppConfig();
    const questionGroupId = appConfig['help-question-group'];
    if (!questionGroupId) {
      console.warn("Missing help question group id from app config");
      return;
    }

    const helpThreads = await Api.getChatThreadsService(keycloak.token).listChatThreads(questionGroupId, ChatGroupType.QUESTION, keycloak.subject);
    const thread = helpThreads.length ? helpThreads[0] : undefined;
    if (!thread || !thread.id) {
      console.warn("No help threads found");
      return;
    }

    this.props.chatOpen({
      answerType: ChatThread.AnswerTypeEnum.TEXT,
      open: true,
      threadId: thread.id,
      conversationType: "QUESTION"
    });
  }

  private onAccountItemClick = () =>  {
    if (this.props.keycloak) {
      window.location.href = this.props.keycloak.createAccountUrl();
    }
  }

  private onLogoutItemClick = () => {
    if (this.props.keycloak) {
      window.location.href = this.props.keycloak.createLogoutUrl();
    }
  }

  /**
   * Counts unreads by prefix
   * 
   * @param prefix prefix
   * @return unreads
   */
  private countUnreads = (prefix: string) => {
    return this.props.unreads.filter((unread: Unread) => {
      return (unread.path || "").startsWith(prefix);
    }).length;
  }
}

export function mapStateToProps(state: StoreState) {
  return {
    authenticated: state.authenticated,
    keycloak: state.keycloak,
    unreads: state.unreads
  };
}

export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
    onLogout: () => dispatch(actions.userLogout()),
    chatOpen: (chat: ChatWindow) => dispatch(actions.chatOpen(chat))
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(MenuContainer);