import * as React from "react";
import "../../styles/common.scss";
import { Grid, Header, List, Divider } from "semantic-ui-react";
import { Price, ItemGroup } from "pakkasmarja-client";

/**
 * Interface for component State
 */
interface Props {
  prices?: Price[];
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
        {`Ostettavien marjojen (${itemGroupDisplayName}) takuuhinnat satokaudella ${new Date().getFullYear()}`}
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
            Takuuhinnan lisäksi yhtiö maksaa viljelijälle bonusta sopimuksen täyttöasteen mukaisesti.
            Lisätietoja sopimuksen kohdasta Sopimuksen mukaiset toimitusmäärät, takuuhinnat ja bonus satokaudella 2018. Sopimusmäärän ylittävältä osalta mahdollinen lisämäärä, mahdollinen bonus ja maksuehto neuvotellaan aina erikseen.
            Kaikki hinnat ovat vähimmäishintoja ja ALV 0%. Toimitusehto on vapaasti yhtiön osoittaman pakastevaraston laiturilla (viljelijä maksaa rahdin). Yhtiöllä on oikeus markkinatilanteen vaatiessa korottaa hintoja haluamallaan tavalla.
            Takuuhinnan maksuehto on viljely- ja ostosopimuksen mukainen. Bonukset tarkistetaan satokauden jälkeen, yhtiö tekee niistä ostolaskut bonukseen oikeutetuille viljelijöille ja ne pyritään maksamaan satovuoden joulukuussa. Bonusta ei makseta, jos sopimus on tehty 31.5. jälkeen.
          </p>
        );
      case "304400/Mustaherukka":
      case "309300/Luomu mustahe":
        return (
          <p className="contract-price-text">
            Tarkistathan sopimusehdoista kohdasta Sopimuksen mukainen toimitusmäärä ja takuuhinta satokaudella muut hintaan vaikuttavat tekijät.
            Sopimusmäärän ylittävältä osalta mahdollinen lisämäärä, hinta ja maksuehto neuvotellaan aina erikseen.
            Kaikki hinnat ovat vähimmäishintoja ja ALV 0%. Toimitusehto on vapaasti yhtiön osoittaman pakastevaraston laiturilla (viljelijä maksaa rahdin). Yhtiöllä on oikeus markkinatilanteen vaatiessa korottaa hintoja haluamallaan tavalla.
            Takuuhinnan maksuehto on viljely- ja ostosopimuksen mukainen.
          </p>
        );
      default:
        return (
          <p className="contract-price-text">
            Sopimusmäärän ylittävältä osalta mahdollinen lisämäärä, hinta ja maksuehto neuvotellaan aina erikseen.
            Kaikki hinnat ovat vähimmäishintoja ja ALV 0%. Toimitusehto on vapaasti yhtiön osoittaman pakastevaraston laiturilla (viljelijä maksaa rahdin). Yhtiöllä on oikeus markkinatilanteen vaatiessa korottaa hintoja haluamallaan tavalla.
            Takuuhinnan maksuehto on viljely- ja ostosopimuksen mukainen.
          </p>
        );
    }
  }

  /**
   * Render price rows
   * 
   * @param prices prices
   */
  private renderActivePriceRows = (prices: Price[]) => {
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
  private renderPastPriceRows = (prices: Price[]) => {
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
  private renderPriceRow = (price: Price) => {
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
              Vähimmäislaatuvaatimukset täyttävästä tuoremarjasta yhtiö maksaa päivän hinnan.
            </List.Item>
            <List.Item>
              Yhtiö voi huomioida max. 0,20 eur Alv 0%/ kg -suuruisella bonuksella BONUS-laatuiset marjat.
            </List.Item>
            <List.Item>
              Tunneli-/ kasvihuonetuotannosta ostettavalle marjalle pyritään maksamaan korkeampi päivän hinta.
            </List.Item>
            <List.Item>
              Jos marjaerä ei täytä yhtiön vähimmäislaatuvaatimuksia neuvotellaan erän hinnasta aina erikseen viljelijän kanssa.
            </List.Item>
            <List.Item>
              Yhtiö voi myös maksaa kyseisellä viikolla toimittaneille viljelijöille lisäbonuksen hyvin onnistuneen sopimusyhteistyön johdosta.
            </List.Item>
          </List>
        </div>
      );
    }

    return (
      <div className="contract-section">
        <Divider horizontal>
          <Header as='h2'>
            Takuuhinnat
         </Header>
        </Divider>
        { this.renderPricesText(itemGroupDisplayName) }
        <p onClick={() => this.setState({ displayPastPrices: !this.state.displayPastPrices })}>
          {
            this.state.displayPastPrices ? "Piilota edellisvuosien hinnat" : "Näytä myös edellisvuosien hinnat"
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