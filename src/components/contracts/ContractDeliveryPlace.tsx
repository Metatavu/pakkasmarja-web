import * as React from "react";
import { Contract, DeliveryPlace } from "pakkasmarja-client";
import { TextArea, Header, Dropdown, Divider, Container, Form } from "semantic-ui-react";
import strings from "src/localization/strings";

/**
 * Interface for component props
 */
interface Props {
  contract?: Contract,
  deliveryPlaces?: DeliveryPlace[],
  styles?: any,
  onUserInputChange: (key: any, value: any) => void,
  selectedPlaceId: string,
  deliveryPlaceComment: string,
  isActiveContract: boolean,
  match?: any;
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
   * @param deliveryPalceOptions deliveryPalceOptions
   */
  private renderDropDown = (deliveryPalceOptions: any) => {
    if (deliveryPalceOptions.length <= 0) {
      return <Dropdown fluid/>;
    }

    return (
      <Dropdown
        fluid
        placeholder={strings.deliveryPlace}
        value={this.props.selectedPlaceId}
        options={deliveryPalceOptions}
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
    const deliveryPalceOptions = this.props.deliveryPlaces && this.props.deliveryPlaces.map((deliveryPlace) => {
      return {
        key: deliveryPlace.id || "",
        text: deliveryPlace.name || "",
        value: deliveryPlace.id || ""
      };
    }) || [];

    return (
      <Container>
        <Divider horizontal>
          <Header as='h2'>
            {strings.deliveryPlace}
         </Header>
        </Divider>
        <Form>
          {this.renderDropDown(deliveryPalceOptions)}
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
              !this.props.isActiveContract && this.onDeliveryPlaceChange(event.target.value)
            }}
          />
        </Form>
      </Container>
    );
  }
}