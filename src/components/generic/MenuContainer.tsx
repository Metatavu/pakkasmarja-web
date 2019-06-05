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
import { StoreState } from "../../types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import * as actions from "../../actions/";
import ApplicationRoles from "src/utils/application-roles";
import { Unread } from "pakkasmarja-client";

interface Props {
  authenticated: boolean,
  keycloak?: KeycloakInstance,
  onLogout?: () => void,
  unreads: Unread[]
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
          { this.props.authenticated && this.props.keycloak && this.props.keycloak.hasRealmRole(ApplicationRoles.CREATE_OPERATIONS) &&
          <Menu.Item as="div">
            <Link to="/operationsManagement">{strings.operations}</Link>
          </Menu.Item>
          }
          { this.props.authenticated && this.props.keycloak && this.props.keycloak.hasRealmRole(ApplicationRoles.UPDATE_OTHER_CONTRACTS) &&
            <Menu.Item as="div">
              <Link to="/contractManagement">{strings.contractManagement}</Link>
            </Menu.Item>
          }
          { this.props.authenticated && this.props.keycloak && this.props.keycloak.hasRealmRole(ApplicationRoles.CREATE_ITEM_GROUPS) &&
            <Menu.Item as="div">
              <Link to="/itemGroupsManagement">{strings.itemGroupsManagement}</Link>
            </Menu.Item>
          }
          { this.props.authenticated && this.props.keycloak && this.props.keycloak.hasRealmRole(ApplicationRoles.CREATE_PRODUCTS) &&
            <Menu.Item as="div">
              <Link to="/productsManagement">{strings.productsManagement}</Link>
            </Menu.Item>
          }
          { this.props.authenticated && this.props.keycloak && this.props.keycloak.hasRealmRole(ApplicationRoles.CREATE_CHAT_GROUPS) &&
            <Menu.Item as="div">
              <Link to="/chatManagement">{strings.chatManagement}</Link>
            </Menu.Item>
          }
          { this.props.authenticated && this.props.keycloak && this.props.keycloak.hasRealmRole(ApplicationRoles.LIST_ALL_WEEK_DELIVERY_PREDICTION) &&
            <Menu.Item as="div">
              <Link to="/manageWeekPredictions">Viikkoennusteet</Link>
            </Menu.Item>
          }
          { this.props.authenticated && this.props.keycloak && this.props.keycloak.hasRealmRole(ApplicationRoles.UPDATE_OTHER_DELIVERIES) &&
            <Menu.Menu>
              <Dropdown item simple text="Vastaanotto">
                <Dropdown.Menu>
                  <Dropdown.Item to="/manageFreshDeliveries" as={Link}>Tuore toimitukset</Dropdown.Item>
                  <Dropdown.Item to="/manageFrozenDeliveries" as={Link}>Pakaste toimitukset</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Menu.Menu>
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
    onLogout: () => dispatch(actions.userLogout())
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(MenuContainer);