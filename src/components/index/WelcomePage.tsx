import * as React from "react";
import {
  Grid,
  Header
} from "semantic-ui-react";
import strings from "../../localization/strings";
import BasicLayout from "../generic/BasicLayout";
import "../../styles/common.css";

/**
 * Class for welcome page
 */
export default class WelcomePage extends React.Component {

  /**
   * Render method
   */
  public render() {
    return (
      <BasicLayout>
        <Grid centered>
          <Grid.Row>
            <Header className="welcomeHeader" textAlign="center" >{strings.welcome}</Header>
          </Grid.Row>
        </Grid>
      </BasicLayout>
    );
  }
}