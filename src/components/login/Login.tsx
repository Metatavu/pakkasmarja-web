import * as React from "react";
import Keycloak, { KeycloakConfig } from 'keycloak-js';
import {
  Grid,
  Loader
} from "semantic-ui-react";
import * as actions from "../../actions";
import BasicLayout from "../generic/BasicLayout";
import { Redirect } from "react-router";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { KeycloakInstance } from "keycloak-js";
import { connect } from "react-redux";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  onLogin?: (keycloak: Keycloak.KeycloakInstance, authenticated: boolean) => void;
  redirectPath?: string;
}

/**
 * Interface for component state
 */
interface State {
  loadingRealms: boolean;
  redirectPath: string;
}

/**
 * Class for component login
 */
class Login extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      loadingRealms: false,
      redirectPath: "/"
    };
  }

  /**
   * Component did mount life-cycle event
   */
  public componentDidMount() {
    if (this.props.redirectPath) {
      this.setState({ redirectPath: this.props.redirectPath });
    }

    if (!this.props.authenticated) {
      this.doLogin();
    }
  }

  /**
   * Do login
   */
  private doLogin = async () => {
    const { REACT_APP_REALM, REACT_APP_AUTH_SERVER_URL, REACT_APP_AUTH_RESOURCE } = process.env;
    if (!REACT_APP_REALM || !REACT_APP_AUTH_SERVER_URL || !REACT_APP_AUTH_RESOURCE) {
      throw new Error("Environment variables not set properly");
    } 

    const { onLogin } = this.props;

    const kcConf: KeycloakConfig = {
      "realm": REACT_APP_REALM,
      "url": REACT_APP_AUTH_SERVER_URL,
      "clientId": REACT_APP_AUTH_RESOURCE
    };
    
    const keycloak = new Keycloak(kcConf);
    const authenticated = await keycloak.init({onLoad: "login-required", checkLoginIframe: false });

    if (onLogin) {
      onLogin(keycloak, authenticated);
    }
  }

  /**
   * Render method
   */
  public render() {
    return (
      <BasicLayout>
        { this.props.authenticated ? (
          <Redirect to={this.state.redirectPath} />
        ) : (
          <Grid centered>
            <Loader active size="medium" />
          </Grid>
        )}
      </BasicLayout>
    );
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
    keycloak: state.keycloak
  }
}

/**
 * Redux mapper for mapping component dispatches 
 * 
 * @param dispatch dispatch method
 */
function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
    onLogin: (keycloak: KeycloakInstance, authenticated: boolean) => dispatch(actions.userLogin(keycloak, authenticated))
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Login);