import * as React from "react";
import "../../styles/common.scss";
import { Grid, Header, Divider } from "semantic-ui-react";
import { Contact } from "pakkasmarja-client";

/**
 * Interface for component State
 */
interface Props {
  contact?: Contact;
  companyName: string;
  companyBusinessId: string
}

/**
 * Interface for component State
 */
interface State {
}

/**
 * Class for contract item component
 */
export default class ContractParties extends React.Component<Props, State> {

  /**
   * Constructor
   *
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
    };
  }

  /**
   * Render method
   */
  public render() {
    if (!this.props.contact) {
      return <div></div>;
    }

    const farmerCompanyName = this.props.contact.companyName;
    const farmerFirstName = this.props.contact.firstName;
    const farmerLastName = this.props.contact.lastName;

    return (
      <div className="contract-section">
        <Divider horizontal>
          <Header as='h2'>
            Osapuolet
         </Header>
        </Divider>

        <Grid>
          <Grid.Row columns="2">
            <Grid.Column>
              Viljelijä
            </Grid.Column>
            <Grid.Column>
              Yhtiö
            </Grid.Column>
          </Grid.Row>
          <Grid.Row columns="2">
            <Grid.Column>
              <p>
                {farmerCompanyName ? farmerCompanyName : `${farmerFirstName} ${farmerLastName}`}
              </p>
            </Grid.Column>
            <Grid.Column>
              <p>
                {this.props.companyName}
              </p>
              <p>
                {this.props.companyBusinessId}
              </p>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </div>
    );
  }
}