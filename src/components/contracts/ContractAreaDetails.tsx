import * as React from "react";
import "../../styles/common.scss";
import { Grid, Header, Button, Input, Divider } from "semantic-ui-react";
import { ItemGroup, AreaDetail } from "pakkasmarja-client";

/**
 * Interface for component State
 */
interface Props {
  itemGroup?: ItemGroup;
  areaDetails?: AreaDetail[];
  areaDetailValues: AreaDetail[];
  isActiveContract: boolean;
  onUserInputChange: (key: any, value: any) => void;
}

/**
 * Interface for component State
 */
interface State {
  minimumProfit: number;
}

/**
 * Class for contract item component
 */
export default class ContractAreaDetails extends React.Component<Props, State> {

  /**
   * Constructor
   *
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      minimumProfit: 0
    };
  }

  /**
   * Component did mount life cycle method
   */
  public componentDidMount = () => {
    if (this.props.areaDetailValues.length <= 0) {
      this.createEmptyAreaDetail();
    }

    if (this.props.itemGroup && this.props.itemGroup.minimumProfitEstimation) {
      this.setState({ minimumProfit: this.props.itemGroup.minimumProfitEstimation });
    }
  }

  /**
   * Create empty area detail
   */
  private createEmptyAreaDetail = () => {
    const areaDetails: any = this.props.areaDetailValues;
    areaDetails.push({
      name: "",
      size: "",
      species: "",
      profitEstimation: ""
    });

    this.props.onUserInputChange("areaDetailValues", areaDetails);
  }

  /**
   * Render area detail headers
   */
  private renderAreaDetailHeaders = () => {
    return (
      <Grid.Row columns={this.props.itemGroup && !this.props.itemGroup.minimumProfitEstimation ? "4" : "3"}>
        <Grid.Column>
          <p>Lohko/Lohkot</p>
        </Grid.Column>
        <Grid.Column>
          <p>Pinta-ala (ha)</p>
        </Grid.Column>
        <Grid.Column>
          <p>Lajike/Lajikkeet</p>
        </Grid.Column>
        {
          this.props.itemGroup && !this.props.itemGroup.minimumProfitEstimation &&
          <Grid.Column>
            <p>Tuottoarvio (kg / ha)</p>
          </Grid.Column>
        }
      </Grid.Row>
    );
  }

  /**
   * Render area details row
   * 
   * @param index index
   * @param name name
   * @param size size
   * @param species species
   */
  private renderAreaDetailsRow = (index: number, name?: string, size?: number, species?: string) => {
    const minimumEstimation = this.props.itemGroup ? this.props.itemGroup.minimumProfitEstimation : null;

    const style = {
      height: 40,
      borderColor: "red",
      backgroundColor: "white",
      borderWidth: 1,
      borderRadius: 4,
      marginTop: 10,
      pAlign: "center"
    }

    return (
      <Grid.Row key={index} columns={!minimumEstimation ? "4" : "3"}>
        <Grid.Column>
          {this.renderInputField(index, "name", !this.props.isActiveContract, name || "", style)}
        </Grid.Column>
        <Grid.Column>
          {this.renderInputField(index, "size", !this.props.isActiveContract, size && size.toString() || "", style)}
        </Grid.Column>
        <Grid.Column>
          {this.renderInputField(index, "species", !this.props.isActiveContract, species || "", style)}
        </Grid.Column>
        {
          !minimumEstimation &&
          <Grid.Column>
            {this.renderInputField(index, "profitEstimation", !this.props.isActiveContract, "0", style)}
          </Grid.Column>
        }
      </Grid.Row>
    );
  }

  /**
   * Render input field
   * 
   * @param index index
   * @param key key
   * @param editable editable
   * @param keyboardType keyboardType
   * @param value value
   * @param style style
   */
  private renderInputField = (index: number, key: string, editable: boolean, value: string, style: any) => {
    return (
      <Input
        key={index}
        style={style}
        value={value}
        onChange={(e: any) => editable && this.handleInputChange(index, key, e.target.value)}
      />
    );
  }

  /**
   * Handle input change
   * 
   * @param index index
   * @param key key
   * @param value value
   */
  private handleInputChange = (index: number, key: string, value: string | number) => {
    const areaDetails: any = this.props.areaDetailValues;

    if (areaDetails.length <= 0) {
      const areaDetail: any = {};
      areaDetail[key] = value;
      areaDetails.push(areaDetail);
      this.props.onUserInputChange("areaDetailValues", areaDetails);
    } else {
      areaDetails[index][key] = value;
      this.props.onUserInputChange("areaDetailValues", areaDetails);
    }
  }

  /**
   * Render profit p
   */
  private renderProfitTextElements = () => {
    if (!this.props.itemGroup || this.props.areaDetailValues.length <= 0) {
      return;
    }

    const blocks = this.props.areaDetailValues.length;
    const minimumProfit = this.props.itemGroup.minimumProfitEstimation;

    const totalHectares = this.props.areaDetailValues.reduce((total, areaDetailValue) => {
      const size = areaDetailValue.size ? areaDetailValue.size : 0;
      return total += parseInt(size.toString(), 10);
    }, 0);

    const totalProfit = this.props.areaDetailValues.reduce((total, areaDetailValue) => {
      const estimation = minimumProfit || 0;
      const totalHectares = areaDetailValue.size ? areaDetailValue.size : 0;

      return total += estimation * totalHectares;
    }, 0);

    if (minimumProfit) {
      return (
        <div>
          <p>
            {`Lohkoja yhteensä ${blocks} kpl. Pinta-alaa yhteensä ${totalHectares} ha.`}
          </p>
          <p>
            {`Minimisopimusmäärä on ${totalProfit} kg, perustuen hehtaarikohtaiseen toimitusmääräminimiin 500 kg / ha. Lisätietoja sopimuksen kohdasta Sopimuksen mukaiset toimitusmäärät, takuuhinnat ja bonus satokaudella ${(new Date()).getFullYear()}`}
          </p>
        </div>
      );
    } else {
      return (
        <p>
          {`Lohkoja yhteensä ${blocks} kpl. Pinta-alaa yhteensä ${totalHectares} ha. Tuotantoarvio yhteensä ${totalProfit} kg`}
        </p>
      );
    }
  }

  /**
   * Render method
   */
  public render() {
    if (!this.props.areaDetails || !this.props.itemGroup) {
      return <div></div>;
    }

    return (
      <div className="contract-section">
        <Divider horizontal>
          <Header as='h2'>
            Tuotannossa olevat hehtaarit
         </Header>
        </Divider>
        <Grid >
          {
            this.renderAreaDetailHeaders()
          }
          {
            this.props.areaDetailValues && this.props.areaDetailValues.length > 0 && this.props.areaDetailValues.map((areaDetail, index) => {
              return (
                this.renderAreaDetailsRow(index, areaDetail.name, areaDetail.size, areaDetail.species)
              );
            })
          }
        </Grid>
        {
          !this.props.isActiveContract &&
            <Button style={{ marginTop: "2.5%", marginBottom: "2.5%",width:"100%" }} color="red" onClick={this.createEmptyAreaDetail}>
              LISÄÄ RIVI
          </Button>
        }
        {
          this.renderProfitTextElements()
        }
      </div>
    );
  }
}