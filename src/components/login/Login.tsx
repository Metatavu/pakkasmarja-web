import * as React from "react";
import * as Keycloak from 'keycloak-js';
import {
  Grid,
  Header
} from "semantic-ui-react";
import * as actions from "../../actions";
import BasicLayout from "../generic/BasicLayout";
import { Redirect } from "react-router";
import strings from "../../localization/strings";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { KeycloakInstance } from "keycloak-js";
import { connect } from "react-redux";

export interface Props {
  authenticated: boolean,
  keycloak?: Keycloak.KeycloakInstance,
  onLogin?: (keycloak: Keycloak.KeycloakInstance, authenticated: boolean) => void
}

interface State {
  loadingRealms: boolean
}

class Login extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      loadingRealms: false
    };
  }

  componentDidMount() {
    if (!this.props.authenticated) {
      this.doLogin();
    }
  }

  doLogin() {
    const kcConf = {
      "realm": process.env.REACT_APP_REALM,
      "url": process.env.REACT_APP_AUTH_SERVER_URL,
      "clientId": process.env.REACT_APP_AUTH_RESOURCE
    };
    console.log(kcConf);
    const keycloak = Keycloak(kcConf);
    keycloak.init({onLoad: "login-required"}).success((authenticated) => {
      console.log(authenticated);
      this.props.onLogin && this.props.onLogin(keycloak, authenticated);
    });
  }

  render() {
    return (
      <BasicLayout>
        { this.props.authenticated ? (
          <div>
            <Redirect to="/" />
          </div>
        ) : (
          <Grid centered>
              <Grid.Row>
                <Header textAlign="center" >{strings.redirectingTokeycloak}</Header>
              </Grid.Row>
            </Grid>
        )}
      </BasicLayout>
    );
  }
}

export function mapStateToProps(state: StoreState) {
  return {
    authenticated: state.authenticated,
    keycloak: state.keycloak
  }
}

export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
    onLogin: (keycloak: KeycloakInstance, authenticated: boolean) => dispatch(actions.userLogin(keycloak, authenticated))
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Login);