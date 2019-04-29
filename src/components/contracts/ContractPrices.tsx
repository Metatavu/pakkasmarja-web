import * as React from "react";
import "../../styles/common.scss";
import { Grid, Header, List, Divider } from "semantic-ui-react";
import {  ItemGroup, ItemGroupPrice } from "pakkasmarja-client";
import strings from "src/localization/strings";

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
        {strings.formatString(strings.pricesText, itemGroupDisplayName, new Date().getFullYear().toString()) }
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
          <p className="contract-price-text">
            {strings.strawberry1}
            {strings.strawberry2}
            {strings.strawberry3}
            {strings.strawberry4}
          </p>
        );
      case "304400/Mustaherukka":
      case "309300/Luomu mustahe":
        return (
          <p className="contract-price-text">
            {strings.blackcurrant1}
            {strings.blackcurrant2}
            {strings.blackcurrant3}
            {strings.blackcurrant4}
          </p>
        );
      default:
        return (
          <p className="contract-price-text">
            {strings.default1}
            {strings.default2}
            {strings.default3}
          </p>
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
        this.renderPriceRow(price)
      );
    })
  }

  /**
   * Render past price rows
   * 
   * @param prices prices 
   */
  private renderPastPriceRows = (prices: ItemGroupPrice[]) => {
    return prices.filter(price => price.year < new Date().getFullYear()).map((price) => {
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
  private renderPriceRow = (price: ItemGroupPrice) => {
    return (
      <Grid.Row columns="3" key={price.id}>
        <Grid.Column>
          { price.year }
        </Grid.Column>
        <Grid.Column>
          { price.group }
        </Grid.Column>
        <Grid.Column>
          { `${price.price} ${price.unit}` }
        </Grid.Column>
      </Grid.Row>
    );
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
        <div className="contract-section">
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
      <div className="contract-section">
        <Divider horizontal>
          <Header as='h2'>
            {strings.guaranteedPrices}
         </Header>
        </Divider>
        { this.renderPricesText(itemGroupDisplayName) }
        <p onClick={() => this.setState({ displayPastPrices: !this.state.displayPastPrices })}>
          {
            this.state.displayPastPrices ? strings.hidePastPrices : strings.showPastPrices
          }
        </p>
        <Grid>
          { this.renderActivePriceRows(this.props.prices) } 
          { this.state.displayPastPrices && this.renderPastPriceRows(this.props.prices) }
        </Grid>
        { this.renderItemDetails(itemGroupName) }
      </div>
    );
  }
}