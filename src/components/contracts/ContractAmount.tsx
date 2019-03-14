import * as React from "react";
import "../../styles/common.scss";
import { Input, Header, Form, Checkbox, TextArea } from "semantic-ui-react";
import { Contract, ItemGroup } from "pakkasmarja-client";

/**
 * Interface for component State
 */
interface Props {
  itemGroup?: ItemGroup;
  contract?: Contract;
  onUserInputChange: (key:any, value:any) => void;
  proposedAmount: number;
  contractAmount?: number;
  quantityComment: string;
  deliverAllChecked: boolean;
}

/**
 * Interface for component State
 */
interface State {
  showPastContracts: boolean;
  isActiveContract: boolean;
}

/**
 * Class for contract item component
 */
export default class ContractAmount extends React.Component<Props, State> {

  /**
   * Constructor
   *
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      showPastContracts: false,
      isActiveContract: false
    };
  }

  /**
   * 
   */
  public componentDidMount = () => {
    if (!this.props.contract) {
      return;
    }
    this.setState({ isActiveContract: this.props.contract.status === "APPROVED" })
  }

  /**
   * Render method
   */
  public render() {
    if (!this.props.contract || !this.props.itemGroup) {
      return <div></div>;
    }

    const category = this.props.itemGroup.category;
    let quantityValue = 0;

    if (this.props.contractAmount && !this.props.proposedAmount) {
      quantityValue = this.props.contractAmount;
    } else {
      quantityValue = this.props.proposedAmount;
    }

    return (
      <div className="contract-section">
        <Header as="h2">
          Määrä
        </Header>
        {
          category == "FRESH" && 
            <p>
              Tuoremarjasopimuksessa sopimusmäärä on aiesopimus, johon molemmat osapuolet sitoutuvat, ellei kyseessä poikkeustilanne.
            </p>
        }
        <Form>
          <Form.Field>
            <label>Määrä</label>
            <Input 
              placeholder="Määrä"
              value={quantityValue}
              onChange={(event: any) => this.props.onUserInputChange("proposedQuantity", event.target.value)}
              disabled={this.state.isActiveContract}
            />
          </Form.Field>
          <p>
            { `Pakkasmarjan ehdotus: ${this.props.contract.contractQuantity} kg` }
          </p>
          <p onClick={() => this.setState({ showPastContracts: true })}>
            Edellisten vuosien sopimusmäärät ja toimitusmäärät
          </p>
          <Form.Field 
            control={Checkbox}
            label={{ children: "Haluaisin toimittaa kaiken tilallani viljeltävän sadon tästä marjasta Pakkasmarjalle pakastettavaksi ja tuorekauppaan (lisätietoja sopimuksen kohdasta 100 % toimittajuus)." }}
          />
          <Form.Field>
            <TextArea
              value={this.props.quantityComment}
              onChange={(event: any) => {
                !this.state.isActiveContract && this.props.onUserInputChange("quantityComment", event.target.value)
              }}
              placeholder="Kommentti"
            />
          </Form.Field>
        </Form>
        
      </div>
    );
  }
}