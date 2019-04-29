import * as React from "react";

import 'semantic-ui-css/semantic.min.css';

import MenuContainer from "../generic/MenuContainer";

class TableBasicLayout extends React.Component {
  render() {
    return (
      <div>
        <MenuContainer />
        <div className="tablecontainer">
          {this.props.children}
        </div>
      </div>
    );
  }
}

export default TableBasicLayout;