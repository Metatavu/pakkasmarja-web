import * as React from "react";
import { Contract, DeliveryPlace } from "pakkasmarja-client";
import { TextArea, Header, Dropdown, Divider, Container, Form } from "semantic-ui-react";

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

export default class ContractDeliveryPlace extends React.Component<Props, State> {
  /**
   * Constructor
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
            Toimituspaikka
         </Header>
        </Divider>
        <Form>
          <Dropdown
            fluid
            selection
            placeholder="Valitse toimituspaikka"
            value={this.props.selectedPlaceId}
            options={deliveryPalceOptions}
            onChange={(event, data) => {
              this.props.onUserInputChange("deliveryPlaceId", data.value)
            }
            }
          />
          {
            this.state.proposedDeliveryPlace &&
            <p>
              {`Pakkasmarjan ehdotus: ${this.state.proposedDeliveryPlace}`}
            </p>
          }
          <p>Kommentti</p>

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