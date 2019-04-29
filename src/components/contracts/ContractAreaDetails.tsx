import * as React from "react";
import "../../styles/common.scss";
import "./styles.scss";
import { Grid, Header, Button, Input, Divider } from "semantic-ui-react";
import { ItemGroup, AreaDetail } from "pakkasmarja-client";
import strings from "src/localization/strings";

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
 * Class for contract area details component
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
          <p>{strings.blocks}</p>
        </Grid.Column>
        <Grid.Column>
          <p>{strings.area}</p>
        </Grid.Column>
        <Grid.Column>
          <p>{strings.species}</p>
        </Grid.Column>
        {
          this.props.itemGroup && !this.props.itemGroup.minimumProfitEstimation &&
          <Grid.Column>
            <p>{strings.profitEstimationPerHectare}</p>
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
          {this.renderInputField(index, strings.name, !this.props.isActiveContract, name || "", style)}
        </Grid.Column>
        <Grid.Column>
          {this.renderInputField(index, strings.size, !this.props.isActiveContract, size && size.toString() || "", style)}
        </Grid.Column>
        <Grid.Column>
          {this.renderInputField(index, strings.species, !this.props.isActiveContract, species || "", style)}
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
   * Render profit text
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
            {strings.formatString(strings.totalAmountOfBlocks, blocks, totalHectares)}
          </p>
          <p>
            {strings.formatString(strings.minimumContractAmountText, totalProfit, (new Date()).getFullYear())}
          </p>
        </div>
      );
    } else {
      return (
        <p>
          {strings.formatString(strings.areaDetailsTotal, blocks, totalHectares, totalProfit)}
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
            {strings.hectaresInProduction}
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
            <Button className="contract-full-width-button"color="red" onClick={this.createEmptyAreaDetail}>
              {strings.addRow}
          </Button>
        }
        {
          this.renderProfitTextElements()
        }
      </div>
    );
  }
}