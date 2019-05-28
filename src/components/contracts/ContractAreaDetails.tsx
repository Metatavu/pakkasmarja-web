import * as React from "react";
import "../../styles/common.css";
import "./styles.css";
import { Grid, Header, Button, Input } from "semantic-ui-react";
import { ItemGroup, AreaDetail } from "pakkasmarja-client";
import strings from "src/localization/strings";

/**
 * Interface for component State
 */
interface Props {
  itemGroup: ItemGroup;
  areaDetailValues: AreaDetail[];
  isReadOnly: boolean;
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
  private renderAreaDetailsRow = (index: number, name?: string, size?: number, species?: string, profitEstimation?: number) => {
    const minimumEstimation = this.props.itemGroup && this.props.itemGroup.minimumProfitEstimation ? this.props.itemGroup.minimumProfitEstimation : null;

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
      <Grid.Row style={{ paddingTop: 0 }} key={index} columns={!minimumEstimation ? "4" : "3"}>
        <Grid.Column>
          {this.renderInputField(index, "name", !this.props.isReadOnly, name || "", style)}
        </Grid.Column>
        <Grid.Column>
          {this.renderInputField(index, "size", !this.props.isReadOnly, size && size.toString() || "", style, "number")}
        </Grid.Column>
        <Grid.Column>
          {this.renderInputField(index, "species", !this.props.isReadOnly, species || "", style)}
        </Grid.Column>
        {
          !minimumEstimation &&
          <Grid.Column>
            {this.renderInputField(index, "profitEstimation", !this.props.isReadOnly, profitEstimation || 0, style, "number")}
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
  private renderInputField = (index: number, key: string, editable: boolean, value: string | number, style: any, type?: string) => {
    return (
      <Input
        style={style}
        value={value}
        type={type}
        disabled={!editable}
        onChange={(e: any) => this.handleInputChange(index, key, e.target.value)}
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
      const estimation = minimumProfit || areaDetailValue.profitEstimation || 0;
      const totalHectares = areaDetailValue.size ? areaDetailValue.size : 0;

      return total += estimation * totalHectares;
    }, 0);

    if (minimumProfit) {
      return (
        <div style={{ marginTop: 10 }}>
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

    return (
      <div className="contract-white-container">
        <Header as='h2'>
          {strings.hectaresInProduction}
        </Header>
        <Grid >
          {
            this.renderAreaDetailHeaders()
          }
          {
            this.props.areaDetailValues && this.props.areaDetailValues.length > 0 && this.props.areaDetailValues.map((areaDetail, index) => {
              return (
                this.renderAreaDetailsRow(index, areaDetail.name, areaDetail.size, areaDetail.species, areaDetail.profitEstimation)
              );
            })
          }
        </Grid>
        {
          !this.props.isReadOnly &&
          <Button className="contract-full-width-button" color="red" onClick={this.createEmptyAreaDetail}>
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