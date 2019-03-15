import * as React from "react";
import { Contract, DeliveryPlace } from "pakkasmarja-client";
import { TextArea, Header, Dropdown } from "semantic-ui-react";

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
  isActiveContract: boolean
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
      <div className="contract-section">
        <div>
          <Header as="h2">
            Toimituspaikka
          </Header>
          <div style={{
            height: 50,
            width: "100%",
            backgroundColor: 'white',
            borderColor: "red",
            borderWidth: 1,
            borderRadius: 4
          }}>
            <Dropdown
              placeholder="Valitse toimituspaikka"
              value={this.props.selectedPlaceId}
              options={deliveryPalceOptions}
              onChange={ (event, data) => { 
                console.log(data.value);
                this.props.onUserInputChange("deliveryPlaceId", data.value) }
              }
            />
          </div>
        </div>
        <div>
          {
            this.state.proposedDeliveryPlace &&
            <p>
              {`Pakkasmarjan ehdotus: ${this.state.proposedDeliveryPlace}`}
            </p>
          }
        </div>
        <div>
          <p>Kommentti</p>
          <TextArea
            value={this.props.deliveryPlaceComment}
            onChange={(event: any) => {
              !this.props.isActiveContract && this.onDeliveryPlaceChange(event.target.value)
            }}
          />
        </div>
      </div>
    );
  }
}