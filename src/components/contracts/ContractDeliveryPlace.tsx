import * as React from "react";
import { Contract, DeliveryPlace } from "pakkasmarja-client";
import { TextArea, Header, Dropdown, Container, Form } from "semantic-ui-react";
import strings from "src/localization/strings";

/**
 * Interface for component props
 */
interface Props {
  contract: Contract,
  deliveryPlaces: DeliveryPlace[],
  styles?: any,
  onUserInputChange: (key: any, value: any) => void,
  selectedPlaceId: string,
  deliveryPlaceComment: string,
  isReadOnly: boolean,
};

/**
 * Interface for component state
 */
interface State {
  proposedDeliveryPlace?: string
};

/**
 * Class for contact delivery place component
 */
export default class ContractDeliveryPlace extends React.Component<Props, State> {

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
   * Component did mount life cycle event
   */
  public componentDidMount = () => {
    if (!this.props.deliveryPlaces || !this.props.contract || !this.props.contract.deliveryPlaceId) {
      return;
    }

    if (this.props.contract && this.props.contract.deliveryPlaceId && !this.props.selectedPlaceId) {
      this.props.onUserInputChange("deliveryPlaceId", this.props.contract.deliveryPlaceId);
    }

    const proposedId = this.props.contract.deliveryPlaceId;
    const proposedDeliveryPlace = this.props.deliveryPlaces.find(place => place.id === proposedId);
    if (proposedDeliveryPlace) {
      this.setState({ proposedDeliveryPlace: proposedDeliveryPlace.name });
    }
  }

  /**
   * On delivery place comment change
   * 
   * @param value value
   */
  private onDeliveryPlaceChange = (value: string) => {
    this.props.onUserInputChange("deliveryPlaceComment", value);
  }

  /**
   * Render drop down
   * 
   * @param deliveryPlaceOptions deliveryPalceOptions
   */
  private renderDropDown = (deliveryPlaceOptions: any) => {
    if (deliveryPlaceOptions.length <= 0) {
      return <Dropdown fluid />;
    }

    return (
      <Dropdown
        fluid
        selection
        disabled={this.props.isReadOnly}
        placeholder={strings.deliveryPlace}
        value={this.props.selectedPlaceId}
        options={deliveryPlaceOptions}
        onChange={(event, data) => {
          this.props.onUserInputChange("deliveryPlaceId", data.value)
        }
        }
      />
    );
  }

  /**
   * Render method
   */
  public render() {
    const deliveryPlaceOptions = this.props.deliveryPlaces && this.props.deliveryPlaces.map((deliveryPlace) => {
      return {
        key: deliveryPlace.id || "",
        text: deliveryPlace.name || "",
        value: deliveryPlace.id || ""
      };
    }) || [];

    return (
      <Container>
        <div className="contract-blue-container">
          <Header as='h2'>
            {strings.deliveryPlace}
          </Header>
          <Form>
            {this.renderDropDown(deliveryPlaceOptions)}
            {
              this.state.proposedDeliveryPlace &&
              <p>
                {`Pakkasmarjan ehdotus: ${this.state.proposedDeliveryPlace}`}
              </p>
            }
            <p>{strings.comment}</p>

            <TextArea
              value={this.props.deliveryPlaceComment}
              onChange={(event: any) => {
                !this.props.isReadOnly && this.onDeliveryPlaceChange(event.target.value)
              }}
              disabled={this.props.isReadOnly}
            />
          </Form>
        </div>
      </Container>
    );
  }
}