import * as React from "react";
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import Api, { ProductPrice } from "pakkasmarja-client";
import * as moment from "moment";
import { LineChart, Line, XAxis, YAxis } from "recharts";
import { Loader, Icon } from "semantic-ui-react";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  showAxis?: boolean,
  productId: string,
  maxValues?: number,
  showLatestPrice?: boolean,
  showLatestPriceSimple?: boolean,
  width?: number,
  height?: number
}

/**
 * Interface for component state
 */
interface State {
  prices: ProductPrice[],
  loading: boolean
}

/**
 * Class for price chart component
 */
class PriceChart extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      prices: [],
      loading: false
    };
  }

  /**
   * Component did mount life-cycle event
   */
  public async componentDidMount() {
    const { keycloak, productId, maxValues } = this.props;
    if (!keycloak || !keycloak.token) {
      return;
    }

    this.setState({ loading: true });
    const maxResults = maxValues || 20;

    const productPrices = await Api.getProductPricesService(keycloak.token).listProductPrices(productId, "CREATED_AT_DESC", undefined, maxResults);
    this.setState({
      prices: productPrices,
      loading: false
    });
  }

  /**
   * Component did update life-cycle event
   */
  public async componentDidUpdate(prevProps: Props) {
    if(prevProps.productId !== this.props.productId){
      const { keycloak, productId, maxValues } = this.props;
      if (!keycloak || !keycloak.token) {
        return;
      }
  
      this.setState({ loading: true });
      const maxResults = maxValues || 20;
      const productPrices = await Api.getProductPricesService(keycloak.token).listProductPrices(productId, "CREATED_AT_DESC", undefined, maxResults);
      this.setState({
        prices: productPrices,
        loading: false
      });
      
    }
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.loading) {
      return <Loader active inline />;
    }

    const prices = this.state.prices;
    const latestPrice = this.state.prices.length > 0 ? this.state.prices[0] : undefined;
    const data = prices.reverse().map((productPrice) => {
      return {
        price: Number(productPrice.price),
        time: moment(productPrice.createdAt).valueOf()
      }
    });

    return (
      <div>
        <LineChart data={data} width={this.props.width || 300} height={this.props.height || 100}>
          {this.props.showAxis &&
            <YAxis />
          }
          {this.props.showAxis &&
            <XAxis />
          }
          <Line type="monotone" dataKey="price" stroke="#e51d2a" strokeWidth={2} />
        </LineChart>
        {this.props.showLatestPrice && latestPrice &&
          <p style={{ paddingTop: 10 }}><Icon name="info circle" size="large" color="red" />Tämän hetkinen hinta on {latestPrice.price} € / {latestPrice.unit.toUpperCase()} ALV 0% (päivitetty {moment(latestPrice.updatedAt).format("DD.MM.YYYY HH:mm")})</p>
        }
        {this.props.showLatestPriceSimple && latestPrice &&
          <p style={{ padding: 0, margin: 0, fontSize: 13 }}><strong>Hinta:</strong> {latestPrice.price} € / {latestPrice.unit.toUpperCase()} ALV 0%
          <br />
            <strong>Päivitetty:</strong> {moment(latestPrice.updatedAt).format("DD.MM.YYYY HH:mm")}</p>
        }
      </div>
    );
  }
}

/**
 * Redux mapper for mapping store state to component props
 * 
 * @param state store state
 */
function mapStateToProps(state: StoreState) {
  return {
    authenticated: state.authenticated,
    keycloak: state.keycloak
  }
}

/**
 * Redux mapper for mapping component dispatches 
 * 
 * @param dispatch dispatch method
 */
function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(PriceChart);