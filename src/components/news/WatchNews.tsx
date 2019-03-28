import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import BasicLayout from "../generic/BasicLayout";
import Api, { NewsArticle } from "pakkasmarja-client";
import { Divider, Container, Header } from "semantic-ui-react";
import Moment from "react-moment";

/**
 * Interface for component props
 */
interface Props {
  keycloak?: Keycloak.KeycloakInstance;
  match?: any
}

/**
 * Interface for component state
 */
interface State {
  news?: NewsArticle,
  redirect: boolean
}

class WatchNews extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      news: undefined,
      redirect: false
    };
  }

  /**
   * Component did mount life-sycle event
   */
  async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    const newArticleService = await Api.getNewsArticlesService(this.props.keycloak.token);
    newArticleService.findNewsArticle(this.props.match.params.newsId).then((newsArticle) => {
      const newsArticleObject: NewsArticle = newsArticle;
      this.setState({ news: newsArticleObject });
    });
  }

  render() {
    if (this.state.news && this.state.news.createdAt) {
      return (
        
        <BasicLayout>
          <Header >
            <h2 style={{wordWrap: "break-word"}}>{this.state.news.title.toString()}</h2>
            <Header.Subheader><Moment format="DD.MM.YYYY HH:mm">{this.state.news.createdAt.toString()}</Moment></Header.Subheader>
          </Header>
          <Divider />
          <Container>
            <div dangerouslySetInnerHTML={{ __html: this.state.news.contents }} />
          </Container>
        </BasicLayout>
      );
    }
    return (
      <BasicLayout>

      </BasicLayout>
    );
  }
}

export function mapStateToProps(state: StoreState) {
  return {
    keycloak: state.keycloak
  }
}

export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(WatchNews);