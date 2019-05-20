import * as React from "react";
import "../../styles/common.css";
import { Grid, Header, List, Icon } from "semantic-ui-react";
import { ItemGroup, ItemGroupPrice } from "pakkasmarja-client";
import strings from "src/localization/strings";
import * as _ from "lodash";

/**
 * Interface for component State
 */
interface Props {
  prices?: ItemGroupPrice[];
  itemGroup?: ItemGroup;
}

/**
 * Interface for component State
 */
interface State {
  displayPastPrices: boolean;
}

/**
 * Class for contract prices component
 */
export default class ContractPrices extends React.Component<Props, State> {

  /**
   * Constructor
   *
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      displayPastPrices: false
    };
  }

  /**
   * Format prices text
   * 
   * @param itemGroupDisplayName itemGroupDisplayName
   */
  private renderPricesText = (itemGroupDisplayName: string) => {
    return (
      <p>
        {strings.formatString(strings.pricesText, itemGroupDisplayName, new Date().getFullYear().toString())}
      </p>
    );
  }

  /**
   * Render item details
   * 
   * @param itemGroupName itemGroupName
   */
  private renderItemDetails = (itemGroupName: string) => {
    switch (itemGroupName) {
      case "304100/Mansikka":
      case "309100/Luomu mansikk":
        return (
          <React.Fragment>
            <p className="contract-price-text">{strings.strawberry1}</p>
            <p>{strings.strawberry2}</p>
            <p>{strings.strawberry3}</p>
            <p>{strings.strawberry4}</p>
          </React.Fragment>
        );
      case "304400/Mustaherukka":
      case "309300/Luomu mustahe":
        return (
          <React.Fragment>
            <p className="contract-price-text">{strings.blackcurrant1}</p>
            <p>{strings.blackcurrant2}</p>
            <p>{strings.blackcurrant3}</p>
            <p>{strings.blackcurrant4}</p>
          </React.Fragment>
        );
      default:
        return (
          <React.Fragment>
            <p className="contract-price-text">{strings.default1}</p>
            <p>{strings.default2}</p>
            <p>{strings.default3}</p>
          </React.Fragment>
        );
    }
  }

  /**
   * Render price rows
   * 
   * @param prices prices
   */
  private renderActivePriceRows = (prices: ItemGroupPrice[]) => {
    return prices.filter(price => price.year === new Date().getFullYear()).map((price) => {
      return (
        this.renderPriceRow(price, true)
      );
    })
  }

  /**
   * Render past price rows
   * 
   * @param prices prices 
   */
  private renderPastPriceRows = (prices: ItemGroupPrice[]) => {
    let filteredPrices = prices.filter(price => price.year < new Date().getFullYear());
    filteredPrices = _.sortBy(filteredPrices, 'year').reverse();
    return filteredPrices.map((price) => {
      return (
        this.renderPriceRow(price)
      );
    })
  }

  /**
   * Render price rows
   * 
   * @param price price
   */
  private renderPriceRow = (price: ItemGroupPrice, active?: boolean) => {
    if (active) {
      return (
        <Grid.Row columns="2" key={price.id}>
          <Grid.Column width="4">
            <h3>{price.group}</h3>
          </Grid.Column>
          <Grid.Column width="12">
            <h3>{`${price.price} ${price.unit}`}</h3>
          </Grid.Column>
        </Grid.Row>
      );
    } else {
      return (
        <Grid.Row className="grid-container" style={{paddingTop:0}} columns="3" key={price.id}>
          <Grid.Column>
            {price.year}
          </Grid.Column>
          <Grid.Column>
            {price.group}
          </Grid.Column>
          <Grid.Column>
            {`${price.price} ${price.unit}`}
          </Grid.Column>
        </Grid.Row>
      );
    }
  }

  /**
   * Render method
   */
  public render() {
    if (!this.props.prices || !this.props.itemGroup) {
      return <div></div>;
    }

    const itemGroupCategory = this.props.itemGroup.category;
    const itemGroupName = this.props.itemGroup.name || "-";
    const itemGroupDisplayName = this.props.itemGroup.displayName || this.props.itemGroup.name || "-";

    if (itemGroupCategory !== "FROZEN") {
      return (
        <div className="contract-white-container">
          <List bulleted>
            <List.Item>
              {strings.contractDetailsListItem1}
            </List.Item>
            <List.Item>
              {strings.contractDetailsListItem2}
            </List.Item>
            <List.Item>
              {strings.contractDetailsListItem3}
            </List.Item>
            <List.Item>
              {strings.contractDetailsListItem4}
            </List.Item>
            <List.Item>
              {strings.contractDetailsListItem5}
            </List.Item>
          </List>
        </div>
      );
    }

    return (
      <div className="contract-blue-container">
        <Header as='h2'>
          {strings.guaranteedPrices}
        </Header>
        {this.renderPricesText(itemGroupDisplayName)}
        <Grid>
          {this.renderActivePriceRows(this.props.prices)}
          <p className="open-modal-element" style={{ color: "blue", paddingBottom: 10 }} onClick={() => this.setState({ displayPastPrices: !this.state.displayPastPrices })}>
            <Icon color="red" name='info circle' />
            {
              this.state.displayPastPrices ? strings.hidePastPrices : strings.showPastPrices
            }
          </p>
          {this.state.displayPastPrices && this.renderPastPriceRows(this.props.prices)}
        </Grid>
        {this.renderItemDetails(itemGroupName)}
      </div>
    );
  }
}