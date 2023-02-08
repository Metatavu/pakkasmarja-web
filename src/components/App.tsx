import * as React from "react";
import MainPage from "./index/MainPage";
import { BrowserRouter } from "react-router-dom";

/**
 * App component
 */
class App extends React.Component {

  /**
   * Render method for app component
   */
  public render() {
    return (
      <div className="App">
        <BrowserRouter>
          <MainPage />
        </BrowserRouter>
      </div>
    );
  }
}

export default App;